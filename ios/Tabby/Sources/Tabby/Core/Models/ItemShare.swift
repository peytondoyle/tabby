import Foundation

/// Assignment mapping that defines how an item is shared between people (API model)
/// The weight represents the proportion of the item assigned to a person (0.0 to 1.0)
struct BillItemShare: Codable, Equatable, Hashable {
    let itemId: String
    let personId: String
    var weight: Decimal

    init(
        itemId: String,
        personId: String,
        weight: Decimal = 1
    ) {
        self.itemId = itemId
        self.personId = personId
        self.weight = weight
    }

    enum CodingKeys: String, CodingKey {
        case itemId = "item_id"
        case personId = "person_id"
        case weight
    }
}
