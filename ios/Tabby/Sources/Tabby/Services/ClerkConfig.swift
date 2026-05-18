import Foundation

// MARK: - Clerk configuration

/// Clerk publishable key and related settings for the native app.
///
/// Set `CLERK_PUBLISHABLE_KEY` in the Xcode scheme (Run → Arguments → Environment Variables)
/// or in your shell when invoking `xcodebuild`.
///
/// **Associated Domains:** update `TabbyApp/TabbyApp.entitlements` with the **Frontend API host**
/// from Clerk Dashboard → Native applications (same instance as this key). The host looks like
/// `your-subdomain.clerk.accounts.dev` — use it in `webcredentials:your-subdomain.clerk.accounts.dev`.
public enum ClerkConfig {

    /// Publishable key (`pk_test_...` / `pk_live_...`) from Clerk Dashboard → API keys.
    ///
    /// When unset, returns an **empty** string so `Clerk.configure` uses the SDK’s
    /// “temporary container” path (no invalid placeholder key — the Clerk SDK validates
    /// the base64 segment after `pk_test_` / `pk_live_`).
    public static var publishableKey: String {
        guard let raw = ProcessInfo.processInfo.environment["CLERK_PUBLISHABLE_KEY"] else {
            return ""
        }
        let key = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        return key
    }

    /// Whether a non-empty publishable key was provided (real Clerk instance).
    public static var hasPublishableKey: Bool {
        !publishableKey.isEmpty
    }
}
