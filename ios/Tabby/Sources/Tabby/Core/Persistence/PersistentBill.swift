import Foundation
import SwiftData

/// SwiftData model for persisting bills locally
@Model
final class PersistentBill {
    /// Unique identifier for the bill
    @Attribute(.unique)
    var id: String

    /// Optional title for the bill
    var title: String?

    /// Place name where the bill was created (restaurant, bar, etc.)
    var place: String?

    /// Date of the bill/receipt
    var date: Date?

    /// When the bill was first created
    var createdAt: Date

    /// When the bill was last updated
    var updatedAt: Date

    /// Editor token for API access (allows modifications)
    var editorToken: String?

    /// Viewer token for API access (read-only)
    var viewerToken: String?

    /// Subtotal before tax, tip, discount, and service fee
    var subtotal: Decimal

    /// Tax amount
    var tax: Decimal

    /// Tip amount
    var tip: Decimal

    /// Discount amount (positive number, subtracted from total)
    var discount: Decimal

    /// Service fee amount
    var serviceFee: Decimal

    /// Whether this bill has been synced with the server
    var isSynced: Bool

    /// Path to the receipt image, if any
    var receiptImagePath: String?

    /// Items on this bill
    @Relationship(deleteRule: .cascade, inverse: \PersistentItem.bill)
    var items: [PersistentItem]

    /// People splitting this bill
    @Relationship(deleteRule: .cascade, inverse: \PersistentPerson.bill)
    var people: [PersistentPerson]

    /// Computed grand total: subtotal - discount + serviceFee + tax + tip
    var grandTotal: Decimal {
        subtotal - discount + serviceFee + tax + tip
    }

    /// Number of people splitting this bill
    var personCount: Int {
        people.count
    }

    init(
        id: String = UUID().uuidString,
        title: String? = nil,
        place: String? = nil,
        date: Date? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date(),
        editorToken: String? = nil,
        viewerToken: String? = nil,
        subtotal: Decimal = 0,
        tax: Decimal = 0,
        tip: Decimal = 0,
        discount: Decimal = 0,
        serviceFee: Decimal = 0,
        isSynced: Bool = false,
        receiptImagePath: String? = nil,
        items: [PersistentItem] = [],
        people: [PersistentPerson] = []
    ) {
        self.id = id
        self.title = title
        self.place = place
        self.date = date
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.editorToken = editorToken
        self.viewerToken = viewerToken
        self.subtotal = subtotal
        self.tax = tax
        self.tip = tip
        self.discount = discount
        self.serviceFee = serviceFee
        self.isSynced = isSynced
        self.receiptImagePath = receiptImagePath
        self.items = items
        self.people = people
    }
}

// MARK: - Conversion Methods

extension PersistentBill {
    /// Create a PersistentBill from a Bill model
    convenience init(from bill: Bill) {
        self.init(
            id: bill.id,
            title: bill.title,
            place: bill.place,
            date: bill.date,
            createdAt: bill.createdAt,
            updatedAt: bill.updatedAt,
            editorToken: bill.editorToken,
            viewerToken: bill.viewerToken,
            subtotal: bill.subtotal,
            tax: bill.tax,
            tip: bill.tip,
            discount: bill.discount,
            serviceFee: bill.serviceFee,
            isSynced: false,
            receiptImagePath: bill.receiptImagePath,
            items: [],
            people: []
        )
    }

    /// Convert to a Bill model
    func toBill() -> Bill {
        Bill(
            id: id,
            title: title ?? "",
            place: place,
            date: date,
            subtotal: subtotal,
            tax: tax,
            tip: tip,
            discount: discount,
            serviceFee: serviceFee,
            editorToken: editorToken,
            viewerToken: viewerToken,
            receiptImagePath: receiptImagePath,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }
}
