import SwiftUI

/// Milk & Clay design tokens — source: `01_DESIGN_SYSTEM.md` §2
enum TB {
    enum Palette {
        // Surfaces
        static let bg = Color(hex: 0xE8D9C4)
        static let surface1 = Color(hex: 0xF5EBD9)
        static let surface2 = Color(hex: 0xDFC9AD)
        static let surface3 = Color(hex: 0xD4BC9A)

        // Ink
        static let ink = Color(hex: 0x2A1B12)
        static let inkStrong = Color(hex: 0x1A0F07)
        static let inkSoft = Color(hex: 0x5C4533)
        static let inkFaint = Color(hex: 0x907860)
        static let inkDim = Color(hex: 0xB0997E)

        // Clay accent
        static let clay = Color(hex: 0xB8451C)
        static let clayHover = Color(hex: 0xA63D17)
        static let clayPress = Color(hex: 0x8F3412)
        static let clayTint = Color(hex: 0xB8451C, alpha: 0.10)

        // Person dot palette
        static let mustard = Color(hex: 0xA57A15)
        static let olive = Color(hex: 0x6C7940)
        static let pomegranate = Color(hex: 0x8B2A2F)
        static let plum = Color(hex: 0x6B4A5E)

        // Semantic
        static let success = Color(hex: 0x5C7A3A)
        static let warning = Color(hex: 0xA57A15)
        static let danger = Color(hex: 0xB8451C)
        static let dangerTint = Color(hex: 0xB8451C, alpha: 0.10)

        // Rules
        static let rule = Color(hex: 0x2A1B12, alpha: 0.10)
        static let ruleStrong = Color(hex: 0x2A1B12, alpha: 0.18)

        /// Modal / toast scrim — ink-tinted dim
        static let scrim = Color(hex: 0x2A1B12, alpha: 0.45)

        /// Toast: dark ink pill on warm bg
        static let toastBackground = Color(hex: 0x2A1B12)
        static let toastForeground = Color(hex: 0xE8D9C4)
    }

    enum Radius {
        static let sm: CGFloat = 10
        static let md: CGFloat = 14
        static let lg: CGFloat = 18
        static let xl: CGFloat = 22
        static let pill: CGFloat = 999
    }

    enum Space {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 22
        static let xxl: CGFloat = 32
    }

    /// Offset shadows — zero blur (Milk & Clay signature)
    enum ShadowStyle {
        case xs, sm, md, lg, xl, clay

        var color: Color {
            switch self {
            case .xs: return Color(hex: 0x2A1B12, alpha: 0.08)
            case .sm: return Color(hex: 0x2A1B12, alpha: 0.08)
            case .md: return Color(hex: 0x2A1B12, alpha: 0.10)
            case .lg: return Color(hex: 0x2A1B12, alpha: 0.12)
            case .xl: return Color(hex: 0x2A1B12, alpha: 0.14)
            case .clay: return Color(hex: 0x2A1B12, alpha: 0.18)
            }
        }

        var offset: CGSize {
            switch self {
            case .xs: return CGSize(width: 1, height: 1)
            case .sm: return CGSize(width: 2, height: 2)
            case .md: return CGSize(width: 2, height: 3)
            case .lg: return CGSize(width: 3, height: 3)
            case .xl: return CGSize(width: 4, height: 4)
            case .clay: return CGSize(width: 3, height: 3)
            }
        }
    }

    enum Motion {
        static let fast: Double = 0.12
        static let base: Double = 0.20
        static let slow: Double = 0.36

        static var easeOut: Animation {
            .timingCurve(0.22, 1, 0.36, 1, duration: base)
        }

        static var spring: Animation {
            .timingCurve(0.34, 1.56, 0.64, 1, duration: base)
        }
    }

    /// Five palette-harmonious colors — cycle with `index % 5`
    static let personAccents: [Color] = [
        Palette.clay,
        Palette.mustard,
        Palette.olive,
        Palette.pomegranate,
        Palette.plum
    ]

    static func personAccent(at index: Int) -> Color {
        personAccents[index % personAccents.count]
    }
}
