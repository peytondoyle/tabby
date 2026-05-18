import SwiftUI
#if canImport(UIKit)
import UIKit
#endif
#if canImport(AppKit)
import AppKit
#endif

/// Compact receipt-style card for PNG export (parity with web share cards).
struct ReceiptShareCardView: View {
    let title: String
    let totals: BillTotals

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.title2.bold())
                .frame(maxWidth: .infinity, alignment: .leading)

            Divider()

            ForEach(totals.personTotals, id: \.personId) { row in
                HStack {
                    Text(row.name)
                        .font(.body)
                    Spacer()
                    Text(row.total.formatted(.currency(code: "USD")))
                        .font(.body.monospacedDigit())
                }
            }

            Divider()

            HStack {
                Text("Total owed")
                    .font(.headline)
                Spacer()
                Text(totals.grandTotal.formatted(.currency(code: "USD")))
                    .font(.headline.monospacedDigit())
            }

            Text("Split with Tabby")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.top, 4)
        }
        .padding(20)
        .frame(width: 360)
        .background(cardBackground)
    }

    private var cardBackground: Color {
        #if os(iOS)
        TB.Palette.surface1
        #elseif os(macOS)
        Color(nsColor: .windowBackgroundColor)
        #else
        Color.white
        #endif
    }
}

#if canImport(UIKit)
enum ReceiptShareImageRenderer {
    @MainActor
    static func render(title: String, totals: BillTotals) -> UIImage? {
        let view = ReceiptShareCardView(title: title, totals: totals)
        let renderer = ImageRenderer(content: view)
        renderer.scale = UIScreen.main.scale
        return renderer.uiImage
    }
}

/// One-page PDF matching the share card (for AirDrop, Files, print).
enum ReceiptSharePDFRenderer {
    @MainActor
    static func renderPDFData(title: String, totals: BillTotals) -> Data? {
        guard let image = ReceiptShareImageRenderer.render(title: title, totals: totals) else { return nil }
        let bounds = CGRect(origin: .zero, size: image.size)
        let pdfRenderer = UIGraphicsPDFRenderer(bounds: bounds)
        return pdfRenderer.pdfData { ctx in
            ctx.beginPage()
            image.draw(in: bounds)
        }
    }

    /// Writes a temp file (unique name) for `UIActivityViewController`.
    @MainActor
    static func writeTemporaryPDF(title: String, totals: BillTotals) -> URL? {
        guard let data = renderPDFData(title: title, totals: totals) else { return nil }
        let stem = title
            .replacingOccurrences(of: "/", with: "-")
            .replacingOccurrences(of: ":", with: "-")
            .prefix(48)
        let name = "\(UUID().uuidString)-\(stem.isEmpty ? "Tabby-receipt" : stem).pdf"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(String(name))
        do {
            try data.write(to: url)
            return url
        } catch {
            return nil
        }
    }
}
#endif
