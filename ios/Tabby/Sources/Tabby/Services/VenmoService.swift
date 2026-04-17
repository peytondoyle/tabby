import Foundation
#if canImport(UIKit)
import UIKit
#endif

/// Service for integrating with Venmo payment app
/// Provides methods to create payment request URLs and check Venmo availability
struct VenmoService {

    // MARK: - Constants

    /// Venmo URL scheme
    private static let venmoScheme = "venmo"

    /// Venmo App Store URL
    private static let venmoAppStoreURL = URL(string: "https://apps.apple.com/app/venmo/id351727428")!

    // MARK: - Payment Request

    /// Creates a Venmo payment request URL
    /// - Parameters:
    ///   - handle: The Venmo username or phone number of the recipient
    ///   - amount: The payment amount
    ///   - note: A note describing the payment (e.g., "Dinner at Joe's - your share")
    /// - Returns: A Venmo deep link URL, or `nil` if URL construction fails
    static func requestPayment(
        to handle: String,
        amount: Decimal,
        note: String
    ) -> URL? {
        // Build the Venmo payment URL
        // Format: venmo://paycharge?txn=pay&recipients={handle}&amount={amount}&note={note}
        var components = URLComponents()
        components.scheme = venmoScheme
        components.host = "paycharge"

        // Format amount as string with 2 decimal places
        let amountString = NSDecimalNumber(decimal: amount).stringValue

        components.queryItems = [
            URLQueryItem(name: "txn", value: "pay"),
            URLQueryItem(name: "recipients", value: handle),
            URLQueryItem(name: "amount", value: amountString),
            URLQueryItem(name: "note", value: note)
        ]

        return components.url
    }

    /// Creates a Venmo charge request URL (request money from someone)
    /// - Parameters:
    ///   - handle: The Venmo username or phone number of the person to charge
    ///   - amount: The amount to request
    ///   - note: A note describing the charge request
    /// - Returns: A Venmo deep link URL, or `nil` if URL construction fails
    static func requestCharge(
        from handle: String,
        amount: Decimal,
        note: String
    ) -> URL? {
        var components = URLComponents()
        components.scheme = venmoScheme
        components.host = "paycharge"

        let amountString = NSDecimalNumber(decimal: amount).stringValue

        components.queryItems = [
            URLQueryItem(name: "txn", value: "charge"),
            URLQueryItem(name: "recipients", value: handle),
            URLQueryItem(name: "amount", value: amountString),
            URLQueryItem(name: "note", value: note)
        ]

        return components.url
    }

    // MARK: - Venmo Availability

    /// Checks if Venmo is installed on the device
    /// - Note: Requires `venmo` in LSApplicationQueriesSchemes in Info.plist
    static var isVenmoInstalled: Bool {
        #if canImport(UIKit) && !os(watchOS)
        guard let venmoURL = URL(string: "venmo://") else {
            return false
        }
        return UIApplication.shared.canOpenURL(venmoURL)
        #else
        return false
        #endif
    }

    /// Returns the App Store URL for Venmo
    static var appStoreURL: URL {
        venmoAppStoreURL
    }

    // MARK: - Open Venmo

    /// Opens Venmo with a payment request, or opens the App Store if Venmo is not installed
    /// - Parameters:
    ///   - handle: The Venmo username or phone number
    ///   - amount: The payment amount
    ///   - note: A note for the payment
    ///   - completion: Called with `true` if Venmo was opened, `false` if App Store was opened
    @MainActor
    static func openPaymentRequest(
        to handle: String,
        amount: Decimal,
        note: String,
        completion: ((Bool) -> Void)? = nil
    ) {
        #if canImport(UIKit) && !os(watchOS)
        if isVenmoInstalled, let venmoURL = requestPayment(to: handle, amount: amount, note: note) {
            UIApplication.shared.open(venmoURL) { success in
                completion?(success)
            }
        } else {
            // Venmo not installed - open App Store
            UIApplication.shared.open(appStoreURL) { _ in
                completion?(false)
            }
        }
        #else
        completion?(false)
        #endif
    }

    /// Opens Venmo with a charge request, or opens the App Store if Venmo is not installed
    /// - Parameters:
    ///   - handle: The Venmo username or phone number
    ///   - amount: The amount to request
    ///   - note: A note for the charge
    ///   - completion: Called with `true` if Venmo was opened, `false` if App Store was opened
    @MainActor
    static func openChargeRequest(
        from handle: String,
        amount: Decimal,
        note: String,
        completion: ((Bool) -> Void)? = nil
    ) {
        #if canImport(UIKit) && !os(watchOS)
        if isVenmoInstalled, let venmoURL = requestCharge(from: handle, amount: amount, note: note) {
            UIApplication.shared.open(venmoURL) { success in
                completion?(success)
            }
        } else {
            // Venmo not installed - open App Store
            UIApplication.shared.open(appStoreURL) { _ in
                completion?(false)
            }
        }
        #else
        completion?(false)
        #endif
    }
}
