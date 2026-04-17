import Foundation

// MARK: - Types

/// Represents a line item assigned to a person with their share
public struct AssignedLine: Equatable, Hashable {
    public var itemId: String
    public var emoji: String
    public var label: String
    public var price: Decimal
    public var quantity: Int
    public var weight: Decimal
    public var shareAmount: Decimal

    public init(
        itemId: String,
        emoji: String,
        label: String,
        price: Decimal,
        quantity: Int,
        weight: Decimal,
        shareAmount: Decimal
    ) {
        self.itemId = itemId
        self.emoji = emoji
        self.label = label
        self.price = price
        self.quantity = quantity
        self.weight = weight
        self.shareAmount = shareAmount
    }
}

/// Represents an item on the bill
public struct Item: Equatable, Hashable {
    public var id: String
    public var emoji: String?
    public var label: String
    public var price: Decimal
    public var quantity: Int
    public var unitPrice: Decimal

    public init(
        id: String,
        emoji: String? = nil,
        label: String,
        price: Decimal,
        quantity: Int,
        unitPrice: Decimal
    ) {
        self.id = id
        self.emoji = emoji
        self.label = label
        self.price = price
        self.quantity = quantity
        self.unitPrice = unitPrice
    }
}

/// Represents a person splitting the bill
public struct Person: Equatable, Hashable {
    public var id: String
    public var name: String
    public var avatarUrl: String?
    public var venmoHandle: String?
    public var isPaid: Bool

    public init(
        id: String,
        name: String,
        avatarUrl: String? = nil,
        venmoHandle: String? = nil,
        isPaid: Bool = false
    ) {
        self.id = id
        self.name = name
        self.avatarUrl = avatarUrl
        self.venmoHandle = venmoHandle
        self.isPaid = isPaid
    }
}

/// Represents how an item is shared between people
public struct ItemShare: Equatable, Hashable {
    public var itemId: String
    public var personId: String
    public var weight: Decimal // 0.0 to 1.0, e.g., 0.5 for 50/50 split

    public init(itemId: String, personId: String, weight: Decimal) {
        self.itemId = itemId
        self.personId = personId
        self.weight = weight
    }
}

/// Represents a person's total breakdown
public struct PersonTotal: Equatable {
    public var personId: String
    public var name: String
    public var subtotal: Decimal
    public var discountShare: Decimal
    public var serviceFeeShare: Decimal
    public var taxShare: Decimal
    public var tipShare: Decimal
    public var total: Decimal
    public var items: [AssignedLine]

    public init(
        personId: String,
        name: String,
        subtotal: Decimal = .zero,
        discountShare: Decimal = .zero,
        serviceFeeShare: Decimal = .zero,
        taxShare: Decimal = .zero,
        tipShare: Decimal = .zero,
        total: Decimal = .zero,
        items: [AssignedLine] = []
    ) {
        self.personId = personId
        self.name = name
        self.subtotal = subtotal
        self.discountShare = discountShare
        self.serviceFeeShare = serviceFeeShare
        self.taxShare = taxShare
        self.tipShare = tipShare
        self.total = total
        self.items = items
    }
}

/// How to split tax or tip
public enum SplitMode: String, Equatable {
    case proportional
    case even
}

public typealias TaxMode = SplitMode
public typealias TipMode = SplitMode

/// Information about penny reconciliation
public struct PennyReconciliation: Equatable {
    public var distributed: Decimal
    public var method: String

    public init(distributed: Decimal, method: String = "distribute_largest") {
        self.distributed = distributed
        self.method = method
    }
}

/// The complete bill totals breakdown
public struct BillTotals: Equatable {
    public var subtotal: Decimal
    public var discount: Decimal
    public var serviceFee: Decimal
    public var tax: Decimal
    public var tip: Decimal
    public var grandTotal: Decimal
    public var personTotals: [PersonTotal]
    public var pennyReconciliation: PennyReconciliation

    public init(
        subtotal: Decimal,
        discount: Decimal,
        serviceFee: Decimal,
        tax: Decimal,
        tip: Decimal,
        grandTotal: Decimal,
        personTotals: [PersonTotal],
        pennyReconciliation: PennyReconciliation
    ) {
        self.subtotal = subtotal
        self.discount = discount
        self.serviceFee = serviceFee
        self.tax = tax
        self.tip = tip
        self.grandTotal = grandTotal
        self.personTotals = personTotals
        self.pennyReconciliation = pennyReconciliation
    }
}

