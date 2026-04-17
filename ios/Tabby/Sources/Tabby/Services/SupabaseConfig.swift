import Foundation
import Supabase

// MARK: - Supabase Configuration

/// Configuration for Supabase client connection
///
/// Provides URL and anonymous key for Supabase authentication and API access.
/// Values can be overridden via environment variables or by setting properties directly.
///
/// Environment Variables:
/// - `SUPABASE_URL`: The Supabase project URL
/// - `SUPABASE_ANON_KEY`: The Supabase anonymous/public key
///
/// Usage:
/// ```swift
/// let client = SupabaseConfig.shared.client
/// ```
public final class SupabaseConfig: @unchecked Sendable {

    // MARK: - Singleton

    /// Shared configuration instance
    public static let shared = SupabaseConfig()

    // MARK: - Configuration Values

    /// The Supabase project URL
    ///
    /// Priority:
    /// 1. Environment variable `SUPABASE_URL`
    /// 2. Default placeholder value
    public var supabaseURL: URL {
        if let urlString = ProcessInfo.processInfo.environment["SUPABASE_URL"],
           let url = URL(string: urlString) {
            return url
        }
        // Default placeholder - replace with your Supabase project URL
        return URL(string: "https://your-project.supabase.co")!
    }

    /// The Supabase anonymous/public key
    ///
    /// Priority:
    /// 1. Environment variable `SUPABASE_ANON_KEY`
    /// 2. Default placeholder value
    public var supabaseAnonKey: String {
        if let key = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] {
            return key
        }
        // Default placeholder - replace with your Supabase anon key
        return "your-anon-key"
    }

    // MARK: - Supabase Client

    /// The configured Supabase client instance
    ///
    /// This is the main entry point for all Supabase operations including:
    /// - Authentication (client.auth)
    /// - Database (client.database)
    /// - Storage (client.storage)
    /// - Realtime (client.realtime)
    public lazy var client: SupabaseClient = {
        SupabaseClient(
            supabaseURL: supabaseURL,
            supabaseKey: supabaseAnonKey
        )
    }()

    // MARK: - Initialization

    private init() {}

    // MARK: - Validation

    /// Check if the configuration has valid (non-placeholder) values
    public var isConfigured: Bool {
        let urlString = supabaseURL.absoluteString
        let isValidURL = !urlString.contains("your-project")
        let isValidKey = supabaseAnonKey != "your-anon-key"
        return isValidURL && isValidKey
    }
}

// MARK: - Convenience Extensions

extension SupabaseConfig {

    /// Quick access to the auth client
    public var auth: AuthClient {
        client.auth
    }
}
