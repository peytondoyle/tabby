import SwiftUI
import SwiftData

/// A row view displaying a bill summary in the history list
struct HistoryRowView: View {
    /// The bill to display
    let bill: PersistentBill

    var body: some View {
        HStack(spacing: 12) {
            // Leading icon
            ZStack {
                Circle()
                    .fill(Color.accentColor.opacity(0.15))
                    .frame(width: 44, height: 44)

                Image(systemName: "receipt")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(Color.accentColor)
            }

            // Main content
            VStack(alignment: .leading, spacing: 4) {
                // Place name / title
                HStack {
                    Text(bill.displayName)
                        .font(.headline)
                        .lineLimit(1)

                    if bill.isSynced {
                        Image(systemName: "checkmark.icloud.fill")
                            .font(.caption)
                            .foregroundStyle(.green)
                    }
                }

                // Date and people count
                HStack(spacing: 8) {
                    // Date
                    if let date = bill.date ?? bill.createdAt as Date? {
                        Text(formattedDate(date))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    // Separator
                    if bill.personCount > 0 {
                        Text("\u{2022}")
                            .font(.caption)
                            .foregroundStyle(.tertiary)

                        // People count
                        Label("\(bill.personCount)", systemImage: "person.2")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()

            // Total amount
            VStack(alignment: .trailing, spacing: 2) {
                Text(formatCurrency(bill.grandTotal))
                    .font(.headline)
                    .foregroundStyle(.primary)

                if bill.items.count > 0 {
                    Text("\(bill.items.count) items")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Helpers

    private func formattedDate(_ date: Date) -> String {
        let calendar = Calendar.current

        if calendar.isDateInToday(date) {
            return "Today"
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else if let daysAgo = calendar.dateComponents([.day], from: date, to: Date()).day,
                  daysAgo < 7 {
            let formatter = DateFormatter()
            formatter.dateFormat = "EEEE"
            return formatter.string(from: date)
        } else {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            formatter.timeStyle = .none
            return formatter.string(from: date)
        }
    }

    private func formatCurrency(_ value: Decimal) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: value as NSDecimalNumber) ?? "$0.00"
    }
}

// MARK: - Preview

#if DEBUG
struct HistoryRowView_Previews: PreviewProvider {
    static var previews: some View {
        List {
            HistoryRowView(bill: sampleBill(place: "The Cheesecake Factory", total: 156.78, personCount: 4, isSynced: true))
            HistoryRowView(bill: sampleBill(place: "Chipotle", total: 32.50, personCount: 2, isSynced: false))
            HistoryRowView(bill: sampleBill(place: nil, title: "Team Lunch", total: 89.00, personCount: 6, isSynced: true))
            HistoryRowView(bill: sampleBill(place: nil, title: nil, total: 45.00, personCount: 0, isSynced: false))
        }
        #if os(iOS)
        .listStyle(.insetGrouped)
        #endif
    }

    static func sampleBill(
        place: String? = nil,
        title: String? = nil,
        total: Decimal,
        personCount: Int,
        isSynced: Bool
    ) -> PersistentBill {
        let bill = PersistentBill(
            id: UUID().uuidString,
            title: title,
            place: place,
            createdAt: Date().addingTimeInterval(-Double.random(in: 0...604800)),
            subtotal: total * 0.85,
            tax: total * 0.08,
            tip: total * 0.07,
            isSynced: isSynced
        )

        // Add sample people
        for i in 0..<personCount {
            let person = PersistentPerson(
                id: UUID().uuidString,
                name: "Person \(i + 1)",
                bill: bill
            )
            bill.people.append(person)
        }

        // Add sample items
        for i in 0..<3 {
            let item = PersistentItem(
                id: UUID().uuidString,
                label: "Item \(i + 1)",
                emoji: ["burger", "pizza", "salad"][i % 3],
                unitPrice: Decimal(Double.random(in: 10...30)),
                bill: bill
            )
            bill.items.append(item)
        }

        return bill
    }
}
#endif
