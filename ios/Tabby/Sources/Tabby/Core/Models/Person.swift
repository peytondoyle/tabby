import Foundation

/// A person participating in splitting a bill (API model)
struct BillPerson: Identifiable, Codable, Equatable {
    let id: String
    let billId: String
    var name: String
    var avatarUrl: String?
    var venmoHandle: String?
    var isArchived: Bool

    init(
        id: String = UUID().uuidString,
        billId: String,
        name: String,
        avatarUrl: String? = nil,
        venmoHandle: String? = nil,
        isArchived: Bool = false
    ) {
        self.id = id
        self.billId = billId
        self.name = name
        self.avatarUrl = avatarUrl
        self.venmoHandle = venmoHandle
        self.isArchived = isArchived
    }

    enum CodingKeys: String, CodingKey {
        case id
        case billId = "bill_id"
        case name
        case avatarUrl = "avatar_url"
        case venmoHandle = "venmo_handle"
        case isArchived = "is_archived"
    }
}
