import Foundation
import SwiftData

// MARK: - BillViewModel

/// Main ViewModel for managing bill state and calculations in the Tabby iOS app.
@Observable
final class BillViewModel {

    // MARK: - State

    var bill: Bill?
    var items: [BillItem] = []
    var people: [BillPerson] = []
    var shares: [BillItemShare] = []

    var isLoading: Bool = false
    var error: String?

    /// Token used to open this session (editor or viewer)
    private(set) var sessionToken: String?

    /// When true, assignments and save are disabled (viewer link)
    private(set) var isReadOnly: Bool = false

    /// Bumped when a deep link finishes loading so `MainTabView` can push Home → Item list.
    private(set) var homeItemListNavigationTick: UInt64 = 0

    var taxMode: TaxMode = .proportional
    var tipMode: TipMode = .proportional
    var includeZeroPeople: Bool = true

    private let api: BillAPI

    // MARK: - Init

    init(api: BillAPI = .shared) {
        self.api = api
        let prefs = UserPreferences.shared
        taxMode = prefs.taxDistributionMode == .even ? .even : .proportional
        tipMode = prefs.tipDistributionMode == .even ? .even : .proportional
        includeZeroPeople = prefs.includeZeroPeopleInEvenSplits
    }

    func syncSplitModesFromPreferences() {
        let prefs = UserPreferences.shared
        taxMode = prefs.taxDistributionMode == .even ? .even : .proportional
        tipMode = prefs.tipDistributionMode == .even ? .even : .proportional
        includeZeroPeople = prefs.includeZeroPeopleInEvenSplits
    }

    // MARK: - Totals

    var billTotals: BillTotals? {
        guard let bill else { return nil }

        let calculatorItems = items.map { item in
            Item(
                id: item.id,
                emoji: item.emoji,
                label: item.label,
                price: item.price,
                quantity: Int(truncating: item.quantity as NSDecimalNumber),
                unitPrice: item.unitPrice
            )
        }

        let calculatorPeople = people.map { person in
            Person(
                id: person.id,
                name: person.name,
                avatarUrl: person.avatarUrl,
                venmoHandle: person.venmoHandle,
                isPaid: person.isArchived,
                personalCredit: person.personalCredit,
                creditNote: person.creditNote
            )
        }

        let calculatorShares = shares.map { share in
            ItemShare(
                itemId: share.itemId,
                personId: share.personId,
                weight: share.weight
            )
        }

        return BillCalculator.computeTotals(
            items: calculatorItems,
            shares: calculatorShares,
            people: calculatorPeople,
            tax: bill.tax,
            tip: bill.tip,
            discount: bill.discount,
            serviceFee: bill.serviceFee,
            taxMode: taxMode,
            tipMode: tipMode,
            includeZeroPeople: includeZeroPeople
        )
    }

    func getPersonTotal(personId: String) -> Decimal {
        billTotals?.personTotals.first { $0.personId == personId }?.total ?? 0
    }

    func getPersonBreakdown(personId: String) -> PersonTotal? {
        billTotals?.personTotals.first { $0.personId == personId }
    }

    func isItemAssignedTo(itemId: String, personId: String) -> Bool {
        shares.contains { $0.itemId == itemId && $0.personId == personId && $0.weight > 0 }
    }

    // MARK: - API: Load

