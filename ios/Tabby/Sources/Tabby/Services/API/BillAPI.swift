import Foundation

/// API client for bill/receipt-related operations
public struct BillAPI {

    /// Shared API client
    private let client: APIClient

    /// Creates a new BillAPI instance
    /// - Parameter client: APIClient to use (defaults to shared instance)
    public init(client: APIClient = .shared) {
        self.client = client
    }

    // MARK: - Fetch Bill

    /// Fetches a bill by its token (editor or viewer)
    /// - Parameter token: The editor_token or viewer_token for the bill
    /// - Returns: BillResponse containing bill details, items, people, and shares
    /// - Throws: APIError if the request fails
    public func fetchBill(token: String) async throws -> BillResponse {
        return try await client.get("receipts/\(token)")
    }

    // MARK: - Create Bill

    /// Creates a new bill
    /// - Parameter request: CreateBillRequest with bill details
    /// - Returns: CreateBillResponse with the created bill and items
    /// - Throws: APIError if the request fails
    public func createBill(_ request: CreateBillRequest) async throws -> CreateBillResponse {
        return try await client.post("receipts/create", body: request)
    }

    /// Creates a new bill from scanned receipt data
    /// - Parameters:
    ///   - scanResult: The scan result from OCR
    ///   - people: Optional array of people to assign items to
    /// - Returns: CreateBillResponse with the created bill
    /// - Throws: APIError if the request fails
    public func createBillFromScan(
        _ scanResult: ScanResult,
        people: [CreateBillPerson] = []
    ) async throws -> CreateBillResponse {
        let request = CreateBillRequest(
            place: scanResult.place,
            items: scanResult.createBillItems,
            subtotal: scanResult.subtotal,
            tax: scanResult.tax,
            tip: scanResult.tip,
            discount: nil,
            serviceFee: nil
        )

        return try await createBill(request)
    }

    // MARK: - Update Bill

    /// Updates a bill's metadata
    /// - Parameters:
    ///   - token: The editor_token for the bill
    ///   - request: BillUpdateRequest with fields to update
    /// - Returns: BillUpdateResponse with the updated bill
    /// - Throws: APIError if the request fails
    public func updateBill(token: String, _ request: BillUpdateRequest) async throws -> BillUpdateResponse {
        return try await client.put("receipts/\(token)/update", body: request)
    }

    /// Updates the place/restaurant name for a bill
    public func updatePlace(token: String, place: String) async throws -> BillUpdateResponse {
        let request = BillUpdateRequest(place: place)
        return try await updateBill(token: token, request)
    }

    /// Updates the tip amount for a bill
    public func updateTip(token: String, tip: Decimal) async throws -> BillUpdateResponse {
        let request = BillUpdateRequest(tip: tip)
        return try await updateBill(token: token, request)
    }

    /// Updates the tax amount for a bill
    public func updateTax(token: String, tax: Decimal) async throws -> BillUpdateResponse {
        let request = BillUpdateRequest(salesTax: tax)
        return try await updateBill(token: token, request)
    }

    // MARK: - Update Assignments

    /// Updates both people and item assignments for a bill
    public func updateAssignments(
        token: String,
        people: [AssignPerson],
        shares: [ItemShareData]
    ) async throws -> AssignResponse {
        let request = AssignRequest(people: people, shares: shares)
        return try await client.post("receipts/\(token)/assign", body: request)
    }

    /// Assigns an item to a person
    public func assignItem(
        token: String,
        itemId: String,
        personId: String,
        weight: Int = 1,
        existingPeople: [AssignPerson],
        existingShares: [ItemShareData]
    ) async throws -> AssignResponse {
        let newShare = ItemShareData(itemId: itemId, personId: personId, weight: weight)

        var updatedShares = existingShares.filter { share in
            !(share.itemId == itemId && share.personId == personId)
        }
        updatedShares.append(newShare)

        return try await updateAssignments(
            token: token,
            people: existingPeople,
            shares: updatedShares
        )
    }

    /// Removes an item assignment from a person
    public func unassignItem(
        token: String,
        itemId: String,
        personId: String,
        existingPeople: [AssignPerson],
        existingShares: [ItemShareData]
    ) async throws -> AssignResponse {
        let updatedShares = existingShares.filter { share in
            !(share.itemId == itemId && share.personId == personId)
        }

        return try await updateAssignments(
            token: token,
            people: existingPeople,
            shares: updatedShares
        )
    }

    // MARK: - Delete Bill

    /// Deletes a bill
    public func deleteBill(token: String) async throws -> DeleteBillResponse {
        return try await client.delete(
            "receipts/delete",
            queryItems: [URLQueryItem(name: "token", value: token)]
        )
    }

    // MARK: - Convenience Methods

    /// Checks if a token is an editor token (has edit permissions)
    public func isEditorToken(_ token: String) -> Bool {
        return token.hasPrefix("e_")
    }

    /// Checks if a token is a viewer token (read-only)
    public func isViewerToken(_ token: String) -> Bool {
        return token.hasPrefix("v_")
    }

    /// Generates a shareable viewer URL for a bill
    public func shareableURL(
        viewerToken: String,
        baseWebURL: String = "https://tabby.vercel.app"
    ) -> URL? {
        return URL(string: "\(baseWebURL)/split/\(viewerToken)")
    }
}

// MARK: - Shared Instance

extension BillAPI {
    /// Shared instance using the default API client
    public static let shared = BillAPI()
}

