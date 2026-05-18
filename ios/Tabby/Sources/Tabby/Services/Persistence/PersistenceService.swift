import Foundation
import SwiftData

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

    /// Save a bill with its items, people, and shares to this service’s isolated store (legacy / tests).
    func saveBill(
        _ bill: Bill,
        items: [BillItem],
        people: [BillPerson],
        shares: [BillItemShare]
    ) throws {
        try Self.saveBill(bill, items: items, people: people, shares: shares, into: modelContext)
    }

    /// Persists into the app’s `ModelContext` (same container as `HistoryView`).
    static func saveBill(
        _ bill: Bill,
        items: [BillItem],
        people: [BillPerson],
        shares: [BillItemShare],
        into context: ModelContext
    ) throws {
        let existingBill = try getBill(id: bill.id, context: context)

        if let existingBill {
            updatePersistentBill(existingBill, from: bill)
            updateBillItems(for: existingBill, items: items, context: context)
            updateBillPeople(for: existingBill, people: people, shares: shares, context: context)
        } else {
            let persistentBill = PersistentBill(from: bill)
            context.insert(persistentBill)

            for item in items {
                let persistentItem = PersistentItem(from: item, bill: persistentBill)
                context.insert(persistentItem)
                persistentBill.items.append(persistentItem)
            }

            for person in people {
                let persistentPerson = PersistentPerson(from: person, bill: persistentBill)
                context.insert(persistentPerson)
                persistentBill.people.append(persistentPerson)
            }

            setupItemAssignments(for: persistentBill, shares: shares)
        }

        try context.save()
    }

    /// Fetch all bills, sorted by creation date (newest first)
    func fetchBills() throws -> [PersistentBill] {
        let descriptor = FetchDescriptor<PersistentBill>(
            sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
        )
        return try modelContext.fetch(descriptor)
    }

    /// Fetch bills matching a search query
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
    func getBill(id: String) throws -> PersistentBill? {
        try Self.getBill(id: id, context: modelContext)
    }

    private static func getBill(id: String, context: ModelContext) throws -> PersistentBill? {
        let descriptor = FetchDescriptor<PersistentBill>(
            predicate: #Predicate<PersistentBill> { bill in
                bill.id == id
            }
        )
        return try context.fetch(descriptor).first
    }

    /// Delete a bill and all its related data
    func deleteBill(_ bill: PersistentBill) throws {
        modelContext.delete(bill)
        try modelContext.save()
    }

    /// Delete a bill by ID
    func deleteBill(id: String) throws {
        if let bill = try getBill(id: id) {
            try deleteBill(bill)
        }
    }

    /// Mark a bill as synced with the server
    func markBillAsSynced(id: String) throws {
        if let bill = try getBill(id: id) {
            bill.isSynced = true
            bill.updatedAt = Date()
            try modelContext.save()
        }
    }

    /// Get full bill data (bill, items, people, shares) for a persistent bill
    func getBillData(from persistentBill: PersistentBill) -> (
        bill: Bill,
        items: [BillItem],
        people: [BillPerson],
        shares: [BillItemShare]
    ) {
        let bill = persistentBill.toBill()
        let items = persistentBill.items.map { $0.toBillItem(billId: bill.id) }
        let people = persistentBill.people.map { $0.toBillPerson(billId: bill.id) }

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

    private static func updatePersistentBill(_ persistentBill: PersistentBill, from bill: Bill) {
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

    private static func updateBillItems(
        for persistentBill: PersistentBill,
        items: [BillItem],
        context: ModelContext
    ) {
        let newItemIds = Set(items.map(\.id))
        for item in persistentBill.items where !newItemIds.contains(item.id) {
            context.delete(item)
        }

        for item in items {
            if let existingItem = persistentBill.items.first(where: { $0.id == item.id }) {
                existingItem.label = item.label
                existingItem.emoji = item.emoji
                existingItem.quantity = item.quantity
                existingItem.unitPrice = item.unitPrice
            } else {
                let newItem = PersistentItem(from: item, bill: persistentBill)
                context.insert(newItem)
                persistentBill.items.append(newItem)
            }
        }
    }

    private static func updateBillPeople(
        for persistentBill: PersistentBill,
        people: [BillPerson],
        shares: [BillItemShare],
        context: ModelContext
    ) {
        let newPersonIds = Set(people.map(\.id))
        for person in persistentBill.people where !newPersonIds.contains(person.id) {
            context.delete(person)
        }

        for person in people {
            if let existingPerson = persistentBill.people.first(where: { $0.id == person.id }) {
                existingPerson.name = person.name
                existingPerson.avatarUrl = person.avatarUrl
                existingPerson.venmoHandle = person.venmoHandle
                existingPerson.isArchived = person.isArchived
                existingPerson.personalCredit = person.personalCredit
                existingPerson.creditNote = person.creditNote
            } else {
                let newPerson = PersistentPerson(from: person, bill: persistentBill)
                context.insert(newPerson)
                persistentBill.people.append(newPerson)
            }
        }

        setupItemAssignments(for: persistentBill, shares: shares)
    }

    private static func setupItemAssignments(for persistentBill: PersistentBill, shares: [BillItemShare]) {
        for item in persistentBill.items {
            item.assignedPeople = []
        }
        for person in persistentBill.people {
            person.assignedItems = []
        }

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
