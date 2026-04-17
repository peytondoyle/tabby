import Foundation

/// Handles deep links and universal links for the Tabby app
/// Supports both custom scheme (tabby://) and universal links (https://tabby.vercel.app)
@Observable
final class DeepLinkHandler {

    // MARK: - Properties

    /// Pending bill token from a deep link, ready for navigation
    var pendingBillToken: String?

    /// The host for universal links
    private static let universalLinkHost = "tabby.vercel.app"

    /// The custom URL scheme
    private static let customScheme = "tabby"

    // MARK: - Public Methods

    /// Handles an incoming URL and extracts relevant navigation data
    /// - Parameter url: The URL to handle
    /// - Returns: `true` if the URL was successfully handled, `false` otherwise
    @discardableResult
    func handle(url: URL) -> Bool {
        // Try to extract bill token from the URL
        if let token = extractBillToken(from: url) {
            pendingBillToken = token
            return true
        }

        return false
    }

    /// Clears the pending bill token after navigation has been handled
    func clearPendingToken() {
        pendingBillToken = nil
    }

    // MARK: - Private Methods

    /// Extracts a bill token from various URL formats
    /// - Parameter url: The URL to parse
    /// - Returns: The extracted token, or `nil` if not found
    private func extractBillToken(from url: URL) -> String? {
        // Handle custom scheme: tabby://split/{token}
        if url.scheme == Self.customScheme {
            return extractTokenFromPath(url.host == "split" ? url.path : "/\(url.host ?? "")\(url.path)")
        }

        // Handle universal link: https://tabby.vercel.app/split/{token}
        if url.scheme == "https" && url.host == Self.universalLinkHost {
            return extractTokenFromPath(url.path)
        }

        return nil
    }

    /// Extracts a token from a URL path matching /split/{token}
    /// - Parameter path: The URL path to parse
    /// - Returns: The extracted token, or `nil` if not found
    private func extractTokenFromPath(_ path: String) -> String? {
        let components = path.split(separator: "/").map(String.init)

        // Look for /split/{token} pattern
        guard components.count >= 2,
              components[0] == "split",
              !components[1].isEmpty else {
            return nil
        }

        return components[1]
    }
}

// MARK: - URL Construction

extension DeepLinkHandler {

    /// Creates a deep link URL for sharing a bill
    /// - Parameters:
    ///   - token: The bill's share token
    ///   - useUniversalLink: If `true`, returns a universal link; otherwise returns a custom scheme URL
    /// - Returns: The constructed URL, or `nil` if construction fails
    static func createShareURL(token: String, useUniversalLink: Bool = true) -> URL? {
        if useUniversalLink {
            return URL(string: "https://\(universalLinkHost)/split/\(token)")
        } else {
            return URL(string: "\(customScheme)://split/\(token)")
        }
    }
}
