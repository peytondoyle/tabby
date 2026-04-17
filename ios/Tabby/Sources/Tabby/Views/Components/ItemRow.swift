import SwiftUI

// MARK: - ItemRow View

/// A row component for displaying a bill item with optional badges
///
/// Features:
/// - Emoji and label display
/// - Price with currency formatting
/// - Optional quantity badge (when quantity > 1)
/// - Optional split percentage badge (when item is shared)
/// - Checkmark indicator when assigned to current person
///
/// Usage:
/// ```swift
/// ItemRow(
///     emoji: "🍕",
///     label: "Large Pizza",
///     price: 24.99,
///     quantity: 2,
///     splitPercentage: 0.5,
///     isAssigned: true
/// )
/// ```
struct ItemRow: View {
    let emoji: String
    let label: String
    let price: Decimal
    let quantity: Int
    let splitPercentage: Decimal?
    let isAssigned: Bool
    let onTap: (() -> Void)?

    /// Creates an item row
    /// - Parameters:
    ///   - emoji: The emoji icon for the item (default: package emoji)
    ///   - label: The item name/description
    ///   - price: The total price for this item
    ///   - quantity: The quantity (default: 1, badge shown when > 1)
    ///   - splitPercentage: Optional split percentage (0.0-1.0) when shared
    ///   - isAssigned: Whether this item is assigned to the current person
    ///   - onTap: Optional tap handler for selection
    init(
        emoji: String = "📦",
        label: String,
        price: Decimal,
        quantity: Int = 1,
        splitPercentage: Decimal? = nil,
        isAssigned: Bool = false,
        onTap: (() -> Void)? = nil
    ) {
        self.emoji = emoji
        self.label = label
        self.price = price
        self.quantity = quantity
        self.splitPercentage = splitPercentage
        self.isAssigned = isAssigned
        self.onTap = onTap
    }

    var body: some View {
        Button(action: { onTap?() }) {
            HStack(spacing: 12) {
                // Emoji icon
                Text(emoji)
                    .font(.title2)
                    .frame(width: 40, height: 40)
                    .background(Color.gray.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                // Label and badges
                VStack(alignment: .leading, spacing: 4) {
                    Text(label)
                        .font(.body)
                        .foregroundStyle(.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    // Badges row
                    HStack(spacing: 8) {
                        if quantity > 1 {
                            QuantityBadge(quantity: quantity)
                        }

                        if let percentage = splitPercentage, percentage < 1 {
                            SplitBadge(percentage: percentage)
                        }
                    }
                }

                Spacer()

                // Price and assignment indicator
                HStack(spacing: 8) {
                    CurrencyText(price)

                    if isAssigned {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                            .font(.title3)
                    }
                }
            }
            .padding(.vertical, 8)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Quantity Badge

/// A small badge showing item quantity
private struct QuantityBadge: View {
    let quantity: Int

    var body: some View {
        Text("x\(quantity)")
            .font(.caption.weight(.medium))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Color.gray.opacity(0.15))
            .clipShape(Capsule())
    }
}

// MARK: - Split Badge

/// A badge showing the split percentage for shared items
private struct SplitBadge: View {
    let percentage: Decimal

    var body: some View {
        Text(formattedPercentage)
            .font(.caption.weight(.medium))
            .foregroundStyle(.blue)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Color.blue.opacity(0.1))
            .clipShape(Capsule())
    }

    private var formattedPercentage: String {
        let percent = (percentage as NSDecimalNumber).doubleValue * 100
        if percent.truncatingRemainder(dividingBy: 1) == 0 {
            return "\(Int(percent))%"
        } else {
            return String(format: "%.1f%%", percent)
        }
    }
}

// MARK: - ItemRow from BillItem

extension ItemRow {
    /// Creates an ItemRow from a BillItem model
    /// - Parameters:
    ///   - item: The BillItem to display
    ///   - splitPercentage: Optional split percentage when shared
    ///   - isAssigned: Whether assigned to current person
    ///   - onTap: Optional tap handler
    init(
        item: BillItem,
        splitPercentage: Decimal? = nil,
        isAssigned: Bool = false,
        onTap: (() -> Void)? = nil
    ) {
        self.emoji = item.emoji ?? "📦"
        self.label = item.label
        self.price = item.price
        self.quantity = (item.quantity as NSDecimalNumber).intValue
        self.splitPercentage = splitPercentage
        self.isAssigned = isAssigned
        self.onTap = onTap
    }

    /// Creates an ItemRow from an AssignedLine (calculator output)
    /// - Parameters:
    ///   - assignedLine: The assigned line item
    ///   - isAssigned: Whether assigned to current person
    ///   - onTap: Optional tap handler
    init(
        assignedLine: AssignedLine,
        isAssigned: Bool = false,
        onTap: (() -> Void)? = nil
    ) {
        self.emoji = assignedLine.emoji
        self.label = assignedLine.label
        self.price = assignedLine.shareAmount
        self.quantity = assignedLine.quantity
        self.splitPercentage = assignedLine.weight < 1 ? assignedLine.weight : nil
        self.isAssigned = isAssigned
        self.onTap = onTap
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Item Row Variations") {
    List {
        Section("Basic Items") {
            ItemRow(
                emoji: "🍕",
                label: "Margherita Pizza",
                price: 18.99
            )

            ItemRow(
                emoji: "🍝",
                label: "Spaghetti Carbonara with Extra Parmesan",
                price: 16.50
            )
        }

        Section("With Quantity") {
            ItemRow(
                emoji: "🍺",
                label: "Craft Beer",
                price: 24.00,
                quantity: 4
            )

            ItemRow(
                emoji: "🥟",
                label: "Dumplings",
                price: 15.00,
                quantity: 2
            )
        }

        Section("Split Items") {
            ItemRow(
                emoji: "🍰",
                label: "Cheesecake (Shared)",
                price: 6.00,
                splitPercentage: 0.5
            )

            ItemRow(
                emoji: "🥗",
                label: "Family Salad",
                price: 4.00,
                splitPercentage: Decimal(1) / Decimal(3)
            )
        }

        Section("Assigned Items") {
            ItemRow(
                emoji: "🍔",
                label: "Bacon Cheeseburger",
                price: 14.99,
                isAssigned: true
            )

            ItemRow(
                emoji: "🍟",
                label: "Truffle Fries (Shared)",
                price: 4.50,
                quantity: 1,
                splitPercentage: 0.5,
                isAssigned: true
            )
        }
    }
}
#endif
