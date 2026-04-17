import SwiftUI

/// User preferences stored using @AppStorage for persistence across app launches.
/// Uses @Observable macro for reactive state management with iOS 17+.
@Observable
final class UserPreferences {

    // MARK: - Profile Settings

    /// User's display name
    @ObservationIgnored
    @AppStorage("userName") var userName: String = ""

    /// User's Venmo handle (without @ prefix)
    @ObservationIgnored
    @AppStorage("venmoHandle") var venmoHandle: String = ""

    // MARK: - Bill Defaults

    /// Default tip percentage (0-100)
    @ObservationIgnored
    @AppStorage("defaultTipPercent") var defaultTipPercent: Int = 18

    /// How tax is distributed among people
    /// - "proportional": Tax is split based on each person's item subtotal
    /// - "even": Tax is split evenly among all people
    @ObservationIgnored
    @AppStorage("taxDistribution") var taxDistribution: String = "proportional"

    /// How tip is distributed among people
    /// - "proportional": Tip is split based on each person's item subtotal
    /// - "even": Tip is split evenly among all people
    @ObservationIgnored
    @AppStorage("tipDistribution") var tipDistribution: String = "proportional"

    // MARK: - App Settings

    /// Whether haptic feedback is enabled
    @ObservationIgnored
    @AppStorage("hapticFeedback") var hapticFeedback: Bool = true

    // MARK: - Singleton

    /// Shared instance for app-wide access
    static let shared = UserPreferences()

    private init() {}

    // MARK: - Computed Properties

    /// Tax distribution mode as an enum
    var taxDistributionMode: DistributionMode {
        get { DistributionMode(rawValue: taxDistribution) ?? .proportional }
        set { taxDistribution = newValue.rawValue }
    }

    /// Tip distribution mode as an enum
    var tipDistributionMode: DistributionMode {
        get { DistributionMode(rawValue: tipDistribution) ?? .proportional }
        set { tipDistribution = newValue.rawValue }
    }

    /// Venmo handle with @ prefix for display
    var formattedVenmoHandle: String {
        guard !venmoHandle.isEmpty else { return "" }
        return venmoHandle.hasPrefix("@") ? venmoHandle : "@\(venmoHandle)"
    }
}

// MARK: - Distribution Mode

/// Enum representing how shared costs (tax, tip) are distributed
enum DistributionMode: String, CaseIterable, Identifiable {
    case proportional
    case even

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .proportional:
            return "Proportional"
        case .even:
            return "Even"
        }
    }

    var description: String {
        switch self {
        case .proportional:
            return "Based on item subtotals"
        case .even:
            return "Split equally"
        }
    }
}

// MARK: - Tip Percentages

/// Standard tip percentages offered in the app
enum TipPercentage: Int, CaseIterable, Identifiable {
    case zero = 0
    case fifteen = 15
    case eighteen = 18
    case twenty = 20
    case twentyTwo = 22
    case twentyFive = 25
    case custom = -1

    var id: Int { rawValue }

    var displayName: String {
        switch self {
        case .zero:
            return "0%"
        case .fifteen:
            return "15%"
        case .eighteen:
            return "18%"
        case .twenty:
            return "20%"
        case .twentyTwo:
            return "22%"
        case .twentyFive:
            return "25%"
        case .custom:
            return "Custom"
        }
    }

    /// Checks if a given percentage matches a standard value
    static func from(percent: Int) -> TipPercentage {
        return TipPercentage(rawValue: percent) ?? .custom
    }

    /// All standard (non-custom) tip percentages
    static var standardOptions: [TipPercentage] {
        allCases.filter { $0 != .custom }
    }
}
