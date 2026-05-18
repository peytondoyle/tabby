import CoreText
import Foundation

/// Registers bundled Inter + JetBrains Mono so `Font.custom(_:size:)` resolves.
enum TBFontRegistration {
    private static let fontFiles: [String] = [
        "Inter-Regular",
        "Inter-Medium",
        "Inter-SemiBold",
        "Inter-Bold",
        "Inter-ExtraBold",
        "JetBrainsMono-Regular",
        "JetBrainsMono-Medium",
        "JetBrainsMono-Bold"
    ]

    /// Call once at app launch. Safe to call multiple times.
    static func registerFonts(bundle: Bundle = .main) {
        for base in fontFiles {
            guard let url = bundle.url(forResource: base, withExtension: "ttf", subdirectory: "Fonts")
                    ?? bundle.url(forResource: base, withExtension: "ttf") else {
                continue
            }
            var error: Unmanaged<CFError>?
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, &error)
        }
    }
}
