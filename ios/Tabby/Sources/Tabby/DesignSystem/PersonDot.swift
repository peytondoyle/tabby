import SwiftUI

/// 10pt accent dot — spec §4.6
struct TBPersonDot: View {
    let accent: Color

    var body: some View {
        Circle()
            .fill(accent)
            .frame(width: 10, height: 10)
    }
}

/// Clay count badge — top-right of avatar cells
struct TBCountBadge: View {
    let count: Int

    var body: some View {
        Text("\(count)")
            .font(TB.Typography.countBadge())
            .foregroundStyle(TB.Palette.surface1)
            .padding(.horizontal, 6)
            .frame(minWidth: 22, minHeight: 22)
            .background(TB.Palette.clay)
            .clipShape(Capsule())
            .tbShadow(.xs)
    }
}
