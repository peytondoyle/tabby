import Foundation

// MARK: - API Error Types

/// Errors that can occur during API operations
public enum APIError: Error, LocalizedError, Equatable {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int, message: String?)
    case decodingError(String)
    case encodingError(String)
    case networkError(String)
    case noData
    case unauthorized
    case notFound
    case rateLimited
    case serverError(String)

    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let statusCode, let message):
            return message ?? "HTTP error \(statusCode)"
        case .decodingError(let details):
            return "Failed to decode response: \(details)"
        case .encodingError(let details):
            return "Failed to encode request: \(details)"
        case .networkError(let details):
            return "Network error: \(details)"
        case .noData:
            return "No data received"
        case .unauthorized:
            return "Unauthorized access"
        case .notFound:
            return "Resource not found"
        case .rateLimited:
            return "Rate limit exceeded. Please try again later."
        case .serverError(let message):
            return "Server error: \(message)"
        }
    }

    public static func == (lhs: APIError, rhs: APIError) -> Bool {
        switch (lhs, rhs) {
        case (.invalidURL, .invalidURL),
             (.invalidResponse, .invalidResponse),
             (.noData, .noData),
             (.unauthorized, .unauthorized),
             (.notFound, .notFound),
             (.rateLimited, .rateLimited):
            return true
        case let (.httpError(lCode, lMsg), .httpError(rCode, rMsg)):
            return lCode == rCode && lMsg == rMsg
        case let (.decodingError(lDetails), .decodingError(rDetails)):
            return lDetails == rDetails
        case let (.encodingError(lDetails), .encodingError(rDetails)):
            return lDetails == rDetails
        case let (.networkError(lDetails), .networkError(rDetails)):
            return lDetails == rDetails
        case let (.serverError(lMsg), .serverError(rMsg)):
            return lMsg == rMsg
        default:
            return false
        }
    }
}

// MARK: - OCR/Scan Types

/// Result from scanning a receipt via OCR
public struct ScanResult: Codable, Equatable {
    public let items: [ScannedItem]
    public let total: Decimal?
    public let subtotal: Decimal?
    public let tax: Decimal?
    public let tip: Decimal?
    public let place: String?
    public let date: String?
    public let validation: ValidationResult?
    public let confidence: Double?

    enum CodingKeys: String, CodingKey {
        case items
        case total
        case subtotal
        case tax
        case tip
        case place
        case date
        case validation
        case confidence
    }

    public init(
        items: [ScannedItem],
        total: Decimal? = nil,
        subtotal: Decimal? = nil,
        tax: Decimal? = nil,
        tip: Decimal? = nil,
        place: String? = nil,
        date: String? = nil,
        validation: ValidationResult? = nil,
        confidence: Double? = nil
    ) {
        self.items = items
        self.total = total
        self.subtotal = subtotal
        self.tax = tax
        self.tip = tip
        self.place = place
        self.date = date
        self.validation = validation
        self.confidence = confidence
    }
}

/// A single item from OCR scanning
public struct ScannedItem: Codable, Equatable, Identifiable {
    public var id: String { label + String(describing: price) }
    public let label: String
    public let price: Decimal
    public let emoji: String?
    public let quantity: Int?

    public init(
        label: String,
        price: Decimal,
        emoji: String? = nil,
        quantity: Int? = 1
    ) {
        self.label = label
        self.price = price
        self.emoji = emoji
        self.quantity = quantity
    }
}

/// Validation result from OCR
public struct ValidationResult: Codable, Equatable {
    public let isValid: Bool
    public let warnings: [String]?
    public let errors: [String]?

    enum CodingKeys: String, CodingKey {
        case isValid = "is_valid"
        case warnings
        case errors
    }

    public init(isValid: Bool, warnings: [String]? = nil, errors: [String]? = nil) {
        self.isValid = isValid
        self.warnings = warnings
        self.errors = errors
    }
}

// MARK: - API Request Types

