import Foundation
import SwiftData
import SwiftUI

/// Service for managing local persistence of bills using SwiftData
@MainActor
final class PersistenceService {
    /// Shared singleton instance
    static let shared = PersistenceService()

    /// The SwiftData model container
    let modelContainer: ModelContainer

    /// The main model context for database operations
    var modelContext: ModelContext {
        modelContainer.mainContext
    }

    private init() {
        let schema = Schema([
            PersistentBill.self,
            PersistentItem.self,
            PersistentPerson.self
        ])

        let modelConfiguration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false,
            allowsSave: true
        )

        do {
            modelContainer = try ModelContainer(
                for: schema,
                configurations: [modelConfiguration]
            )
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }

    // MARK: - Bill Operations

    /// Save a bill with its items, people, and shares to local storage
    /// - Parameters:
    ///   - bill: The bill to save
    ///   - items: Items on the bill
    ///   - people: People splitting the bill
    ///   - shares: Item share assignments
    func saveBill(
        _ bill: Bill,
        items: [BillItem],
        people: [BillPerson],
        shares: [BillItemShare]
    ) throws {
        // Check if bill already exists
        let existingBill = try getBill(id: bill.id)

        if let existingBill = existingBill {
            // Update existing bill
            updatePersistentBill(existingBill, from: bill)
            updateBillItems(for: existingBill, items: items)
            updateBillPeople(for: existingBill, people: people, shares: shares)
        } else {
            // Create new bill
            let persistentBill = PersistentBill(from: bill)
            modelContext.insert(persistentBill)

            // Add items
            for item in items {
                let persistentItem = PersistentItem(from: item, bill: persistentBill)
                modelContext.insert(persistentItem)
                persistentBill.items.append(persistentItem)
            }

            // Add people
            for person in people {
                let persistentPerson = PersistentPerson(from: person, bill: persistentBill)
                modelContext.insert(persistentPerson)
                persistentBill.people.append(persistentPerson)
            }

            // Set up item assignments based on shares
            setupItemAssignments(for: persistentBill, shares: shares)
        }

        try modelContext.save()
    }

    /// Fetch all bills, sorted by creation date (newest first)
    /// - Returns: Array of persistent bills
    func fetchBills() throws -> [PersistentBill] {
        let descriptor = FetchDescriptor<PersistentBill>(
            sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
        )
        return try modelContext.fetch(descriptor)
    }

