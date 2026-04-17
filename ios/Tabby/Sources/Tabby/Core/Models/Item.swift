import Foundation

/// Line item on a bill representing a single product or service (API model)
struct BillItem: Identifiable, Codable, Equatable {
    let id: String
    let billId: String
    var label: String
    var emoji: String?
    var quantity: Decimal
    var unitPrice: Decimal

    /// Computed total price for this item: quantity * unitPrice
    var price: Decimal {
        quantity * unitPrice
    }

    init(
        id: String = UUID().uuidString,
        billId: String,
        label: String,
        emoji: String? = nil,
        quantity: Decimal = 1,
        unitPrice: Decimal
    ) {
        self.id = id
        self.billId = billId
        self.label = label
        self.emoji = emoji
        self.quantity = quantity
        self.unitPrice = unitPrice
    }

    enum CodingKeys: String, CodingKey {
        case id
        case billId = "bill_id"
        case label
        case emoji
        case quantity
        case unitPrice = "unit_price"
    }
}
