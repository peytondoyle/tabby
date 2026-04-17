import Foundation
import AuthenticationServices
import Supabase

// MARK: - AuthService

/// Singleton service for managing Supabase authentication
///
/// Provides authentication functionality including:
/// - Anonymous sign-in for guest users
/// - Sign in with Apple
/// - Session management and restoration
///
/// Usage:
/// ```swift
/// let auth = AuthService.shared
///
/// // Check if user is authenticated
/// if auth.isAuthenticated {
///     print("User: \(auth.currentUser?.id)")
/// }
///
/// // Sign in anonymously
/// try await auth.signInAnonymously()
///
/// // Sign out
/// try await auth.signOut()
/// ```
@Observable
public final class AuthService {

    // MARK: - Singleton

    /// Shared instance of the auth service
    public static let shared = AuthService()

    // MARK: - Published Properties

    /// The currently authenticated user, if any
    public private(set) var currentUser: User?

    /// Whether a user is currently authenticated
    public var isAuthenticated: Bool {
        currentUser != nil
    }

    /// Whether an authentication operation is in progress
    public private(set) var isLoading: Bool = false

    /// The most recent authentication error message, if any
    public private(set) var errorMessage: String?

    // MARK: - Private Properties

    /// The Supabase client for authentication
    private var auth: AuthClient {
        SupabaseConfig.shared.auth
    }

    /// Task handle for auth state listener
    private var authStateTask: Task<Void, Never>?

    // MARK: - Initialization

    private init() {
        // Start listening for auth state changes
        startAuthStateListener()
    }

    deinit {
        authStateTask?.cancel()
    }

    // MARK: - Auth State Listener

    /// Listen for authentication state changes
    private func startAuthStateListener() {
        authStateTask = Task { [weak self] in
            guard let self = self else { return }

            for await (event, session) in self.auth.authStateChanges {
                await MainActor.run {
                    switch event {
                    case .initialSession, .signedIn:
                        self.currentUser = session?.user
                    case .signedOut:
                        self.currentUser = nil
                    case .tokenRefreshed:
                        self.currentUser = session?.user
                    case .userUpdated:
                        self.currentUser = session?.user
                    case .userDeleted:
                        self.currentUser = nil
                    case .passwordRecovery, .mfaChallengeVerified:
                        break
                    }
                    self.errorMessage = nil
                }
            }
        }
    }

    // MARK: - Public Methods

    /// Check and restore an existing session on app launch
    ///
    /// Call this method when the app starts to restore any existing session.
    /// If a valid session exists, the user will be automatically signed in.
    ///
    /// - Throws: Error if session restoration fails
    @MainActor
    public func checkSession() async throws {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        do {
            let session = try await auth.session
            currentUser = session.user
        } catch let authError as AuthError {
            // No session exists - this is expected for new users
            if case .sessionMissing = authError {
                currentUser = nil
                return
            }
            self.errorMessage = authError.localizedDescription
            throw authError
        } catch {
            self.errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Sign in anonymously as a guest user
    ///
    /// Creates an anonymous user account that can later be linked to a
    /// permanent account (e.g., via Apple Sign In).
    ///
    /// - Throws: Error if sign-in fails
    @MainActor
    public func signInAnonymously() async throws {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        do {
            let session = try await auth.signInAnonymously()
            currentUser = session.user
        } catch {
            self.errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Sign in with Apple
    ///
    /// Presents the Apple Sign In flow and authenticates with Supabase.
    /// If the user is currently signed in anonymously, their account will
    /// be linked to the Apple identity.
    ///
    /// - Throws: Error if sign-in fails or is cancelled
    @MainActor
    public func signInWithApple() async throws {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        do {
            // Get Apple credential
            let credential = try await getAppleCredential()

            guard let identityToken = credential.identityToken,
                  let tokenString = String(data: identityToken, encoding: .utf8) else {
                let message = "Failed to get identity token from Apple"
                self.errorMessage = message
                throw AuthServiceError.appleSignInFailed(message)
            }

            // Sign in with Supabase using the Apple token
            let session = try await auth.signInWithIdToken(
                credentials: .init(
                    provider: .apple,
                    idToken: tokenString
                )
            )

            currentUser = session.user
        } catch let asError as ASAuthorizationError {
            // Handle Apple Sign In specific errors
            let message: String
            switch asError.code {
            case .canceled:
                message = "Sign in was cancelled"
            case .failed:
                message = "Sign in failed"
            case .invalidResponse:
                message = "Invalid response from Apple"
            case .notHandled:
                message = "Sign in not handled"
            case .notInteractive:
                message = "Sign in requires interaction"
            case .unknown:
                message = "Unknown Apple Sign In error"
            case .matchedExcludedCredential:
                message = "Credential was excluded"
            default:
                message = asError.localizedDescription
            }
            self.errorMessage = message
            throw AuthServiceError.appleSignInFailed(message)
        } catch let serviceError as AuthServiceError {
            // Already handled
            throw serviceError
        } catch {
            self.errorMessage = error.localizedDescription
            throw error
        }
    }

    /// Sign out the current user
    ///
    /// Clears the local session and signs out from Supabase.
    ///
    /// - Throws: Error if sign-out fails
    @MainActor
    public func signOut() async throws {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        do {
            try await auth.signOut()
            currentUser = nil
        } catch {
            self.errorMessage = error.localizedDescription
            throw error
        }
    }

    // MARK: - Token Access

    /// Get the current access token for API requests
    ///
    /// - Returns: The current access token, or nil if not authenticated
    public func getAccessToken() async -> String? {
        do {
            let session = try await auth.session
            return session.accessToken
        } catch {
            return nil
        }
    }

    // MARK: - Private Methods

    /// Present Apple Sign In and get the credential
    @MainActor
    private func getAppleCredential() async throws -> ASAuthorizationAppleIDCredential {
        try await withCheckedThrowingContinuation { continuation in
            let appleIDProvider = ASAuthorizationAppleIDProvider()
            let request = appleIDProvider.createRequest()
            request.requestedScopes = [.fullName, .email]

            let authorizationController = ASAuthorizationController(authorizationRequests: [request])

            let delegate = AppleSignInDelegate { result in
                continuation.resume(with: result)
            }

            // Store delegate to keep it alive
            objc_setAssociatedObject(
                authorizationController,
                "delegate",
                delegate,
                .OBJC_ASSOCIATION_RETAIN
            )

            authorizationController.delegate = delegate
            authorizationController.performRequests()
        }
    }
}

// MARK: - AuthServiceError

/// Errors specific to the AuthService
public enum AuthServiceError: LocalizedError {
    case appleSignInFailed(String)
    case tokenError(String)

    public var errorDescription: String? {
        switch self {
        case .appleSignInFailed(let message):
            return "Apple Sign In failed: \(message)"
        case .tokenError(let message):
            return "Token error: \(message)"
        }
    }
}

// MARK: - Apple Sign In Delegate

/// Helper class to handle Apple Sign In delegate callbacks
private final class AppleSignInDelegate: NSObject, ASAuthorizationControllerDelegate {
    private let completion: (Result<ASAuthorizationAppleIDCredential, Error>) -> Void

    init(completion: @escaping (Result<ASAuthorizationAppleIDCredential, Error>) -> Void) {
        self.completion = completion
        super.init()
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            completion(.failure(AuthServiceError.appleSignInFailed("Invalid credential type")))
            return
        }
        completion(.success(credential))
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        completion(.failure(error))
    }
}