// MARK: - BillCalculator

/// Calculator for splitting bills with tax, tip, discount, and service fee
public struct BillCalculator {

    // MARK: - Validation

    /// Validates that a weight is greater than 0
    /// - Parameter weight: The weight to validate
    /// - Throws: Error if weight is <= 0
    public static func validateWeight(_ weight: Decimal) throws {
        if weight <= 0 {
            throw BillCalculatorError.invalidWeight
        }
    }

    /// Validates that an item has at least one person with weight > 0
    /// - Parameters:
    ///   - itemId: The item ID to check
    ///   - shares: Array of all shares
    ///   - newWeight: The new weight being added/updated
    ///   - personId: The person ID for the new/updated weight
    /// - Throws: Error if all weights would sum to 0
    public static func validateItemWeights(
        itemId: String,
        shares: [ItemShare],
        newWeight: Decimal,
        personId: String
    ) throws {
        let itemShares = shares.filter { $0.itemId == itemId }
        let otherWeights = itemShares
            .filter { $0.personId != personId }
            .reduce(Decimal.zero) { sum, share in sum + share.weight }

        if otherWeights + newWeight <= 0 {
            throw BillCalculatorError.itemNeedsOwner(itemId: itemId)
        }
    }

    /// Checks if a specific (item_id, person_id) combination already exists in shares
    /// - Parameters:
    ///   - shares: Array of shares to check
    ///   - itemId: The item ID
    ///   - personId: The person ID
    /// - Returns: The existing share if found, nil otherwise
    public static func findExistingShare(
        shares: [ItemShare],
        itemId: String,
        personId: String
    ) -> ItemShare? {
        return shares.first { $0.itemId == itemId && $0.personId == personId }
    }

    /// Validates multiple shares at once to ensure no item has all weights <= 0
    /// - Parameter shares: Array of shares to validate
    /// - Throws: Error if any item would have all weights <= 0
    public static func validateAllItemWeights(shares: [ItemShare]) throws {
        // Group shares by item_id
        var sharesByItem: [String: [ItemShare]] = [:]
        for share in shares {
            sharesByItem[share.itemId, default: []].append(share)
        }

        // Check each item
        for (itemId, itemShares) in sharesByItem {
            let totalWeight = itemShares.reduce(Decimal.zero) { sum, share in sum + share.weight }
            if totalWeight <= 0 {
                throw BillCalculatorError.itemNeedsOwner(itemId: itemId)
            }
        }
    }

    // MARK: - Compute Totals

