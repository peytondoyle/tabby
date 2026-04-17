import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

// MARK: - TotalsCard Display Mode

/// Display mode for the totals card
enum TotalsCardMode {
    case compact    // Minimal display for headers (just subtotal + total)
    case standard   // Shows main totals (subtotal, tax, tip, total)
    case full       // Shows everything including discount and service fee
}

// MARK: - TotalsCard View

/// A card component for displaying bill totals breakdown
///
/// Features:
/// - Subtotal, tax, tip, discount, service fee, and grand total
/// - Compact mode for inline/header display
/// - Full mode for summary pages
/// - Color-coded amounts (discounts green, fees red)
///
/// Usage:
/// ```swift
/// TotalsCard(
///     subtotal: 100.00,
///     tax: 8.00,
///     tip: 15.00,
///     discount: 10.00,
///     serviceFee: 5.00,
///     total: 118.00,
///     mode: .full
/// )
/// ```
struct TotalsCard: View {
    let subtotal: Decimal
    let tax: Decimal
    let tip: Decimal
    let discount: Decimal
    let serviceFee: Decimal
    let total: Decimal
    let mode: TotalsCardMode

    /// Creates a totals card
    /// - Parameters:
    ///   - subtotal: Sum of all items
    ///   - tax: Tax amount
    ///   - tip: Tip amount
    ///   - discount: Discount amount (displayed as negative/green)
    ///   - serviceFee: Service fee amount
    ///   - total: Grand total
    ///   - mode: Display mode (default: .standard)
    init(
        subtotal: Decimal,
        tax: Decimal = 0,
        tip: Decimal = 0,
        discount: Decimal = 0,
        serviceFee: Decimal = 0,
        total: Decimal,
        mode: TotalsCardMode = .standard
    ) {
        self.subtotal = subtotal
        self.tax = tax
        self.tip = tip
        self.discount = discount
        self.serviceFee = serviceFee
        self.total = total
        self.mode = mode
    }

    var body: some View {
        Group {
            switch mode {
            case .compact:
                compactView
            case .standard:
                standardView
            case .full:
                fullView
            }
        }
        .padding()
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }

    // MARK: - Compact View

    private var compactView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Subtotal")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                CurrencyText(subtotal, style: .small)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text("Total")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                CurrencyText(total, style: .medium)
                    .fontWeight(.semibold)
            }
        }
    }

    // MARK: - Standard View

    private var standardView: some View {
        VStack(spacing: 8) {
            TotalLineItem(label: "Subtotal", amount: subtotal)

            if tax > 0 {
                TotalLineItem(label: "Tax", amount: tax)
            }

            if tip > 0 {
                TotalLineItem(label: "Tip", amount: tip)
            }

            Divider()

            TotalLineItem(
                label: "Total",
                amount: total,
                isTotal: true
            )
        }
    }

    // MARK: - Full View

    private var fullView: some View {
        VStack(spacing: 8) {
            TotalLineItem(label: "Subtotal", amount: subtotal)

            if discount > 0 {
                TotalLineItem(
                    label: "Discount",
                    amount: discount,
                    isDiscount: true
                )
            }

            if serviceFee > 0 {
                TotalLineItem(
                    label: "Service Fee",
                    amount: serviceFee,
                    isFee: true
                )
            }

            if tax > 0 {
                TotalLineItem(label: "Tax", amount: tax)
            }

            if tip > 0 {
                TotalLineItem(label: "Tip", amount: tip)
            }

            Divider()
                .padding(.vertical, 4)

            TotalLineItem(
                label: "Grand Total",
                amount: total,
                isTotal: true
            )
        }
    }
}

// MARK: - Total Line Item

/// A single line item in the totals breakdown
private struct TotalLineItem: View {
    let label: String
    let amount: Decimal
    var isTotal: Bool = false
    var isDiscount: Bool = false
    var isFee: Bool = false

    var body: some View {
        HStack {
            Text(label)
                .font(isTotal ? .headline : .subheadline)
                .foregroundStyle(isTotal ? .primary : .secondary)

            Spacer()

            if isDiscount {
                CurrencyText.discount(amount, style: isTotal ? .large : .medium)
            } else if isFee {
                CurrencyText.fee(amount, style: isTotal ? .large : .medium)
            } else {
                CurrencyText(
                    amount,
                    style: isTotal ? .large : .medium,
                    colorType: isTotal ? .standard : .muted
                )
            }
        }
    }
}

// MARK: - TotalsCard from BillTotals

extension TotalsCard {
    /// Creates a TotalsCard from a BillTotals model
    /// - Parameters:
    ///   - billTotals: The BillTotals from the calculator
    ///   - mode: Display mode (default: .standard)
    init(billTotals: BillTotals, mode: TotalsCardMode = .standard) {
        self.subtotal = billTotals.subtotal
        self.tax = billTotals.tax
        self.tip = billTotals.tip
        self.discount = billTotals.discount
        self.serviceFee = billTotals.serviceFee
        self.total = billTotals.grandTotal
        self.mode = mode
    }

