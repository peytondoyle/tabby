import Foundation

/// Main API client for Tabby backend communication
/// Uses actor pattern for thread-safe singleton access
public actor APIClient {

    // MARK: - Singleton

    /// Shared instance of the API client
    public static let shared = APIClient()

    // MARK: - Configuration

    /// Base URL for the API
    public private(set) var baseURL: URL

    /// Default base URL pointing to production
    public static let defaultBaseURL = URL(string: "https://tabby-ashen.vercel.app/api")!

    /// URLSession for making requests
    private let session: URLSession

    /// JSON encoder configured for the API
    private let encoder: JSONEncoder

    /// JSON decoder configured for the API
    private let decoder: JSONDecoder

    /// Auth token provider for authenticated requests
    /// When set, the Authorization header will be added to all requests
    private var authTokenProvider: (() async -> String?)?

    // MARK: - Initialization

    /// Creates a new API client
    /// - Parameters:
    ///   - baseURL: Base URL for API requests (defaults to production)
    ///   - session: URLSession to use (defaults to shared)
    public init(
        baseURL: URL = APIClient.defaultBaseURL,
        session: URLSession = .shared
    ) {
        self.baseURL = baseURL
        self.session = session

        // Configure encoder
        self.encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase

        // Configure decoder
        self.decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
    }

    // MARK: - Configuration Methods

    /// Updates the base URL for API requests
    /// - Parameter url: New base URL
    public func setBaseURL(_ url: URL) {
        self.baseURL = url
    }

    /// Resets the base URL to the default production URL
    public func resetBaseURL() {
        self.baseURL = APIClient.defaultBaseURL
    }

    /// Sets the auth token provider for authenticated requests
    ///
    /// When set, the Authorization header will be added to all requests with the
    /// Bearer token returned by the provider.
    ///
    /// - Parameter provider: An async closure that returns the current auth token, or nil if not authenticated
    ///
    /// Usage:
    /// ```swift
    /// await APIClient.shared.setAuthTokenProvider {
    ///     await AuthService.shared.getAccessToken()
    /// }
    /// ```
    public func setAuthTokenProvider(_ provider: @escaping () async -> String?) {
        self.authTokenProvider = provider
    }

    /// Clears the auth token provider
    ///
    /// Call this when the user signs out to stop sending auth headers.
    public func clearAuthTokenProvider() {
        self.authTokenProvider = nil
    }

    // MARK: - Generic Request Methods

    /// Performs a GET request and decodes the response
    /// - Parameters:
    ///   - path: API path (will be appended to baseURL)
    ///   - queryItems: Optional query parameters
    /// - Returns: Decoded response of type T
    public func get<T: Decodable>(
        _ path: String,
        queryItems: [URLQueryItem]? = nil
    ) async throws -> T {
        let request = try buildRequest(path: path, method: "GET", queryItems: queryItems)
        return try await performRequest(request)
    }

    /// Performs a POST request with a JSON body and decodes the response
    /// - Parameters:
    ///   - path: API path (will be appended to baseURL)
    ///   - body: Encodable body to send as JSON
    ///   - queryItems: Optional query parameters
    /// - Returns: Decoded response of type T
    public func post<T: Decodable, B: Encodable>(
        _ path: String,
        body: B,
        queryItems: [URLQueryItem]? = nil
    ) async throws -> T {
        var request = try buildRequest(path: path, method: "POST", queryItems: queryItems)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            request.httpBody = try encoder.encode(body)
        } catch {
            throw APIError.encodingError(error.localizedDescription)
        }

        return try await performRequest(request)
    }

    /// Performs a PUT request with a JSON body and decodes the response
    /// - Parameters:
    ///   - path: API path (will be appended to baseURL)
    ///   - body: Encodable body to send as JSON
    ///   - queryItems: Optional query parameters
    /// - Returns: Decoded response of type T
    public func put<T: Decodable, B: Encodable>(
        _ path: String,
        body: B,
        queryItems: [URLQueryItem]? = nil
    ) async throws -> T {
        var request = try buildRequest(path: path, method: "PUT", queryItems: queryItems)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            request.httpBody = try encoder.encode(body)
        } catch {
            throw APIError.encodingError(error.localizedDescription)
        }

        return try await performRequest(request)
    }

    /// Performs a DELETE request and decodes the response
    /// - Parameters:
    ///   - path: API path (will be appended to baseURL)
    ///   - queryItems: Optional query parameters
    /// - Returns: Decoded response of type T
    public func delete<T: Decodable>(
        _ path: String,
        queryItems: [URLQueryItem]? = nil
    ) async throws -> T {
        let request = try buildRequest(path: path, method: "DELETE", queryItems: queryItems)
        return try await performRequest(request)
    }

    /// Performs a multipart form upload and decodes the response
    /// - Parameters:
    ///   - path: API path (will be appended to baseURL)
    ///   - fileData: File data to upload
    ///   - fileName: Name of the file
    ///   - mimeType: MIME type of the file
    ///   - fieldName: Form field name for the file (defaults to "file")
    ///   - additionalFields: Additional form fields to include
    /// - Returns: Decoded response of type T
    public func uploadMultipart<T: Decodable>(
        _ path: String,
        fileData: Data,
        fileName: String,
        mimeType: String,
        fieldName: String = "file",
        additionalFields: [String: String]? = nil
    ) async throws -> T {
        var request = try buildRequest(path: path, method: "POST", queryItems: nil)

        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()

        // Add file data
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"\(fieldName)\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n".data(using: .utf8)!)

        // Add additional fields if present
        if let fields = additionalFields {
            for (key, value) in fields {
                body.append("--\(boundary)\r\n".data(using: .utf8)!)
                body.append("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n".data(using: .utf8)!)
                body.append("\(value)\r\n".data(using: .utf8)!)
            }
        }

        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        return try await performRequest(request)
    }

    // MARK: - Private Methods

    /// Builds a URLRequest for the given path and method
    private func buildRequest(
        path: String,
        method: String,
        queryItems: [URLQueryItem]?
    ) throws -> URLRequest {
        var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: true)

        if let queryItems = queryItems, !queryItems.isEmpty {
            components?.queryItems = queryItems
        }

        guard let url = components?.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        // Add standard headers
        request.setValue("Tabby-iOS/1.0", forHTTPHeaderField: "User-Agent")

        return request
    }

    /// Performs the request and handles the response
    private func performRequest<T: Decodable>(_ request: URLRequest) async throws -> T {
        var authenticatedRequest = request

        // Add auth header if provider is set
        if let provider = authTokenProvider,
           let token = await provider() {
            authenticatedRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let data: Data
        let response: URLResponse

        do {
            (data, response) = try await session.data(for: authenticatedRequest)
        } catch {
            throw APIError.networkError(error.localizedDescription)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        // Handle HTTP status codes
        switch httpResponse.statusCode {
        case 200...299:
            // Success - decode response
            break
        case 401:
            throw APIError.unauthorized
        case 404:
            throw APIError.notFound
        case 429:
            throw APIError.rateLimited
        case 500...599:
            // Try to extract error message from response
            if let errorResponse = try? decoder.decode(ErrorResponse.self, from: data) {
                throw APIError.serverError(errorResponse.error ?? "Unknown server error")
            }
            throw APIError.serverError("HTTP \(httpResponse.statusCode)")
        default:
            // Try to extract error message from response
            if let errorResponse = try? decoder.decode(ErrorResponse.self, from: data) {
                throw APIError.httpError(
                    statusCode: httpResponse.statusCode,
                    message: errorResponse.error
                )
            }
            throw APIError.httpError(statusCode: httpResponse.statusCode, message: nil)
        }

        // Decode successful response
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            // Log the raw response for debugging
            if let responseString = String(data: data, encoding: .utf8) {
                print("[APIClient] Failed to decode response: \(responseString)")
            }
            throw APIError.decodingError(error.localizedDescription)
        }
    }
}

// MARK: - Error Response

/// Error response structure from the API
private struct ErrorResponse: Decodable {
    let ok: Bool?
    let error: String?
    let code: String?
    let message: String?
}

// MARK: - Convenience Extensions

extension APIClient {

    /// Performs a POST request without expecting a response body
    /// - Parameters:
    ///   - path: API path
    ///   - body: Request body
    public func postVoid<B: Encodable>(
        _ path: String,
        body: B
    ) async throws {
        let _: EmptyResponse = try await post(path, body: body)
    }

    /// Performs a PUT request without expecting a response body
    /// - Parameters:
    ///   - path: API path
    ///   - body: Request body
    public func putVoid<B: Encodable>(
        _ path: String,
        body: B
    ) async throws {
        let _: EmptyResponse = try await put(path, body: body)
    }

    /// Performs a DELETE request without expecting a response body
    /// - Parameter path: API path
    public func deleteVoid(_ path: String) async throws {
        let _: EmptyResponse = try await delete(path)
    }
}

/// Empty response type for requests that don't return data
private struct EmptyResponse: Decodable {
    init(from decoder: Decoder) throws {
        // Accept any response
    }
}
