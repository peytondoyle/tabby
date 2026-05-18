import SwiftUI

/// Ink pill toast — spec §7 (high-contrast, offset shadow, no blur material)
struct TBToast: View {
    let message: String
    var systemImage: String = "checkmark.circle.fill"

    var body: some View {
        HStack(spacing: TB.Space.sm) {
            Image(systemName: systemImage)
                .foregroundStyle(TB.Palette.success)
            Text(message)
                .font(TB.Typography.bodySoft())
                .foregroundStyle(TB.Palette.toastForeground)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(TB.Palette.toastBackground)
        .clipShape(Capsule())
        .tbShadow(.md)
    }
}

extension View {
    func tbToast(isPresented: Bool, message: String) -> some View {
        overlay(alignment: .bottom) {
            if isPresented {
                TBToast(message: message)
                    .padding(.bottom, 90)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .animation(.easeOut(duration: TB.Motion.base), value: isPresented)
            }
        }
    }
}
