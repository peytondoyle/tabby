import Foundation

// MARK: - BillAPI Protocol

/// Protocol for bill API operations, allowing for dependency injection and testing
protocol BillAPIProtocol: Sendable {
    func fetchBill(token: String) async throws -> BillAPIResponse
    func updateBill(
        token: String,
        bill: Bill,
        items: [BillItem],
        people: [BillPerson],
        shares: [BillItemShare]
    ) async throws
}

/// Response structure from fetching a bill
struct BillAPIResponse {
    let bill: Bill
    let items: [BillItem]
    let people: [BillPerson]
    let shares: [BillItemShare]
}

// MARK: - BillAPI

/// Default implementation of BillAPIProtocol for network operations
final class BillAPIClient: BillAPIProtocol, @unchecked Sendable {
    private let baseURL: URL
    private let session: URLSession

    init(baseURL: URL = URL(string: "https://tabby.vercel.app")!, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    func fetchBill(token: String) async throws -> BillAPIResponse {
        let url = baseURL.appendingPathComponent("api/receipts/\(token)")
        let (data, response) = try await session.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw BillAPIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw BillAPIError.httpError(statusCode: httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let apiResponse = try decoder.decode(APIBillResponse.self, from: data)

        guard let bill = apiResponse.bill ?? apiResponse.receipt else {
            throw BillAPIError.missingData("bill")
        }

        return BillAPIResponse(
            bill: bill,
            items: apiResponse.items,
            people: apiResponse.people,
            shares: apiResponse.shares
        )
    }

    func updateBill(
        token: String,
        bill: Bill,
        items: [BillItem],
        people: [BillPerson],
        shares: [BillItemShare]
    ) async throws {
        // Update metadata
        let metadataURL = baseURL.appendingPathComponent("api/receipts/\(token)/update")
        var metadataRequest = URLRequest(url: metadataURL)
        metadataRequest.httpMethod = "PUT"
        metadataRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let metadataPayload = BillMetadataUpdate(
            place: bill.place,
            title: bill.title,
            subtotal: bill.subtotal,
            salesTax: bill.tax,
            tip: bill.tip
        )

        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        metadataRequest.httpBody = try encoder.encode(metadataPayload)

        let (_, metadataResponse) = try await session.data(for: metadataRequest)
        guard let metadataHttpResponse = metadataResponse as? HTTPURLResponse,
              metadataHttpResponse.statusCode == 200 else {
            throw BillAPIError.updateFailed("metadata")
        }

        // Update assignments
        let assignURL = baseURL.appendingPathComponent("api/receipts/\(token)/assign")
        var assignRequest = URLRequest(url: assignURL)
        assignRequest.httpMethod = "POST"
        assignRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let assignPayload = AssignmentsUpdate(
            people: people.map { person in
                AssignmentsPerson(
                    id: person.id,
                    name: person.name,
                    avatarUrl: person.avatarUrl,
                    venmoHandle: person.venmoHandle
                )
            },
            shares: shares.map { share in
                AssignmentsShare(
                    itemId: share.itemId,
                    personId: share.personId,
                    weight: share.weight
                )
            }
        )

        assignRequest.httpBody = try encoder.encode(assignPayload)

        let (_, assignResponse) = try await session.data(for: assignRequest)
        guard let assignHttpResponse = assignResponse as? HTTPURLResponse,
              assignHttpResponse.statusCode == 200 else {
            throw BillAPIError.updateFailed("assignments")
        }
    }
}

// MARK: - API Response Types

private struct APIBillResponse: Decodable {
    let bill: Bill?
    let receipt: Bill?
    let items: [BillItem]
    let people: [BillPerson]
    let shares: [BillItemShare]
}

private struct BillMetadataUpdate: Encodable {
    let place: String?
    let title: String?
    let subtotal: Decimal?
    let salesTax: Decimal?
    let tip: Decimal?
}

private struct AssignmentsUpdate: Encodable {
    let people: [AssignmentsPerson]
    let shares: [AssignmentsShare]
}

private struct AssignmentsPerson: Encodable {
    let id: String
    let name: String
    let avatarUrl: String?
    let venmoHandle: String?
}

private struct AssignmentsShare: Encodable {
    let itemId: String
    let personId: String
    let weight: Decimal
}

// MARK: - API Errors

enum BillAPIError: Error, LocalizedError {
    case invalidResponse
    case httpError(statusCode: Int)
    case missingData(String)
    case updateFailed(String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let statusCode):
            return "HTTP error: \(statusCode)"
        case .missingData(let field):
            return "Missing required data: \(field)"
        case .updateFailed(let operation):
            return "Failed to update \(operation)"
        }
    }
}

// MARK: - BillViewModel

/// Main ViewModel for managing bill state and calculations in the Tabby iOS app.
/// Uses iOS 17+ @Observable macro for reactive state management.
@Observable
final class BillViewModel {

    // MARK: - State Properties

    /// The current bill being edited/viewed
    var bill: Bill?

    /// All items on the bill
    var items: [BillItem] = []

    /// All people splitting the bill
    var people: [BillPerson] = []

    /// Item share assignments (who pays what portion of each item)
    var shares: [BillItemShare] = []

    /// Loading state for async operations
    var isLoading: Bool = false

    /// Error message if an operation fails
    var error: String?

    // MARK: - Private Properties

    /// The API client for network operations
    private let api: BillAPIProtocol

    /// The current bill token for API calls
    private var currentToken: String?

    // MARK: - Initialization

    init(api: BillAPIProtocol = BillAPIClient()) {
        self.api = api
    }

