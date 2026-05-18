import Foundation

/// Handles deep links and universal links for the Tabby app
/// Supports `tabby://` and `https://tabby.vercel.app` with `/receipt/`, `/bill/`, and legacy `/split/` paths.
@Observable
final class DeepLinkHandler {

    var pendingBillToken: String?

    private static let universalLinkHost = "tabby.vercel.app"
    private static let customScheme = "tabby"

    @discardableResult
    func handle(url: URL) -> Bool {
        if let token = Self.extractBillToken(from: url) {
            pendingBillToken = token
            return true
        }
        return false
    }

    func clearPendingToken() {
        pendingBillToken = nil
    }

    static func extractBillToken(from url: URL) -> String? {
        if url.scheme == customScheme {
            let path: String
            if url.host == "split" || url.host == "receipt" || url.host == "bill" {
                path = url.path
            } else {
                path = "/\(url.host ?? "")\(url.path)"
            }
            return extractTokenFromPath(path)
        }

        if url.scheme == "https" || url.scheme == "http" {
            guard url.host == universalLinkHost else { return nil }
            return extractTokenFromPath(url.path)
        }

        return nil
    }

    /// Paths: `/receipt/{token}`, `/receipt/{token}/edit`, `/bill/{token}`, `/split/{token}`
    private static func extractTokenFromPath(_ path: String) -> String? {
        let components = path.split(separator: "/").map(String.init).filter { !$0.isEmpty }
        guard components.count >= 2 else { return nil }
        switch components[0] {
        case "receipt", "bill", "split":
            let token = components[1]
            return token.isEmpty ? nil : token
        default:
            return nil
        }
    }

    static func createShareURL(token: String, useUniversalLink: Bool = true) -> URL? {
        if useUniversalLink {
            return URL(string: "https://\(universalLinkHost)/receipt/\(token)")
        }
        return URL(string: "\(customScheme)://receipt/\(token)")
    }
}
