import SwiftUI
import AuthenticationServices

// MARK: - AuthView

/// Authentication view for user sign-in
///
/// Provides a clean onboarding interface with options to:
/// - Continue as a guest (anonymous authentication)
/// - Sign in with Apple
///
/// Shows loading state during authentication operations.
///
/// Usage:
/// ```swift
/// AuthView()
///     .onAuthenticated {
///         // Navigate to main app
///     }
/// ```
struct AuthView: View {
    @State private var authService = AuthService.shared
    @State private var showError: Bool = false

    /// Callback when authentication succeeds
    var onAuthenticated: (() -> Void)?

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color.accentColor.opacity(0.1),
                    Color.accentColor.opacity(0.05),
                    backgroundColor
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // App branding
                brandingSection

                Spacer()

                // Sign in buttons
                signInSection

                // Footer
                footerSection
            }
            .padding(.horizontal, 24)
        }
        .loading(authService.isLoading, statusText: "Signing in...")
        .alert("Authentication Error", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(authService.errorMessage ?? "An unknown error occurred")
        }
        .onChange(of: authService.isAuthenticated) { _, isAuthenticated in
            if isAuthenticated {
                onAuthenticated?()
            }
        }
        .onChange(of: authService.errorMessage) { _, errorMessage in
            showError = errorMessage != nil
        }
    }

    // MARK: - Platform Colors

    private var backgroundColor: Color {
        #if os(iOS)
        Color(.systemBackground)
        #else
        Color(nsColor: .windowBackgroundColor)
        #endif
    }

    private var secondaryBackgroundColor: Color {
        #if os(iOS)
        Color(.secondarySystemBackground)
        #else
        Color(nsColor: .controlBackgroundColor)
        #endif
    }

    // MARK: - Branding Section

    private var brandingSection: some View {
        VStack(spacing: 16) {
            // App icon
            Image(systemName: "dollarsign.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(Color.accentColor)
                .shadow(color: .accentColor.opacity(0.3), radius: 10, y: 5)

            // App name
            Text("Tabby")
                .font(.system(size: 42, weight: .bold, design: .rounded))

            // Tagline
            Text("Split bills with ease")
                .font(.title3)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Sign In Section

    private var signInSection: some View {
        VStack(spacing: 16) {
            // Sign in with Apple button
            SignInWithAppleButton(.signIn) { request in
                request.requestedScopes = [.fullName, .email]
            } onCompletion: { _ in
                // Handled by our auth service
            }
            .signInWithAppleButtonStyle(.black)
            .frame(height: 50)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay {
                // Custom tap handler
                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture {
                        signInWithApple()
                    }
            }

            // Divider
            HStack {
                Rectangle()
                    .fill(Color.secondary.opacity(0.3))
                    .frame(height: 1)

                Text("or")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 16)

                Rectangle()
                    .fill(Color.secondary.opacity(0.3))
                    .frame(height: 1)
            }
            .padding(.vertical, 8)

            // Continue as guest button
            Button(action: signInAsGuest) {
                HStack {
                    Image(systemName: "person.fill.questionmark")
                    Text("Continue as Guest")
                }
                .font(.headline)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(secondaryBackgroundColor)
                .foregroundStyle(.primary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)
        }
        .padding(.bottom, 32)
    }

    // MARK: - Footer Section

    private var footerSection: some View {
        VStack(spacing: 8) {
            Text("By continuing, you agree to our")
                .font(.caption)
                .foregroundStyle(.secondary)

            HStack(spacing: 4) {
                Button("Terms of Service") {
                    // Open terms
                }
                .font(.caption)

                Text("and")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Button("Privacy Policy") {
                    // Open privacy policy
                }
                .font(.caption)
            }
        }
        .padding(.bottom, 24)
    }

    // MARK: - Actions

    private func signInWithApple() {
        Task {
            do {
                try await authService.signInWithApple()
            } catch {
                // Error is handled by the service and shown via alert
            }
        }
    }

    private func signInAsGuest() {
        Task {
            do {
                try await authService.signInAnonymously()
            } catch {
                // Error is handled by the service and shown via alert
            }
        }
    }
}

// MARK: - View Extension

extension AuthView {
    /// Set a callback for when authentication succeeds
    func onAuthenticated(_ action: @escaping () -> Void) -> AuthView {
        var view = self
        view.onAuthenticated = action
        return view
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Auth View") {
    AuthView()
}

#Preview("Auth View - Dark") {
    AuthView()
        .preferredColorScheme(.dark)
}
#endif