    /// Fetch bills matching a search query
    /// - Parameter query: Search text to match against place or title
    /// - Returns: Array of matching persistent bills
    func fetchBills(matching query: String) throws -> [PersistentBill] {
        let descriptor = FetchDescriptor<PersistentBill>(
            predicate: #Predicate<PersistentBill> { bill in
                bill.place?.localizedStandardContains(query) == true ||
                bill.title?.localizedStandardContains(query) == true
            },
            sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
        )
        return try modelContext.fetch(descriptor)
    }

    /// Get a specific bill by ID
    /// - Parameter id: The bill's unique identifier
    /// - Returns: The persistent bill if found, nil otherwise
    func getBill(id: String) throws -> PersistentBill? {
        let descriptor = FetchDescriptor<PersistentBill>(
            predicate: #Predicate<PersistentBill> { bill in
                bill.id == id
            }
        )
        return try modelContext.fetch(descriptor).first
    }

    /// Delete a bill and all its related data
    /// - Parameter bill: The bill to delete
    func deleteBill(_ bill: PersistentBill) throws {
        modelContext.delete(bill)
        try modelContext.save()
    }

    /// Delete a bill by ID
    /// - Parameter id: The ID of the bill to delete
    func deleteBill(id: String) throws {
        if let bill = try getBill(id: id) {
            try deleteBill(bill)
        }
    }

    /// Mark a bill as synced with the server
    /// - Parameter id: The bill's unique identifier
    func markBillAsSynced(id: String) throws {
        if let bill = try getBill(id: id) {
            bill.isSynced = true
            bill.updatedAt = Date()
            try modelContext.save()
        }
    }

    /// Get full bill data (bill, items, people, shares) for a persistent bill
    /// - Parameter persistentBill: The persistent bill to convert
    /// - Returns: Tuple containing bill model and related data
    func getBillData(from persistentBill: PersistentBill) -> (
        bill: Bill,
        items: [BillItem],
        people: [BillPerson],
        shares: [BillItemShare]
    ) {
        let bill = persistentBill.toBill()
        let items = persistentBill.items.map { $0.toBillItem(billId: bill.id) }
        let people = persistentBill.people.map { $0.toBillPerson(billId: bill.id) }

        // Reconstruct shares from item-person assignments
        var shares: [BillItemShare] = []
        for item in persistentBill.items {
            let assignedCount = item.assignedPeople.count
            if assignedCount > 0 {
                let weight = Decimal(1) / Decimal(assignedCount)
                for person in item.assignedPeople {
                    shares.append(BillItemShare(
                        itemId: item.id,
                        personId: person.id,
                        weight: weight
                    ))
                }
            }
        }

        return (bill, items, people, shares)
    }

    // MARK: - Private Helpers

    private func updatePersistentBill(_ persistentBill: PersistentBill, from bill: Bill) {
        persistentBill.title = bill.title
        persistentBill.place = bill.place
        persistentBill.date = bill.date
        persistentBill.subtotal = bill.subtotal
        persistentBill.tax = bill.tax
        persistentBill.tip = bill.tip
        persistentBill.discount = bill.discount
        persistentBill.serviceFee = bill.serviceFee
        persistentBill.editorToken = bill.editorToken
        persistentBill.viewerToken = bill.viewerToken
        persistentBill.receiptImagePath = bill.receiptImagePath
        persistentBill.updatedAt = Date()
        persistentBill.isSynced = false
    }

    private func updateBillItems(for persistentBill: PersistentBill, items: [BillItem]) {
        // Remove old items not in new list
        let newItemIds = Set(items.map { $0.id })
        for item in persistentBill.items where !newItemIds.contains(item.id) {
            modelContext.delete(item)
        }

        // Update or add items
        let existingItemIds = Set(persistentBill.items.map { $0.id })
        for item in items {
            if let existingItem = persistentBill.items.first(where: { $0.id == item.id }) {
                existingItem.label = item.label
                existingItem.emoji = item.emoji
                existingItem.quantity = item.quantity
                existingItem.unitPrice = item.unitPrice
            } else {
                let newItem = PersistentItem(from: item, bill: persistentBill)
                modelContext.insert(newItem)
                persistentBill.items.append(newItem)
            }
        }
    }

    private func updateBillPeople(
        for persistentBill: PersistentBill,
        people: [BillPerson],
        shares: [BillItemShare]
    ) {
        // Remove old people not in new list
        let newPersonIds = Set(people.map { $0.id })
        for person in persistentBill.people where !newPersonIds.contains(person.id) {
            modelContext.delete(person)
        }

        // Update or add people
        for person in people {
            if let existingPerson = persistentBill.people.first(where: { $0.id == person.id }) {
                existingPerson.name = person.name
                existingPerson.avatarUrl = person.avatarUrl
                existingPerson.venmoHandle = person.venmoHandle
                existingPerson.isArchived = person.isArchived
            } else {
                let newPerson = PersistentPerson(from: person, bill: persistentBill)
                modelContext.insert(newPerson)
                persistentBill.people.append(newPerson)
            }
        }

        // Update item assignments
        setupItemAssignments(for: persistentBill, shares: shares)
    }

    private func setupItemAssignments(for persistentBill: PersistentBill, shares: [BillItemShare]) {
        // Clear existing assignments
        for item in persistentBill.items {
            item.assignedPeople = []
        }
        for person in persistentBill.people {
            person.assignedItems = []
        }

        // Set up new assignments based on shares
        for share in shares {
            if let item = persistentBill.items.first(where: { $0.id == share.itemId }),
               let person = persistentBill.people.first(where: { $0.id == share.personId }) {
                if !item.assignedPeople.contains(where: { $0.id == person.id }) {
                    item.assignedPeople.append(person)
                }
                if !person.assignedItems.contains(where: { $0.id == item.id }) {
                    person.assignedItems.append(item)
                }
            }
        }
    }
}

// MARK: - SwiftUI Environment

private struct PersistenceServiceKey: EnvironmentKey {
    static let defaultValue = PersistenceService.shared
}

extension EnvironmentValues {
    var persistenceService: PersistenceService {
        get { self[PersistenceServiceKey.self] }
        set { self[PersistenceServiceKey.self] = newValue }
    }
}
