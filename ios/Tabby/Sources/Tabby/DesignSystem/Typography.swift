import SwiftUI

#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

/// Type scale from `01_DESIGN_SYSTEM.md` §3 — Inter for UI, JetBrains Mono for money/meta.
extension TB {
    enum Typography {
        // MARK: - Inter (UI)

        /// Upload wordmark — clamp(56px, 14vw, 88px) applied at call site
        static func displayXL(size: CGFloat) -> Font {
            inter(.extraBold, size: size)
        }

        /// Restaurant name, hero titles — 32pt
        static func display() -> Font {
            inter(.extraBold, size: 32)
        }

        static func scanningTitle() -> Font {
            inter(.extraBold, size: 22)
        }

        static func modalTitle() -> Font {
            inter(.extraBold, size: 24)
        }

        /// Text inputs — 16pt semibold (spec `.tb-input`)
        static func input() -> Font {
            inter(.semiBold, size: 16)
        }

        /// Body — item names, person names in cards — 14pt semibold
        static func body() -> Font {
            inter(.semiBold, size: 14)
        }

        /// Body soft — 13pt medium
        static func bodySoft() -> Font {
            inter(.medium, size: 13)
        }

        /// Section label — UNASSIGNED / ASSIGNED — 11pt bold caps
        static func section() -> Font {
            inter(.bold, size: 11)
        }

        /// Eyebrow — 10pt
        static func eyebrow() -> Font {
            inter(.bold, size: 10)
        }

        /// Primary / secondary button label — 14pt
        static func buttonPrimary() -> Font {
            inter(.bold, size: 14)
        }

        static func buttonSecondary() -> Font {
            inter(.semiBold, size: 14)
        }

        /// Pill labels — 12pt semibold
        static func pill() -> Font {
            inter(.semiBold, size: 12)
        }

        /// Avatar initial — 24pt extrabold
        static func avatarInitial() -> Font {
            inter(.extraBold, size: 24)
        }

        /// Count badge — 12pt bold
        static func countBadge() -> Font {
            inter(.bold, size: 12)
        }

        // MARK: - JetBrains Mono (money + meta)

        /// Grand total, person total — 22pt bold, clay at call site
        static func moneyLarge() -> Font {
            mono(.bold, size: 22)
        }

        /// Unassigned item prices — 14pt bold
        static func moneyMedium() -> Font {
            mono(.bold, size: 14)
        }

        /// Prices inside person cards — 12pt medium
        static func moneySmall() -> Font {
            mono(.medium, size: 12)
        }

        /// Meta — dates, IDs, section counts — 11pt medium
        static func meta() -> Font {
            mono(.medium, size: 11)
        }

        /// Scanning status line — 12pt uppercase feel at call site
        static func metaScanning() -> Font {
            mono(.medium, size: 12)
        }

        /// Small uppercase hints — 11pt
        static func metaHint() -> Font {
            mono(.medium, size: 11)
        }

        // MARK: - Internals

        private enum InterWeight {
            case regular, medium, semiBold, bold, extraBold
        }

        private static func inter(_ weight: InterWeight, size: CGFloat) -> Font {
            let psName: String
            switch weight {
            case .regular: psName = "Inter-Regular"
            case .medium: psName = "Inter-Medium"
            case .semiBold: psName = "Inter-SemiBold"
            case .bold: psName = "Inter-Bold"
            case .extraBold: psName = "Inter-ExtraBold"
            }
            if Self.fontExists(psName, size: size) {
                return Font.custom(psName, size: size)
            }
            let systemWeight: Font.Weight = switch weight {
            case .regular: .regular
            case .medium: .medium
            case .semiBold: .semibold
            case .bold: .bold
            case .extraBold: .heavy
            }
            return .system(size: size, weight: systemWeight, design: .default)
        }

        private enum MonoWeight {
            case regular, medium, bold
        }

        private static func mono(_ weight: MonoWeight, size: CGFloat) -> Font {
            let psName: String
            switch weight {
            case .regular: psName = "JetBrainsMono-Regular"
            case .medium: psName = "JetBrainsMono-Medium"
            case .bold: psName = "JetBrainsMono-Bold"
            }
            if Self.fontExists(psName, size: size) {
                return Font.custom(psName, size: size)
            }
            let systemWeight: Font.Weight = switch weight {
            case .regular: .regular
            case .medium: .medium
            case .bold: .bold
            }
            return .system(size: size, weight: systemWeight, design: .monospaced)
        }

        private static func fontExists(_ name: String, size: CGFloat) -> Bool {
            #if canImport(UIKit)
            return UIFont(name: name, size: size) != nil
            #elseif canImport(AppKit)
            return NSFont(name: name, size: size) != nil
            #else
            return false
            #endif
        }
    }
}
