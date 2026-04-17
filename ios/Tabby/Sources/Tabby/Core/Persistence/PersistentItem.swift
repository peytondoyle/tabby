import Foundation
import SwiftData

/// SwiftData model for persisting bill items locally
@Model
final class PersistentItem {
    /// Unique identifier for the item
    @Attribute(.unique)
    var id: String

    /// Label/name of the item
    var label: String

    /// Optional emoji for the item
    var emoji: String?

    /// Quantity of items
    var quantity: Decimal

    /// Price per unit
    var unitPrice: Decimal

    /// The bill this item belongs to
    var bill: PersistentBill?

    /// People assigned to this item (for shares)
    @Relationship(deleteRule: .nullify)
    var assignedPeople: [PersistentPerson]

    /// Computed total price for this item: quantity * unitPrice
    var price: Decimal {
        quantity * unitPrice
    }

    init(
        id: String = UUID().uuidString,
        label: String,
        emoji: String? = nil,
        quantity: Decimal = 1,
        unitPrice: Decimal,
        bill: PersistentBill? = nil,
        assignedPeople: [PersistentPerson] = []
    ) {
        self.id = id
        self.label = label
        self.emoji = emoji
        self.quantity = quantity
        self.unitPrice = unitPrice
        self.bill = bill
        self.assignedPeople = assignedPeople
    }
}

// MARK: - Conversion Methods

extension PersistentItem {
    /// Create a PersistentItem from a BillItem model
    convenience init(from item: BillItem, bill: PersistentBill? = nil) {
        self.init(
            id: item.id,
            label: item.label,
            emoji: item.emoji,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            bill: bill,
            assignedPeople: []
        )
    }

    /// Convert to a BillItem model
    func toBillItem(billId: String) -> BillItem {
        BillItem(
            id: id,
            billId: billId,
            label: label,
            emoji: emoji,
            quantity: quantity,
            unitPrice: unitPrice
        )
    }
}