    // MARK: - Computed Properties

    /// Computed bill totals using BillCalculator
    /// Returns nil if bill is not loaded
    var billTotals: BillTotals? {
        guard let bill = bill else { return nil }

        // Convert Model types to Calculator types
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
                isPaid: person.isArchived
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
            taxMode: .proportional,
            tipMode: .proportional,
            includeZeroPeople: true
        )
    }

    // MARK: - Helper Methods

    /// Get the total amount a person owes
    /// - Parameter personId: The ID of the person
    /// - Returns: The person's total as a Decimal, or 0 if not found
    func getPersonTotal(personId: String) -> Decimal {
        guard let totals = billTotals else { return 0 }
        return totals.personTotals.first { $0.personId == personId }?.total ?? 0
    }

    /// Get the full breakdown for a person's share of the bill
    /// - Parameter personId: The ID of the person
    /// - Returns: The PersonTotal breakdown, or nil if not found
    func getPersonBreakdown(personId: String) -> PersonTotal? {
        guard let totals = billTotals else { return nil }
        return totals.personTotals.first { $0.personId == personId }
    }

    /// Check if an item is assigned to a specific person
    /// - Parameters:
    ///   - itemId: The ID of the item
    ///   - personId: The ID of the person
    /// - Returns: True if the item is assigned to the person
    func isItemAssignedTo(itemId: String, personId: String) -> Bool {
        return shares.contains { share in
            share.itemId == itemId && share.personId == personId && share.weight > 0
        }
    }

    // MARK: - Actions

    /// Load a bill by its token
    /// - Parameter token: The bill's editor or viewer token
    @MainActor
    func loadBill(token: String) async {
        isLoading = true
        error = nil
        currentToken = token

        do {
            let response = try await api.fetchBill(token: token)
            self.bill = response.bill
            self.items = response.items
            self.people = response.people
            self.shares = response.shares
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    /// Add a new item to the bill
    /// - Parameter item: The item to add
    func addItem(_ item: BillItem) {
        items.append(item)
    }

    /// Update an existing item
    /// - Parameter item: The updated item (matched by ID)
    func updateItem(_ item: BillItem) {
        if let index = items.firstIndex(where: { $0.id == item.id }) {
            items[index] = item
        }
    }

    /// Delete an item from the bill
    /// - Parameter itemId: The ID of the item to delete
    func deleteItem(itemId: String) {
        items.removeAll { $0.id == itemId }
        // Also remove any shares for this item
        shares.removeAll { $0.itemId == itemId }
    }

    /// Add a new person to the bill
    /// - Parameter name: The person's name
    func addPerson(name: String) {
        guard let billId = bill?.id else { return }

        let person = BillPerson(
            id: UUID().uuidString,
            billId: billId,
            name: name,
            avatarUrl: nil,
            venmoHandle: nil,
            isArchived: false
        )
        people.append(person)
    }

    /// Delete a person from the bill
    /// - Parameter personId: The ID of the person to delete
    func deletePerson(personId: String) {
        // First, find affected items before removing the person's shares
        let affectedItemIds = Set(shares.filter { $0.personId == personId }.map { $0.itemId })

        // Remove the person
        people.removeAll { $0.id == personId }

        // Remove any shares for this person
        shares.removeAll { $0.personId == personId }

        // Recalculate weights for items that were assigned to this person
        for itemId in affectedItemIds {
            recalculateWeights(for: itemId)
        }
    }

    /// Toggle assignment of an item to a person
    /// If already assigned, removes the assignment. Otherwise, adds it.
    /// - Parameters:
    ///   - itemId: The ID of the item
    ///   - personId: The ID of the person
    func assignItem(itemId: String, to personId: String) {
        if let existingIndex = shares.firstIndex(where: { $0.itemId == itemId && $0.personId == personId }) {
            // Remove existing assignment
            shares.remove(at: existingIndex)
        } else {
            // Add new assignment with default weight of 1
            let share = BillItemShare(
                itemId: itemId,
                personId: personId,
                weight: 1
            )
            shares.append(share)
        }

        // Recalculate weights for auto-split
        recalculateWeights(for: itemId)
    }

    /// Update the weight for a specific item-person share
    /// - Parameters:
    ///   - itemId: The ID of the item
    ///   - personId: The ID of the person
    ///   - weight: The new weight (must be > 0)
    func updateWeight(itemId: String, personId: String, weight: Decimal) {
        guard weight > 0 else { return }

        if let index = shares.firstIndex(where: { $0.itemId == itemId && $0.personId == personId }) {
            shares[index].weight = weight
        }
    }

    /// Save the current bill state to the server
    @MainActor
    func saveBill() async {
        guard let token = currentToken, let bill = bill else {
            error = "No bill loaded"
            return
        }

        isLoading = true
        error = nil

        do {
            try await api.updateBill(
                token: token,
                bill: bill,
                items: items,
                people: people,
                shares: shares
            )
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Private Helpers

    /// Recalculate weights for an item when people are added/removed
    /// Implements auto-split: evenly divides the item among all assigned people
    /// - Parameter itemId: The ID of the item to recalculate
    private func recalculateWeights(for itemId: String) {
        let itemShareIndices = shares.indices.filter { shares[$0].itemId == itemId }
        let count = itemShareIndices.count

        guard count > 0 else { return }

        // Calculate equal weight for each person
        let equalWeight = Decimal(1) / Decimal(count)

        // Update all shares for this item
        for index in itemShareIndices {
            shares[index].weight = equalWeight
        }
    }
}