/// Request to create a new bill
public struct CreateBillRequest: Encodable {
    public let place: String?
    public let items: [CreateBillItem]
    public let subtotal: Decimal?
    public let tax: Decimal?
    public let tip: Decimal?
    public let discount: Decimal?
    public let serviceFee: Decimal?

    enum CodingKeys: String, CodingKey {
        case place
        case items
        case subtotal
        case tax
        case tip
        case discount
        case serviceFee = "service_fee"
    }

    public init(
        place: String? = nil,
        items: [CreateBillItem],
        subtotal: Decimal? = nil,
        tax: Decimal? = nil,
        tip: Decimal? = nil,
        discount: Decimal? = nil,
        serviceFee: Decimal? = nil
    ) {
        self.place = place
        self.items = items
        self.subtotal = subtotal
        self.tax = tax
        self.tip = tip
        self.discount = discount
        self.serviceFee = serviceFee
    }
}

/// Item for creating a bill
public struct CreateBillItem: Encodable {
    public let label: String
    public let price: Decimal
    public let emoji: String?
    public let quantity: Int

    public init(label: String, price: Decimal, emoji: String? = nil, quantity: Int = 1) {
        self.label = label
        self.price = price
        self.emoji = emoji
        self.quantity = quantity
    }
}

/// Response from creating a bill
public struct CreateBillResponse: Decodable {
    public let receipt: ReceiptInfo
    public let items: [ReceiptItemInfo]
}

/// Receipt info returned from API
public struct ReceiptInfo: Decodable {
    public let id: String
    public let token: String?
    public let editorToken: String?
    public let viewerToken: String?

    enum CodingKeys: String, CodingKey {
        case id
        case token
        case editorToken = "editor_token"
        case viewerToken = "viewer_token"
    }
}

/// Receipt item info from API
public struct ReceiptItemInfo: Decodable {
    public let id: String
    public let label: String
    public let price: Decimal
    public let emoji: String?
}

// MARK: - Bill Response Types

/// Response from fetching a bill
public struct BillResponse: Decodable {
    public let bill: BillData?
    public let receipt: BillData?
    public let items: [BillItemData]
    public let people: [PersonData]
    public let shares: [ItemShareData]

    /// Get the bill data (handles both 'bill' and 'receipt' keys)
    public var billData: BillData? {
        bill ?? receipt
    }
}

/// Bill data from API
public struct BillData: Codable, Identifiable, Equatable {
    public let id: String
    public let token: String?
    public let editorToken: String?
    public let viewerToken: String?
    public let title: String?
    public let place: String?
    public let date: String?
    public let subtotal: Decimal?
    public let salesTax: Decimal?
    public let tip: Decimal?
    public let discount: Decimal?
    public let serviceFee: Decimal?

    enum CodingKeys: String, CodingKey {
        case id, token, title, place, date, subtotal, tip, discount
        case editorToken = "editor_token"
        case viewerToken = "viewer_token"
        case salesTax = "sales_tax"
        case serviceFee = "service_fee"
    }
}

/// Item data from API
public struct BillItemData: Codable, Identifiable, Equatable {
    public let id: String
    public let label: String
    public let price: Decimal
    public let emoji: String?
    public let quantity: Int?
}

/// Person data from API
public struct PersonData: Codable, Identifiable, Equatable {
    public let id: String
    public let name: String
    public let avatarUrl: String?
    public let venmoHandle: String?

    enum CodingKeys: String, CodingKey {
        case id, name
        case avatarUrl = "avatar_url"
        case venmoHandle = "venmo_handle"
    }
}

/// Item share data from API
public struct ItemShareData: Codable, Equatable {
    public let itemId: String
    public let personId: String
    public let weight: Int

    enum CodingKeys: String, CodingKey {
        case itemId = "item_id"
        case personId = "person_id"
        case weight
    }
}

// MARK: - Bill Update Types