    @MainActor
    func loadBill(token: String, navigateToItemList: Bool = false) async {
        isLoading = true
        error = nil
        sessionToken = token

        do {
            let response = try await api.fetchBill(token: token)
            guard let mapped = ReceiptMapper.mapFetchResponse(response, sessionToken: token) else {
                self.error = "Invalid receipt data"
                isLoading = false
                return
            }
            bill = mapped.bill
            items = mapped.items
            people = mapped.people
            shares = mapped.shares
            isReadOnly = mapped.isReadOnly
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false

        if navigateToItemList, self.error == nil, bill != nil {
            homeItemListNavigationTick &+= 1
        }
    }

    /// Writes the current in-memory bill snapshot into the app’s SwiftData store (History).
    @MainActor
    func persistSnapshotToSwiftData(context: ModelContext) {
        guard let bill else { return }
        try? PersistenceService.saveBill(
            bill,
            items: items,
            people: people,
            shares: shares,
            into: context
        )
    }

    // MARK: - API: Create

    /// Creates a receipt on the server from OCR output and loads it into state.
    @MainActor
    func createBillFromScan(_ scanResult: ScanResult, userId: String?) async {
        isLoading = true
        error = nil
        do {
            let response = try await api.createBill(
                CreateBillRequest(
                    place: scanResult.place,
                    items: scanResult.createBillItems,
                    subtotal: scanResult.subtotal,
                    tax: scanResult.tax,
                    tip: scanResult.tip,
                    discount: nil,
                    serviceFee: nil,
                    userId: userId
                )
            )
            let mapped = ReceiptMapper.mapCreateResponse(
                response,
                scanResult: scanResult,
                titleFallback: "Scanned receipt"
            )
            bill = mapped.bill
            items = mapped.items
            people = []
            shares = []
            sessionToken = mapped.bill.editorToken
            isReadOnly = false
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    /// Creates a minimal server-backed bill for manual entry (one placeholder line).
    @MainActor
    func createManualBill(userId: String?) async {
        isLoading = true
        error = nil
        let placeholder = CreateBillItem(name: "New item", price: 0, emoji: "📦", quantity: 1)
        do {
            let response = try await api.createBill(
                CreateBillRequest(
                    place: nil,
                    items: [placeholder],
                    subtotal: 0,
                    tax: 0,
                    tip: 0,
                    discount: 0,
                    serviceFee: 0,
                    userId: userId
                )
            )
            let mapped = ReceiptMapper.mapCreateResponse(
                response,
                scanResult: nil,
                titleFallback: "New Bill"
            )
            bill = mapped.bill
            items = mapped.items
            people = []
            shares = []
            sessionToken = mapped.bill.editorToken
            isReadOnly = false
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    // MARK: - Mutations (local)

    func addItem(_ item: BillItem) {
        items.append(item)
    }

    func updateItem(_ item: BillItem) {
        if let index = items.firstIndex(where: { $0.id == item.id }) {
            items[index] = item
        }
    }

    func deleteItem(itemId: String) {
        items.removeAll { $0.id == itemId }
        shares.removeAll { $0.itemId == itemId }
    }

    func addPerson(name: String) {
        guard let billId = bill?.id else { return }
        people.append(
            BillPerson(
                id: UUID().uuidString,
                billId: billId,
                name: name,
                avatarUrl: nil,
                venmoHandle: nil,
                isArchived: false,
                personalCredit: 0,
                creditNote: nil
            )
        )
    }

    func deletePerson(personId: String) {
        let affected = Set(shares.filter { $0.personId == personId }.map(\.itemId))
        people.removeAll { $0.id == personId }
        shares.removeAll { $0.personId == personId }
        for itemId in affected {
            recalculateWeights(for: itemId)
        }
    }

    func setPersonalCredit(personId: String, amount: Decimal, note: String?) {
        guard let idx = people.firstIndex(where: { $0.id == personId }) else { return }
        people[idx].personalCredit = max(0, amount)
        people[idx].creditNote = note
    }

    func assignItem(itemId: String, to personId: String) {
        if let existingIndex = shares.firstIndex(where: { $0.itemId == itemId && $0.personId == personId }) {
            shares.remove(at: existingIndex)
        } else {
            shares.append(BillItemShare(itemId: itemId, personId: personId, weight: 1))
        }
        recalculateWeights(for: itemId)
    }

    func updateWeight(itemId: String, personId: String, weight: Decimal) {
        guard weight > 0 else { return }
        if let index = shares.firstIndex(where: { $0.itemId == itemId && $0.personId == personId }) {
            shares[index].weight = weight
        }
    }

    // MARK: - Save

    @MainActor
    func saveBill() async {
        guard let bill else {
            error = "No bill loaded"
            return
        }
        guard let token = sessionToken else {
            error = "Not synced yet"
            return
        }
        guard !isReadOnly else {
            error = "View-only link cannot save changes"
            return
        }
        guard let editor = ReceiptMapper.editorTokenForWrites(bill: bill, sessionToken: token) else {
            error = "Editor token required to save"
            return
        }

        isLoading = true
        error = nil

        do {
            _ = try await api.updateBill(
                token: editor,
                BillUpdateRequest(
                    place: bill.place,
                    title: bill.title,
                    subtotal: bill.subtotal,
                    salesTax: bill.tax,
                    tip: bill.tip,
                    discount: bill.discount,
                    serviceFee: bill.serviceFee
                )
            )

            let assignPeople = people.map {
                AssignPerson(
                    id: $0.id,
                    name: $0.name,
                    avatarUrl: $0.avatarUrl,
                    venmoHandle: $0.venmoHandle
                )
            }
            let assignShares: [ItemShareData] = shares.map { share in
                ItemShareData(
                    itemId: share.itemId,
                    personId: share.personId,
                    weight: Self.apiWeight(from: share.weight)
                )
            }
            if !people.isEmpty {
                _ = try await api.updateAssignments(
                    token: editor,
                    people: assignPeople,
                    shares: assignShares
                )
            }
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    /// Deletes the receipt on the server (requires editor token).
    @MainActor
    func deleteRemoteBill() async throws {
        guard let bill, let token = sessionToken else { return }
        guard let editor = ReceiptMapper.editorTokenForWrites(bill: bill, sessionToken: token) else {
            throw BillStoreError.needsEditorToken
        }
        _ = try await api.deleteBill(token: editor)
    }

    func resetSession() {
        bill = nil
        items = []
        people = []
        shares = []
        sessionToken = nil
        isReadOnly = false
        error = nil
    }

    // MARK: - Private

    private func recalculateWeights(for itemId: String) {
        let indices = shares.indices.filter { shares[$0].itemId == itemId }
        let count = indices.count
        guard count > 0 else { return }
        let equalWeight = Decimal(1) / Decimal(count)
        for i in indices {
            shares[i].weight = equalWeight
        }
    }

    private static func apiWeight(from decimal: Decimal) -> Int {
        var times100 = decimal * 100
        var rounded = Decimal()
        NSDecimalRound(&rounded, &times100, 0, .plain)
        let v = Int(NSDecimalNumber(decimal: rounded).doubleValue)
        return max(1, min(100, v))
    }
}

enum BillStoreError: LocalizedError {
    case needsEditorToken

    var errorDescription: String? {
        switch self {
        case .needsEditorToken:
            return "Editor access is required for this action."
        }
    }
}
