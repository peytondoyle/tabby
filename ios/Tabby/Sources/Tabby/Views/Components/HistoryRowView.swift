import SwiftUI
import SwiftData

/// History list row — Milk & Clay card feel in list
struct HistoryRowView: View {
    let bill: PersistentBill

    var body: some View {
        HStack(spacing: TB.Space.md) {
            ZStack {
                Circle()
                    .fill(TB.Palette.clayTint)
                    .frame(width: 44, height: 44)
                Image(systemName: "receipt")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(TB.Palette.clay)
            }
            .tbShadow(.xs)

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(bill.displayName)
                        .font(TB.Typography.body())
                        .foregroundStyle(TB.Palette.ink)
                        .lineLimit(1)

                    if bill.isSynced {
                        Image(systemName: "checkmark.icloud.fill")
                            .font(TB.Typography.meta())
                            .foregroundStyle(TB.Palette.success)
                    }
                }

                HStack(spacing: TB.Space.sm) {
                    if let date = bill.date ?? bill.createdAt as Date? {
                        Text(formattedDate(date))
                            .font(TB.Typography.meta())
                            .foregroundStyle(TB.Palette.inkFaint)
                    }

                    if bill.personCount > 0 {
                        Text("\u{2022}")
                            .font(TB.Typography.meta())
                            .foregroundStyle(TB.Palette.inkDim)
                        Label("\(bill.personCount)", systemImage: "person.2")
                            .font(TB.Typography.meta())
                            .foregroundStyle(TB.Palette.inkSoft)
                    }
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(formatCurrency(bill.grandTotal))
                    .font(TB.Typography.moneyMedium())
                    .monospacedDigit()
                    .foregroundStyle(TB.Palette.clay)

                if bill.items.count > 0 {
                    Text("\(bill.items.count) items")
                        .font(TB.Typography.meta())
                        .foregroundStyle(TB.Palette.inkFaint)
                }
            }
        }
        .padding(.vertical, TB.Space.xs)
    }

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

#if DEBUG
struct HistoryRowView_Previews: PreviewProvider {
    static var previews: some View {
        List {
            HistoryRowView(bill: sampleBill(place: "The Cheesecake Factory", total: 156.78, personCount: 4, isSynced: true))
            HistoryRowView(bill: sampleBill(place: "Chipotle", total: 32.50, personCount: 2, isSynced: false))
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

        for i in 0..<personCount {
            let person = PersistentPerson(
                id: UUID().uuidString,
                name: "Person \(i + 1)",
                bill: bill
            )
            bill.people.append(person)
        }

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