    /// Compute totals for a bill with tax/tip split options and penny reconciliation
    ///
    /// - Parameters:
    ///   - items: Array of items on the bill
    ///   - shares: Array of item shares (who gets what portion of each item)
    ///   - people: Array of people splitting the bill
    ///   - tax: Tax amount
    ///   - tip: Tip amount
    ///   - discount: Discount amount (positive number, will be subtracted from total)
    ///   - serviceFee: Service fee amount
    ///   - taxMode: How to split tax: 'proportional' (by item totals) or 'even' (equal split)
    ///   - tipMode: How to split tip: 'proportional' (by item totals) or 'even' (equal split)
    ///   - includeZeroPeople: Whether to include people with no items in even splits
    /// - Returns: BillTotals with per-person breakdowns
    public static func computeTotals(
        items: [Item],
        shares: [ItemShare],
        people: [Person],
        tax: Decimal,
        tip: Decimal,
        discount: Decimal = .zero,
        serviceFee: Decimal = .zero,
        taxMode: TaxMode = .proportional,
        tipMode: TipMode = .proportional,
        includeZeroPeople: Bool = true
    ) -> BillTotals {
        // 1. Calculate subtotal from items
        let subtotal = items.reduce(Decimal.zero) { sum, item in sum + item.price }
        // Discount is positive and subtracted, service_fee/tax/tip are added
        let grandTotal = subtotal - discount + serviceFee + tax + tip

        // 2. Build lookup maps for quick access
        let itemMap = Dictionary(uniqueKeysWithValues: items.map { ($0.id, $0) })

        // 3. Initialize person totals
        var personTotals: [PersonTotal] = people.map { person in
            PersonTotal(personId: person.id, name: person.name)
        }

        var personTotalMap = Dictionary(uniqueKeysWithValues: personTotals.enumerated().map { ($1.personId, $0) })

        // 4. Calculate total weight for each item (for shared items)
        var itemWeightTotals: [String: Decimal] = [:]
        for share in shares {
            itemWeightTotals[share.itemId, default: .zero] += share.weight
        }

        // 5. Distribute items to people based on shares
        for share in shares {
            guard let item = itemMap[share.itemId],
                  let index = personTotalMap[share.personId] else {
                continue
            }

            let totalWeight = itemWeightTotals[share.itemId] ?? Decimal(1)
            let shareRatio = share.weight / totalWeight
            let shareAmount = item.price * shareRatio

            // Add to person's subtotal
            personTotals[index].subtotal += shareAmount

            // Add item to person's items list
            personTotals[index].items.append(AssignedLine(
                itemId: share.itemId,
                emoji: item.emoji ?? "📦",
                label: item.label,
                price: item.price,
                quantity: item.quantity,
                weight: share.weight,
                shareAmount: shareAmount
            ))
        }

        // 6. Calculate discount shares (proportional to subtotal)
        // Discounts are always applied proportionally
        for i in personTotals.indices {
            if subtotal > 0 {
                personTotals[i].discountShare = (personTotals[i].subtotal / subtotal) * discount
            }
        }

        // 7. Calculate service fee shares (proportional to subtotal)
        // Service fees are always applied proportionally
        for i in personTotals.indices {
            if subtotal > 0 {
                personTotals[i].serviceFeeShare = (personTotals[i].subtotal / subtotal) * serviceFee
            }
        }

        // 8. Calculate tax shares
        if taxMode == .proportional {
            // Split tax proportionally based on each person's subtotal
            for i in personTotals.indices {
                if subtotal > 0 {
                    personTotals[i].taxShare = (personTotals[i].subtotal / subtotal) * tax
                }
            }
        } else {
            // Split tax evenly among relevant people
            let relevantIndices: [Int]
            if includeZeroPeople {
                relevantIndices = Array(personTotals.indices)
            } else {
                relevantIndices = personTotals.indices.filter { personTotals[$0].subtotal > 0 }
            }

            if !relevantIndices.isEmpty {
                let taxPerPerson = tax / Decimal(relevantIndices.count)
                for i in relevantIndices {
                    personTotals[i].taxShare = taxPerPerson
                }
            }
        }

        // 9. Calculate tip shares
        if tipMode == .proportional {
            // Split tip proportionally based on each person's subtotal
            for i in personTotals.indices {
                if subtotal > 0 {
                    personTotals[i].tipShare = (personTotals[i].subtotal / subtotal) * tip
                }
            }
        } else {
            // Split tip evenly among relevant people
            let relevantIndices: [Int]
            if includeZeroPeople {
                relevantIndices = Array(personTotals.indices)
            } else {
                relevantIndices = personTotals.indices.filter { personTotals[$0].subtotal > 0 }
            }

            if !relevantIndices.isEmpty {
                let tipPerPerson = tip / Decimal(relevantIndices.count)
                for i in relevantIndices {
                    personTotals[i].tipShare = tipPerPerson
                }
            }
        }

        // 10. Calculate raw totals for each person (discount is subtracted, others added)
        for i in personTotals.indices {
            personTotals[i].total = personTotals[i].subtotal
                - personTotals[i].discountShare
                + personTotals[i].serviceFeeShare
                + personTotals[i].taxShare
                + personTotals[i].tipShare
        }

        // 11. Round totals to cents and reconcile pennies
        let reconciledTotals = PennyReconciler.reconcilePennies(
            personTotals: personTotals,
            targetTotal: grandTotal
        )

        // 12. Calculate how much was distributed in reconciliation
        let beforeTotal = personTotals.reduce(Decimal.zero) { sum, p in
            sum + roundToCents(p.total)
        }
        let distributed = grandTotal - beforeTotal

        return BillTotals(
            subtotal: subtotal,
            discount: discount,
            serviceFee: serviceFee,
            tax: tax,
            tip: tip,
            grandTotal: grandTotal,
            personTotals: reconciledTotals,
            pennyReconciliation: PennyReconciliation(
                distributed: roundToCents(distributed),
                method: "distribute_largest"
            )
        )
    }

