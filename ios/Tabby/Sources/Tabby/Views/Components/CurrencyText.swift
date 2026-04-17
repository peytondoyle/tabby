import SwiftUI

// MARK: - Currency Style

/// Style options for displaying currency values
enum CurrencyStyle {
    case large      // Title-sized, bold (e.g., totals)
    case medium     // Body-sized (e.g., item prices)
    case small      // Caption-sized (e.g., subtotals)

    var font: Font {
        switch self {
        case .large:
            return .title.bold()
        case .medium:
            return .body
        case .small:
            return .caption
        }
    }
}

/// Color treatment for currency values
enum CurrencyColorType {
    case standard   // Default text color
    case discount   // Green (money saved)
    case fee        // Red (additional charge)
    case muted      // Secondary text color

    func color(for colorScheme: ColorScheme) -> Color {
        switch self {
        case .standard:
            return .primary
        case .discount:
            return .green
        case .fee:
            return .red
        case .muted:
            return .secondary
        }
    }
}

// MARK: - CurrencyText View

/// A view that formats and displays a Decimal as currency
///
/// Features:
/// - Locale-aware currency formatting
/// - Multiple size styles (large, medium, small)
/// - Color coding for discounts (green) and fees (red)
/// - Optional prefix text (e.g., "-" for discounts)
///
/// Usage:
/// ```swift
/// CurrencyText(12.99)
/// CurrencyText(5.00, style: .large, colorType: .discount, prefix: "-")
/// ```
struct CurrencyText: View {
    let amount: Decimal
    let style: CurrencyStyle
    let colorType: CurrencyColorType
    let prefix: String
    let showPositiveSign: Bool

    @Environment(\.colorScheme) private var colorScheme

    /// Creates a currency text view
    /// - Parameters:
    ///   - amount: The decimal amount to display
    ///   - style: The text size style (default: .medium)
    ///   - colorType: The color treatment (default: .standard)
    ///   - prefix: Optional prefix text (default: empty)
    ///   - showPositiveSign: Whether to show "+" for positive amounts (default: false)
    init(
        _ amount: Decimal,
        style: CurrencyStyle = .medium,
        colorType: CurrencyColorType = .standard,
        prefix: String = "",
        showPositiveSign: Bool = false
    ) {
        self.amount = amount
        self.style = style
        self.colorType = colorType
        self.prefix = prefix
        self.showPositiveSign = showPositiveSign
    }

    var body: some View {
        Text(formattedAmount)
            .font(style.font)
            .foregroundStyle(colorType.color(for: colorScheme))
    }

    private var formattedAmount: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale.current
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2

        let number = NSDecimalNumber(decimal: amount)
        let formatted = formatter.string(from: number) ?? "$0.00"

        var result = prefix + formatted

        if showPositiveSign && amount > 0 {
            result = "+" + result
        }

        return result
    }
}

// MARK: - Convenience Initializers

extension CurrencyText {
    /// Creates a currency text styled as a discount (green, with minus prefix)
    static func discount(_ amount: Decimal, style: CurrencyStyle = .medium) -> CurrencyText {
        CurrencyText(amount, style: style, colorType: .discount, prefix: "-")
    }

    /// Creates a currency text styled as a fee (red)
    static func fee(_ amount: Decimal, style: CurrencyStyle = .medium) -> CurrencyText {
        CurrencyText(amount, style: style, colorType: .fee)
    }

    /// Creates a currency text with muted styling
    static func muted(_ amount: Decimal, style: CurrencyStyle = .medium) -> CurrencyText {
        CurrencyText(amount, style: style, colorType: .muted)
    }
}

// MARK: - View Modifier for Currency Formatting

/// A view modifier that applies currency styling to any Text view
struct CurrencyModifier: ViewModifier {
    let style: CurrencyStyle
    let colorType: CurrencyColorType

    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        content
            .font(style.font)
            .foregroundStyle(colorType.color(for: colorScheme))
    }
}

extension View {
    /// Applies currency styling to a view
    func currencyStyle(_ style: CurrencyStyle = .medium, colorType: CurrencyColorType = .standard) -> some View {
        modifier(CurrencyModifier(style: style, colorType: colorType))
    }
}

// MARK: - Decimal Extension for Formatting

extension Decimal {
    /// Formats the decimal as a currency string
    var asCurrency: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale.current
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2

        let number = NSDecimalNumber(decimal: self)
        return formatter.string(from: number) ?? "$0.00"
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Currency Styles") {
    VStack(alignment: .leading, spacing: 16) {
        Group {
            Text("Large Style")
                .font(.headline)
            CurrencyText(125.99, style: .large)

            Text("Medium Style (Default)")
                .font(.headline)
            CurrencyText(45.50)

            Text("Small Style")
                .font(.headline)
            CurrencyText(12.99, style: .small)
        }

        Divider()

        Group {
            Text("Color Types")
                .font(.headline)

            HStack(spacing: 20) {
                VStack {
                    Text("Standard")
                        .font(.caption)
                    CurrencyText(10.00)
                }

                VStack {
                    Text("Discount")
                        .font(.caption)
                    CurrencyText.discount(5.00)
                }

                VStack {
                    Text("Fee")
                        .font(.caption)
                    CurrencyText.fee(2.50)
                }

                VStack {
                    Text("Muted")
                        .font(.caption)
                    CurrencyText.muted(8.00)
                }
            }
        }
    }
    .padding()
}
#endif