/// Request to update a bill
public struct BillUpdateRequest: Encodable {
    public let place: String?
    public let title: String?
    public let subtotal: Decimal?
    public let salesTax: Decimal?
    public let tip: Decimal?
    public let discount: Decimal?
    public let serviceFee: Decimal?

    enum CodingKeys: String, CodingKey {
        case place, title, subtotal, tip, discount
        case salesTax = "sales_tax"
        case serviceFee = "service_fee"
    }

    public init(
        place: String? = nil,
        title: String? = nil,
        subtotal: Decimal? = nil,
        salesTax: Decimal? = nil,
        tip: Decimal? = nil,
        discount: Decimal? = nil,
        serviceFee: Decimal? = nil
    ) {
        self.place = place
        self.title = title
        self.subtotal = subtotal
        self.salesTax = salesTax
        self.tip = tip
        self.discount = discount
        self.serviceFee = serviceFee
    }
}

/// Response from updating a bill
public struct BillUpdateResponse: Decodable {
    public let bill: BillData?
    public let receipt: BillData?

    public var billData: BillData? {
        bill ?? receipt
    }
}

// MARK: - Assignment Types

/// Person for assignment requests
public struct AssignPerson: Codable, Identifiable, Equatable {
    public let id: String
    public let name: String
    public let avatarUrl: String?
    public let venmoHandle: String?

    enum CodingKeys: String, CodingKey {
        case id, name
        case avatarUrl = "avatar_url"
        case venmoHandle = "venmo_handle"
    }

    public init(id: String, name: String, avatarUrl: String? = nil, venmoHandle: String? = nil) {
        self.id = id
        self.name = name
        self.avatarUrl = avatarUrl
        self.venmoHandle = venmoHandle
    }
}

/// Request to update assignments
public struct AssignRequest: Encodable {
    public let people: [AssignPerson]
    public let shares: [ItemShareData]

    public init(people: [AssignPerson], shares: [ItemShareData]) {
        self.people = people
        self.shares = shares
    }
}

/// Response from updating assignments
public struct AssignResponse: Decodable {
    public let people: [PersonData]
    public let shares: [ItemShareData]
}

// MARK: - Delete Types

/// Response from deleting a bill
public struct DeleteBillResponse: Decodable {
    public let ok: Bool
    public let message: String?
}

// MARK: - Create Bill Extended Types

/// Person for creating a bill
public struct CreateBillPerson: Encodable {
    public let name: String
    public let avatarUrl: String?
    public let venmoHandle: String?

    enum CodingKeys: String, CodingKey {
        case name
        case avatarUrl = "avatar_url"
        case venmoHandle = "venmo_handle"
    }

    public init(name: String, avatarUrl: String? = nil, venmoHandle: String? = nil) {
        self.name = name
        self.avatarUrl = avatarUrl
        self.venmoHandle = venmoHandle
    }
}

// MARK: - Extensions for ScanResult

extension ScanResult {
    /// Convert scanned items to CreateBillItem format
    public var createBillItems: [CreateBillItem] {
        items.map { item in
            CreateBillItem(
                label: item.label,
                price: item.price,
                emoji: item.emoji,
                quantity: item.quantity ?? 1
            )
        }
    }

    /// Calculate subtotal from items
    public var calculatedSubtotal: Decimal {
        items.reduce(Decimal.zero) { sum, item in
            let qty = Decimal(item.quantity ?? 1)
            return sum + (item.price * qty)
        }
    }

    /// Calculate total including tax and tip
    public var calculatedTotal: Decimal {
        calculatedSubtotal + (tax ?? 0) + (tip ?? 0) - (subtotal.map { calculatedSubtotal - $0 } ?? 0)
    }

    /// Check if scan has high confidence
    public var isHighConfidence: Bool {
        (confidence ?? 0) >= 0.8
    }

    /// Check if there are any validation warnings
    public var hasWarnings: Bool {
        validation?.warnings?.isEmpty == false
    }
}
