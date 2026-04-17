import Foundation
#if canImport(UIKit)
import UIKit
#endif

/// API client for OCR/receipt scanning operations
public struct OCRAPI {

    /// Shared API client
    private let client: APIClient

    /// Creates a new OCRAPI instance
    /// - Parameter client: APIClient to use (defaults to shared instance)
    public init(client: APIClient = .shared) {
        self.client = client
    }

    // MARK: - Scan Receipt

    /// Scans a receipt image using OCR
    /// - Parameter imageData: JPEG or PNG image data of the receipt
    /// - Returns: ScanResult containing extracted items, totals, and metadata
    /// - Throws: APIError if the request fails
    public func scanReceipt(imageData: Data) async throws -> ScanResult {
        // Determine MIME type from image data
        let mimeType = detectMimeType(from: imageData)

        // Generate filename based on mime type
        let filename: String
        switch mimeType {
        case "image/png":
            filename = "receipt.png"
        case "image/heic":
            filename = "receipt.heic"
        default:
            filename = "receipt.jpg"
        }

        return try await client.uploadMultipart(
            "scan-receipt",
            fileData: imageData,
            fileName: filename,
            mimeType: mimeType
        )
    }

    #if canImport(UIKit)
    /// Scans a receipt from a UIImage
    /// - Parameters:
    ///   - image: UIImage of the receipt
    ///   - compressionQuality: JPEG compression quality (0.0 to 1.0, default 0.8)
    /// - Returns: ScanResult containing extracted items, totals, and metadata
    /// - Throws: APIError if the image cannot be converted to data
    public func scanReceipt(
        image: UIImage,
        compressionQuality: CGFloat = 0.8
    ) async throws -> ScanResult {
        guard let imageData = image.jpegData(compressionQuality: compressionQuality) else {
            throw APIError.encodingError("Failed to convert image to JPEG data")
        }

        return try await scanReceipt(imageData: imageData)
    }

    /// Scans a receipt from a UIImage, automatically optimizing for OCR
    /// - Parameter image: UIImage of the receipt
    /// - Returns: ScanResult containing extracted items, totals, and metadata
    /// - Throws: APIError if the image cannot be processed
    public func scanReceiptOptimized(image: UIImage) async throws -> ScanResult {
        // Optimize image for OCR
        let optimizedImage = optimizeForOCR(image)

        // Use higher compression quality for optimized images
        guard let imageData = optimizedImage.jpegData(compressionQuality: 0.9) else {
            throw APIError.encodingError("Failed to convert optimized image to JPEG data")
        }

        return try await scanReceipt(imageData: imageData)
    }

    /// Optimizes an image for OCR processing
    /// - Parameter image: Original image
    /// - Returns: Optimized image
    private func optimizeForOCR(_ image: UIImage) -> UIImage {
        // Target max dimension for good OCR results without huge file size
        let maxDimension: CGFloat = 2000

        let size = image.size
        let scale = min(maxDimension / max(size.width, size.height), 1.0)

        if scale >= 1.0 {
            // Image is already small enough
            return image
        }

        let newSize = CGSize(
            width: size.width * scale,
            height: size.height * scale
        )

        // Render at new size
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
    }
    #endif

    // MARK: - Health Check

    /// Checks if the OCR service is available
    /// - Returns: True if the service is healthy
    public func checkHealth() async -> Bool {
        do {
            let response: HealthResponse = try await client.get(
                "scan-receipt",
                queryItems: [URLQueryItem(name: "health", value: "1")]
            )
            return response.ok
        } catch {
            return false
        }
    }

    // MARK: - Helper Methods

    /// Detects the MIME type from image data by checking magic bytes
    /// - Parameter data: Image data
    /// - Returns: MIME type string
    private func detectMimeType(from data: Data) -> String {
        guard data.count >= 12 else { return "image/jpeg" }

        let bytes = [UInt8](data.prefix(12))

        // PNG: 89 50 4E 47
        if bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47 {
            return "image/png"
        }

        // JPEG: FF D8 FF
        if bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF {
            return "image/jpeg"
        }

        // WebP: 52 49 46 46 ... 57 45 42 50
        if bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 &&
           bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50 {
            return "image/webp"
        }

        // HEIC/HEIF: Check for ftyp box with heic/mif1
        if data.count >= 12 {
            let ftypStart = data.index(data.startIndex, offsetBy: 4)
            let ftypEnd = data.index(ftypStart, offsetBy: 4)
            if let ftyp = String(data: data[ftypStart..<ftypEnd], encoding: .ascii) {
                if ftyp == "ftyp" || ftyp == "heic" || ftyp == "mif1" || ftyp == "msf1" {
                    return "image/heic"
                }
            }
        }

        // Default to JPEG
        return "image/jpeg"
    }
}

// MARK: - Health Response

/// Response from health check endpoint
private struct HealthResponse: Decodable {
    let ok: Bool
    let uptimeMs: Int?

    enum CodingKeys: String, CodingKey {
        case ok
        case uptimeMs
    }
}

// MARK: - Shared Instance

extension OCRAPI {
    /// Shared instance using the default API client
    public static let shared = OCRAPI()
}