    /// Creates a TotalsCard from a Bill model
    /// - Parameters:
    ///   - bill: The Bill model
    ///   - mode: Display mode (default: .standard)
    init(bill: Bill, mode: TotalsCardMode = .standard) {
        self.subtotal = bill.subtotal
        self.tax = bill.tax
        self.tip = bill.tip
        self.discount = bill.discount
        self.serviceFee = bill.serviceFee
        self.total = bill.grandTotal
        self.mode = mode
    }

    /// Creates a TotalsCard for a person's breakdown
    /// - Parameters:
    ///   - personTotal: The PersonTotal from the calculator
    ///   - mode: Display mode (default: .full)
    init(personTotal: PersonTotal, mode: TotalsCardMode = .full) {
        self.subtotal = personTotal.subtotal
        self.tax = personTotal.taxShare
        self.tip = personTotal.tipShare
        self.discount = personTotal.discountShare
        self.serviceFee = personTotal.serviceFeeShare
        self.total = personTotal.total
        self.mode = mode
    }
}

// MARK: - Person Summary Card

/// A card showing a person's share of the bill
struct PersonSummaryCard: View {
    let personName: String
    let personTotal: PersonTotal
    let showItems: Bool

    init(
        personName: String,
        personTotal: PersonTotal,
        showItems: Bool = true
    ) {
        self.personName = personName
        self.personTotal = personTotal
        self.showItems = showItems
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text(personName)
                    .font(.headline)

                Spacer()

                CurrencyText(personTotal.total, style: .large)
            }

            if showItems && !personTotal.items.isEmpty {
                Divider()

                // Items list
                VStack(spacing: 8) {
                    ForEach(personTotal.items, id: \.itemId) { item in
                        HStack {
                            Text(item.emoji)
                            Text(item.label)
                                .font(.subheadline)
                                .lineLimit(1)

                            if item.weight < 1 {
                                Text("(\(formatPercentage(item.weight)))")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            CurrencyText(item.shareAmount, style: .small)
                        }
                    }
                }
            }

            Divider()

            // Breakdown
            VStack(spacing: 4) {
                if personTotal.discountShare > 0 {
                    breakdownRow("Discount", -personTotal.discountShare, isDiscount: true)
                }
                if personTotal.serviceFeeShare > 0 {
                    breakdownRow("Service Fee", personTotal.serviceFeeShare)
                }
                if personTotal.taxShare > 0 {
                    breakdownRow("Tax", personTotal.taxShare)
                }
                if personTotal.tipShare > 0 {
                    breakdownRow("Tip", personTotal.tipShare)
                }
            }
        }
        .padding()
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }

    private func breakdownRow(_ label: String, _ amount: Decimal, isDiscount: Bool = false) -> some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)

            Spacer()

            if isDiscount {
                CurrencyText.discount(abs(amount), style: .small)
            } else {
                CurrencyText(amount, style: .small, colorType: .muted)
            }
        }
    }

    private func formatPercentage(_ weight: Decimal) -> String {
        let percent = (weight as NSDecimalNumber).doubleValue * 100
        if percent.truncatingRemainder(dividingBy: 1) == 0 {
            return "\(Int(percent))%"
        } else {
            return String(format: "%.1f%%", percent)
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Totals Card - Modes") {
    ScrollView {
        VStack(spacing: 24) {
            Text("Compact Mode")
                .font(.headline)

            TotalsCard(
                subtotal: 85.50,
                tax: 6.84,
                tip: 12.83,
                total: 105.17,
                mode: .compact
            )

            Text("Standard Mode")
                .font(.headline)

            TotalsCard(
                subtotal: 85.50,
                tax: 6.84,
                tip: 12.83,
                total: 105.17,
                mode: .standard
            )

            Text("Full Mode")
                .font(.headline)

            TotalsCard(
                subtotal: 100.00,
                tax: 8.00,
                tip: 15.00,
                discount: 10.00,
                serviceFee: 5.00,
                total: 118.00,
                mode: .full
            )
        }
        .padding()
    }
    .background(Color.gray.opacity(0.1))
}

#Preview("Person Summary Card") {
    let personTotal = PersonTotal(
        personId: "1",
        name: "Alice",
        subtotal: 42.50,
        discountShare: 5.00,
        serviceFeeShare: 2.50,
        taxShare: 3.40,
        tipShare: 6.38,
        total: 49.78,
        items: [
            AssignedLine(
                itemId: "1",
                emoji: "🍕",
                label: "Margherita Pizza",
                price: 18.99,
                quantity: 1,
                weight: 1,
                shareAmount: 18.99
            ),
            AssignedLine(
                itemId: "2",
                emoji: "🍝",
                label: "Pasta Carbonara",
                price: 16.50,
                quantity: 1,
                weight: 1,
                shareAmount: 16.50
            ),
            AssignedLine(
                itemId: "3",
                emoji: "🍰",
                label: "Cheesecake",
                price: 14.00,
                quantity: 1,
                weight: 0.5,
                shareAmount: 7.00
            )
        ]
    )

    PersonSummaryCard(
        personName: "Alice",
        personTotal: personTotal
    )
    .padding()
    .background(Color.gray.opacity(0.1))
}
#endif
