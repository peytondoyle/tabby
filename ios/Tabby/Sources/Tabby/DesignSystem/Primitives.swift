import SwiftUI

// MARK: - Offset shadow (zero blur)

extension View {
    /// Milk & Clay signature — offset shadow, no blur.
    func tbShadow(_ style: TB.ShadowStyle) -> some View {
        shadow(color: style.color, radius: 0, x: style.offset.width, y: style.offset.height)
    }

    /// Clay CTA shadow
    func tbClayShadow() -> some View {
        tbShadow(.clay)
    }
}

// MARK: - Cards

extension View {
    func tbCard() -> some View {
        padding(EdgeInsets(top: 13, leading: 16, bottom: 13, trailing: 16))
            .background(TB.Palette.surface1)
            .clipShape(RoundedRectangle(cornerRadius: TB.Radius.lg, style: .continuous))
            .tbShadow(.sm)
    }

    func tbCardLarge() -> some View {
        padding(EdgeInsets(top: 15, leading: 18, bottom: 15, trailing: 18))
            .background(TB.Palette.surface1)
            .clipShape(RoundedRectangle(cornerRadius: TB.Radius.xl, style: .continuous))
            .tbShadow(.lg)
    }

    func tbCardDragOver(_ isOver: Bool) -> some View {
        tbShadow(isOver ? .lg : .sm)
            .overlay(
                RoundedRectangle(cornerRadius: TB.Radius.lg, style: .continuous)
                    .strokeBorder(isOver ? TB.Palette.clay : Color.clear, lineWidth: 2)
            )
            .offset(y: isOver ? -1 : 0)
    }
}

// MARK: - Pills (progress / filter)

struct TBPillStyle: ViewModifier {
    let isActive: Bool

    func body(content: Content) -> some View {
        content
            .font(TB.Typography.pill())
            .foregroundStyle(isActive ? TB.Palette.surface1 : TB.Palette.inkSoft)
            .padding(.horizontal, 15)
            .padding(.vertical, 7)
            .background(isActive ? TB.Palette.clay : TB.Palette.ink.opacity(0.06))
            .clipShape(Capsule())
            .tbShadow(isActive ? .sm : .xs)
    }
}

extension View {
    func tbPill(active: Bool) -> some View {
        modifier(TBPillStyle(isActive: active))
    }
}

// MARK: - Avatar (asymmetric radii by variant)

enum TBAvatarVariant: Int {
    case v0, v1, v2, v3

    /// Spec: cycle `index % 4`
    static func from(index: Int) -> TBAvatarVariant {
        TBAvatarVariant(rawValue: index % 4) ?? .v0
    }

    var cornerRadii: RectangleCornerRadii {
        switch self {
        case .v0:
            return RectangleCornerRadii(topLeading: 18, bottomLeading: 22, bottomTrailing: 18, topTrailing: 22)
        case .v1:
            return RectangleCornerRadii(topLeading: 22, bottomLeading: 18, bottomTrailing: 22, topTrailing: 18)
        case .v2:
            return RectangleCornerRadii(topLeading: 18, bottomLeading: 18, bottomTrailing: 24, topTrailing: 18)
        case .v3:
            return RectangleCornerRadii(topLeading: 22, bottomLeading: 18, bottomTrailing: 18, topTrailing: 22)
        }
    }
}

extension View {
    func tbAvatarShape(variant: TBAvatarVariant) -> some View {
        clipShape(UnevenRoundedRectangle(cornerRadii: variant.cornerRadii, style: .continuous))
    }
}

// MARK: - Buttons

struct TBPrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(TB.Typography.buttonPrimary())
            .foregroundStyle(isEnabled ? TB.Palette.surface1 : TB.Palette.inkDim)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(isEnabled ? TB.Palette.clay : TB.Palette.surface2)
            .clipShape(Capsule())
            .tbShadow(isEnabled ? .clay : .xs)
            .offset(
                x: configuration.isPressed && isEnabled ? 1 : 0,
                y: configuration.isPressed && isEnabled ? 1 : 0
            )
            .animation(.easeOut(duration: TB.Motion.fast), value: configuration.isPressed)
    }
}

struct TBSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(TB.Typography.buttonSecondary())
            .foregroundStyle(TB.Palette.ink)
            .padding(.horizontal, 22)
            .padding(.vertical, 12)
            .background(TB.Palette.surface1)
            .clipShape(Capsule())
            .tbShadow(configuration.isPressed ? .sm : .sm)
            .offset(
                x: configuration.isPressed ? 1 : 0,
                y: configuration.isPressed ? 1 : 0
            )
            .animation(.easeOut(duration: TB.Motion.fast), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == TBPrimaryButtonStyle {
    static var tbPrimary: TBPrimaryButtonStyle { TBPrimaryButtonStyle() }
}

extension ButtonStyle where Self == TBSecondaryButtonStyle {
    static var tbSecondary: TBSecondaryButtonStyle { TBSecondaryButtonStyle() }
}

// MARK: - Text field

struct TBInputModifier: ViewModifier {
    let isFocused: Bool
    var isMonospaced: Bool = false

    func body(content: Content) -> some View {
        content
            .font(isMonospaced ? TB.Typography.moneyMedium() : TB.Typography.input())
            .foregroundStyle(TB.Palette.ink)
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(TB.Palette.surface1)
            .clipShape(RoundedRectangle(cornerRadius: TB.Radius.md, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: TB.Radius.md, style: .continuous)
                    .strokeBorder(isFocused ? TB.Palette.clay : Color.clear, lineWidth: 2)
            )
            .tbShadow(isFocused ? .md : .sm)
            .animation(.easeOut(duration: TB.Motion.fast), value: isFocused)
    }
}

extension View {
    func tbInput(isFocused: Bool, monospaced: Bool = false) -> some View {
        modifier(TBInputModifier(isFocused: isFocused, isMonospaced: monospaced))
    }
}

// MARK: - Section header

struct TBSectionHeader: View {
    let title: String
    let trailing: String?

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: TB.Space.md) {
            Text(title)
                .font(TB.Typography.section())
                .tracking(2.2)
                .textCase(.uppercase)
                .foregroundStyle(TB.Palette.inkFaint)
            Spacer(minLength: 0)
            if let trailing {
                Text(trailing)
                    .font(TB.Typography.meta())
                    .monospacedDigit()
                    .tracking(0.88)
                    .foregroundStyle(TB.Palette.inkFaint)
            }
        }
        .padding(.horizontal, TB.Space.xl)
        .padding(.top, 14)
        .padding(.bottom, 10)
    }
}

#Preview("TB primitives") {
    VStack(spacing: 24) {
        Text("tabby")
            .font(TB.Typography.displayXL(size: 56))
            .foregroundStyle(TB.Palette.ink)
        Text("UNASSIGNED")
            .tbPill(active: true)
        Button("Share") {}
            .buttonStyle(TBPrimaryButtonStyle())
        Button("Cancel") {}
            .buttonStyle(TBSecondaryButtonStyle())
    }
    .padding()
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(TB.Palette.bg)
}
