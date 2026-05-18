import Foundation
import SwiftData

/// SwiftData model for persisting people who split bills locally
@Model
final class PersistentPerson {
    /// Unique identifier for the person
    @Attribute(.unique)
    var id: String

    /// Person's name
    var name: String

    /// URL to the person's avatar image
    var avatarUrl: String?

    /// Person's Venmo handle for payment requests
    var venmoHandle: String?

    /// Whether this person is archived (paid)
    var isArchived: Bool

    /// Personal credit amount (positive)
    var personalCredit: Decimal

    /// Optional note for the credit
    var creditNote: String?

    /// The bill this person is associated with
    var bill: PersistentBill?

    /// Items assigned to this person
    @Relationship(deleteRule: .nullify)
    var assignedItems: [PersistentItem]

    init(
        id: String = UUID().uuidString,
        name: String,
        avatarUrl: String? = nil,
        venmoHandle: String? = nil,
        isArchived: Bool = false,
        personalCredit: Decimal = 0,
        creditNote: String? = nil,
        bill: PersistentBill? = nil,
        assignedItems: [PersistentItem] = []
    ) {
        self.id = id
        self.name = name
        self.avatarUrl = avatarUrl
        self.venmoHandle = venmoHandle
        self.isArchived = isArchived
        self.personalCredit = personalCredit
        self.creditNote = creditNote
        self.bill = bill
        self.assignedItems = assignedItems
    }
}

// MARK: - Conversion Methods

extension PersistentPerson {
    /// Create a PersistentPerson from a BillPerson model
    convenience init(from person: BillPerson, bill: PersistentBill? = nil) {
        self.init(
            id: person.id,
            name: person.name,
            avatarUrl: person.avatarUrl,
            venmoHandle: person.venmoHandle,
            isArchived: person.isArchived,
            personalCredit: person.personalCredit,
            creditNote: person.creditNote,
            bill: bill,
            assignedItems: []
        )
    }

    /// Convert to a BillPerson model
    func toBillPerson(billId: String) -> BillPerson {
        BillPerson(
            id: id,
            billId: billId,
            name: name,
            avatarUrl: avatarUrl,
            venmoHandle: venmoHandle,
            isArchived: isArchived,
            personalCredit: personalCredit,
            creditNote: creditNote
        )
    }
}
