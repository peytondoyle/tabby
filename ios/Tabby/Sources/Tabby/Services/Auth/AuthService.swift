import Foundation
import ClerkKit

// MARK: - AuthService

/// Bridges Clerk authentication to Tabby (API tokens and simple account state).
@Observable
@MainActor
public final class AuthService {

    // MARK: - Singleton

    public static let shared = AuthService()

    // MARK: - Published

    /// Whether an authentication operation is in progress (reserved for future flows).
    public private(set) var isLoading: Bool = false

    /// The most recent authentication error message, if any.
    public private(set) var errorMessage: String?

    /// Whether a Clerk user session is active.
    public var isAuthenticated: Bool {
        Clerk.shared.user != nil
    }

    /// Clerk user id for server-backed receipts (nil when signed out or before load).
    public var currentUserId: String? {
        Clerk.shared.user?.id
    }

    private init() {}

    // MARK: - Session

    /// Called after Clerk finishes loading client/environment; refreshes derived UI state.
    public func syncFromClerk() {
        errorMessage = nil
    }

    /// Clerk session JWT for `Authorization: Bearer` API requests.
    public func getAccessToken() async -> String? {
        guard let session = Clerk.shared.session else { return nil }
        do {
            return try await session.getToken()
        } catch {
            return nil
        }
    }

    // MARK: - Sign out / delete

    public func signOut() async throws {
        try await Clerk.shared.auth.signOut()
    }

    public func deleteAccount() async throws {
        guard let user = Clerk.shared.user else { return }
        try await user.delete()
    }
}