    // MARK: - Helper Methods

    /// Derive assigned items map from items and shares data
    /// - Parameters:
    ///   - items: Array of items with their details
    ///   - shares: Array of item shares (item_id, person_id, weight)
    /// - Returns: Dictionary mapping person_id to array of assigned items with computed share amounts
    public static func deriveAssignedMap(
        items: [Item],
        shares: [ItemShare]
    ) -> [String: [AssignedLine]] {
        // Build Map(item_id -> item) for quick lookup
        let itemMap = Dictionary(uniqueKeysWithValues: items.map { ($0.id, $0) })

        // Group shares by person_id
        var sharesByPerson: [String: [ItemShare]] = [:]
        for share in shares {
            sharesByPerson[share.personId, default: []].append(share)
        }

        // Compute assigned items for each person
        var result: [String: [AssignedLine]] = [:]

        for (personId, personShares) in sharesByPerson {
            var assignedItems: [AssignedLine] = []

            for share in personShares {
                guard let item = itemMap[share.itemId] else { continue }

                // Calculate total weight for this item across all shares
                let totalWeight = shares
                    .filter { $0.itemId == share.itemId }
                    .reduce(Decimal.zero) { sum, s in sum + s.weight }

                // Calculate share price based on weight proportion
                let sharePrice = (item.price * share.weight) / totalWeight

                assignedItems.append(AssignedLine(
                    itemId: share.itemId,
                    emoji: item.emoji ?? "📦",
                    label: item.label,
                    price: item.price,
                    quantity: item.quantity,
                    weight: share.weight,
                    shareAmount: sharePrice
                ))
            }

            result[personId] = assignedItems
        }

        return result
    }

    /// Convert UI model to ItemShare format.
    /// Detects shared items (same item in multiple people's items arrays).
    ///
    /// - Parameters:
    ///   - items: Array of items with id and price
    ///   - people: Array of people with id and items array
    /// - Returns: Array of ItemShare objects with weights calculated for shared items
    public static func buildSharesFromPeopleItems(
        items: [(id: String, price: Decimal)],
        people: [(id: String, items: [String])]
    ) -> [ItemShare] {
        var shares: [ItemShare] = []

        for item in items {
            // Find all people who have this item in their items array
            let ownersOfItem = people.filter { $0.items.contains(item.id) }

            if !ownersOfItem.isEmpty {
                // Split evenly among all owners
                let weight = Decimal(1) / Decimal(ownersOfItem.count)
                for owner in ownersOfItem {
                    shares.append(ItemShare(
                        itemId: item.id,
                        personId: owner.id,
                        weight: weight
                    ))
                }
            }
        }

        return shares
    }

    /// Validates that person totals sum to the grand total
    /// - Parameter totals: BillTotals object to validate
    /// - Returns: Tuple with valid boolean and optional error message
    public static func validateBillTotals(_ totals: BillTotals) -> (valid: Bool, error: String?) {
        let sumOfPersonTotals = totals.personTotals.reduce(Decimal.zero) { sum, p in sum + p.total }
        let rounded = roundToCents(sumOfPersonTotals)
        let grandRounded = roundToCents(totals.grandTotal)

        if abs(rounded - grandRounded) > Decimal(string: "0.01")! {
            return (
                valid: false,
                error: "Person totals ($\(rounded)) don't match grand total ($\(grandRounded))"
            )
        }
        return (valid: true, error: nil)
    }

    /// Round a Decimal value to cents (2 decimal places)
    private static func roundToCents(_ value: Decimal) -> Decimal {
        var result = value
        var rounded = Decimal()
        NSDecimalRound(&rounded, &result, 2, .plain)
        return rounded
    }
}

// MARK: - Errors

public enum BillCalculatorError: Error, LocalizedError {
    case invalidWeight
    case itemNeedsOwner(itemId: String)

    public var errorDescription: String? {
        switch self {
        case .invalidWeight:
            return "Weight must be greater than 0"
        case .itemNeedsOwner(let itemId):
            return "Item \(itemId) needs at least one person with weight > 0"
        }
    }
}
