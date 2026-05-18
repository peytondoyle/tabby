import SwiftUI
#if canImport(UIKit)
import UIKit
#endif
#if canImport(AppKit)
import AppKit
#endif

/// Share sheet for sharing bill links with copy and native share functionality
struct ShareSheet: View {

    // MARK: - Properties

    let billTitle: String
    let viewerToken: String?
    let editorToken: String?

    @Environment(\.dismiss) private var dismiss
    @State private var selectedLinkType: LinkType = .viewer
    @State private var showingCopiedConfirmation = false
    @State private var showingNativeShareSheet = false

    private let baseURL = "https://tabby.vercel.app"

    // MARK: - Link Types

    enum LinkType: String, CaseIterable, Identifiable {
        case viewer = "View Only"
        case editor = "Can Edit"

        var id: String { rawValue }

        var icon: String {
            switch self {
            case .viewer: return "eye"
            case .editor: return "pencil"
            }
        }

        var description: String {
            switch self {
            case .viewer: return "Recipients can view the bill but cannot make changes"
            case .editor: return "Recipients can view and edit the bill"
            }
        }
    }

    // MARK: - Computed Properties

    private var currentToken: String? {
        switch selectedLinkType {
        case .viewer: return viewerToken
        case .editor: return editorToken
        }
    }

    private var shareURL: URL? {
        guard let token = currentToken else { return nil }
        switch selectedLinkType {
        case .viewer:
            return URL(string: "\(baseURL)/receipt/\(token)")
        case .editor:
            return URL(string: "\(baseURL)/receipt/\(token)/edit")
        }
    }

    private var shareURLString: String {
        shareURL?.absoluteString ?? "Link not available"
    }

    private var hasEditorToken: Bool {
        editorToken != nil && !editorToken!.isEmpty
    }

