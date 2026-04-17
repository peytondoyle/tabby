import Foundation

/// Main bill/receipt model representing a shared expense
struct Bill: Identifiable, Codable, Equatable {
    let id: String
    var title: String
    var place: String?
    var date: Date?
    var subtotal: Decimal
    var tax: Decimal
    var tip: Decimal
    var discount: Decimal
    var serviceFee: Decimal
    var editorToken: String?
    var viewerToken: String?
    var receiptImagePath: String?
    let createdAt: Date
    var updatedAt: Date

    /// Computed grand total: subtotal - discount + serviceFee + tax + tip
    var grandTotal: Decimal {
        subtotal - discount + serviceFee + tax + tip
    }

    init(
        id: String = UUID().uuidString,
        title: String,
        place: String? = nil,
        date: Date? = nil,
        subtotal: Decimal = 0,
        tax: Decimal = 0,
        tip: Decimal = 0,
        discount: Decimal = 0,
        serviceFee: Decimal = 0,
        editorToken: String? = nil,
        viewerToken: String? = nil,
        receiptImagePath: String? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.title = title
        self.place = place
        self.date = date
        self.subtotal = subtotal
        self.tax = tax
        self.tip = tip
        self.discount = discount
        self.serviceFee = serviceFee
        self.editorToken = editorToken
        self.viewerToken = viewerToken
        self.receiptImagePath = receiptImagePath
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case place
        case date
        case subtotal
        case tax
        case tip
        case discount
        case serviceFee = "service_fee"
        case editorToken = "editor_token"
        case viewerToken = "viewer_token"
        case receiptImagePath = "receipt_image_path"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