    private var hasViewerToken: Bool {
        viewerToken != nil && !viewerToken!.isEmpty
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                headerSection

                Rectangle()
                    .fill(TB.Palette.rule)
                    .frame(height: 1)

                ScrollView {
                    VStack(spacing: 24) {
                        if hasEditorToken && hasViewerToken {
                            linkTypePicker
                        }
                        linkDisplaySection
                        actionButtons
                    }
                    .padding()
                }
            }
            .background(TB.Palette.bg)
            .navigationTitle("Share bill")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                #if os(iOS)
                ToolbarItem(placement: .topBarTrailing) {
                    doneButton
                }
                #else
                ToolbarItem(placement: .confirmationAction) {
                    doneButton
                }
                #endif
            }
            #if os(iOS)
            .sheet(isPresented: $showingNativeShareSheet) {
                if let url = shareURL {
                    ActivityViewController(activityItems: [url])
                }
            }
            #endif
            .tbToast(isPresented: showingCopiedConfirmation, message: "Link copied to clipboard")
        }
    }

    // MARK: - Done Button

    private var doneButton: some View {
        Button("Done") {
            dismiss()
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: 8) {
            Image(systemName: "link.circle.fill")
                .font(.system(size: 48))
                .foregroundStyle(.blue)

            Text(billTitle)
                .font(.headline)
                .multilineTextAlignment(.center)
        }
        .padding()
    }

    // MARK: - Link Type Picker

    private var linkTypePicker: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Link type")
                .font(TB.Typography.bodySoft())
                .foregroundStyle(TB.Palette.inkFaint)

            Picker("Link Type", selection: $selectedLinkType) {
                ForEach(LinkType.allCases) { linkType in
                    HStack {
                        Image(systemName: linkType.icon)
                        Text(linkType.rawValue)
                    }
                    .tag(linkType)
                }
            }
            .pickerStyle(.segmented)

            Text(selectedLinkType.description)
                .font(TB.Typography.meta())
                .foregroundStyle(TB.Palette.inkSoft)
        }
    }

    // MARK: - Link Display Section

    private var linkDisplaySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Share link")
                .font(TB.Typography.bodySoft())
                .foregroundStyle(TB.Palette.inkFaint)

            if currentToken != nil {
                HStack {
                    Text(shareURLString)
                        .font(TB.Typography.moneyMedium())
                        .monospacedDigit()
                        .foregroundStyle(TB.Palette.ink)
                        .lineLimit(2)
                        .truncationMode(.middle)

                    Spacer()

                    Button {
                        copyToClipboard()
                    } label: {
                        Image(systemName: "doc.on.doc")
                            .font(TB.Typography.body())
                    }
                    .buttonStyle(TBSecondaryButtonStyle())
                }
                .padding()
                .background(TB.Palette.surface1)
                .clipShape(RoundedRectangle(cornerRadius: TB.Radius.md, style: .continuous))
                .tbShadow(.sm)
            } else {
                noLinkAvailableView
            }
        }
    }

    // MARK: - No Link Available View

    private var noLinkAvailableView: some View {
        HStack {
            Image(systemName: "exclamationmark.triangle")
                .foregroundStyle(TB.Palette.warning)

            Text("No \(selectedLinkType.rawValue.lowercased()) link available for this bill.")
                .font(TB.Typography.bodySoft())
                .foregroundStyle(TB.Palette.inkSoft)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(TB.Palette.surface1)
        .clipShape(RoundedRectangle(cornerRadius: TB.Radius.md, style: .continuous))
        .tbShadow(.xs)
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        VStack(spacing: TB.Space.md) {
            Button {
                copyToClipboard()
            } label: {
                Label("Copy link", systemImage: "doc.on.doc")
                    .font(TB.Typography.buttonSecondary())
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(TBSecondaryButtonStyle())
            .disabled(currentToken == nil)

            #if os(iOS)
            Button {
                showingNativeShareSheet = true
            } label: {
                Label("Share", systemImage: "square.and.arrow.up")
                    .font(TB.Typography.buttonPrimary())
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(TBPrimaryButtonStyle())
            .disabled(currentToken == nil)
            #else
            Button {
                shareOnMacOS()
            } label: {
                Label("Share", systemImage: "square.and.arrow.up")
                    .font(TB.Typography.buttonPrimary())
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(TBPrimaryButtonStyle())
            .disabled(currentToken == nil)
            #endif
        }
    }

    // MARK: - Actions

    private func copyToClipboard() {
        guard let url = shareURL else { return }

        #if os(iOS)
        UIPasteboard.general.string = url.absoluteString
        #elseif os(macOS)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(url.absoluteString, forType: .string)
        #endif

        withAnimation {
            showingCopiedConfirmation = true
        }

        // Hide confirmation after delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            withAnimation {
                showingCopiedConfirmation = false
            }
        }
    }

    #if os(macOS)
    private func shareOnMacOS() {
        guard let url = shareURL else { return }

        let picker = NSSharingServicePicker(items: [url])
        if let window = NSApplication.shared.keyWindow,
           let contentView = window.contentView {
            picker.show(relativeTo: .zero, of: contentView, preferredEdge: .minY)
        }
    }
    #endif
}

// MARK: - Activity View Controller (iOS only)

#if os(iOS)
/// UIKit wrapper for the native share sheet
struct ActivityViewController: UIViewControllerRepresentable {
    let activityItems: [Any]
    var applicationActivities: [UIActivity]? = nil

    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(
            activityItems: activityItems,
            applicationActivities: applicationActivities
        )
        return controller
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {
        // No updates needed
    }
}
#endif

// MARK: - Previews

#Preview("With Both Tokens") {
    ShareSheet(
        billTitle: "Dinner at The Restaurant",
        viewerToken: "abc123viewer",
        editorToken: "xyz789editor"
    )
}

#Preview("Viewer Only") {
    ShareSheet(
        billTitle: "Lunch Split",
        viewerToken: "viewer-only-token",
        editorToken: nil
    )
}

#Preview("No Tokens") {
    ShareSheet(
        billTitle: "Draft Bill",
        viewerToken: nil,
        editorToken: nil
    )
}
