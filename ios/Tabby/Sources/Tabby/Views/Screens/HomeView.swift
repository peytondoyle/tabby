import SwiftUI
import SwiftData
import UniformTypeIdentifiers
#if canImport(UIKit)
import UIKit
#endif
#if canImport(AppKit)
import AppKit
#endif

/// Navigation destination types for the home screen flow
enum HomeNavigationDestination: Hashable {
    case scanner
    case itemList
}

/// Scan tab — start a bill (camera, import, or manual).
struct HomeView: View {
    @Environment(BillViewModel.self) private var viewModel
    @Environment(\.modelContext) private var modelContext

    @Binding var navigationPath: NavigationPath
    @State private var showingFileImporter = false
    @State private var isCreatingBill = false

    var body: some View {
        NavigationStack(path: $navigationPath) {
            ScrollView {
                VStack(spacing: TB.Space.xxl) {
                    actionButtonsSection
                }
                .padding(.horizontal, TB.Space.xl)
                .padding(.top, TB.Space.md)
                .padding(.bottom, 100)
            }
            .background(TB.Palette.bg)
            .navigationTitle("Scan")
            #if os(iOS)
            .toolbarBackground(TB.Palette.bg, for: .navigationBar)
            #endif
            .fileImporter(
                isPresented: $showingFileImporter,
                allowedContentTypes: [.pdf, .jpeg, .png, .heic],
                allowsMultipleSelection: false
            ) { result in
                Task { await importScannedFile(result) }
            }
            .navigationDestination(for: HomeNavigationDestination.self) { destination in
                switch destination {
                case .scanner:
                    #if os(iOS)
                    ScannerView(navigationPath: $navigationPath)
                    #else
                    Text("Scanner is only available on iOS")
                    #endif
                case .itemList:
                    ItemListView(viewModel: viewModel)
                }
            }
        }
    }

    // MARK: - Actions (offset-shadow cards)

    private var actionButtonsSection: some View {
        VStack(spacing: TB.Space.lg) {
            Button {
                navigationPath.append(HomeNavigationDestination.scanner)
            } label: {
                homeActionRow(
                    icon: "camera.fill",
                    title: "Scan receipt",
                    subtitle: "Use your camera",
                    iconTint: TB.Palette.ink
                )
            }
            .buttonStyle(.plain)

            Button {
                showingFileImporter = true
            } label: {
                homeActionRow(
                    icon: "doc.fill",
                    title: "Import PDF or photo",
                    subtitle: "Same flow as the web app",
                    iconTint: TB.Palette.ink
                )
            }
            .buttonStyle(.plain)

            Button {
                Task { await createNewBillAndNavigate() }
            } label: {
                homeActionRow(
                    icon: "square.and.pencil",
                    title: "Enter manually",
                    subtitle: "Add items by hand",
                    iconTint: TB.Palette.ink
                )
            }
            .buttonStyle(.plain)
            .disabled(isCreatingBill)
        }
    }

    private func homeActionRow(icon: String, title: String, subtitle: String, iconTint: Color) -> some View {
        HStack(spacing: TB.Space.lg) {
            ZStack {
                RoundedRectangle(cornerRadius: TB.Radius.md, style: .continuous)
                    .fill(TB.Palette.surface2)
                    .frame(width: 56, height: 56)
                    .tbShadow(.sm)
                Image(systemName: icon)
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(iconTint)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(TB.Typography.body())
                    .foregroundStyle(TB.Palette.ink)
                Text(subtitle)
                    .font(TB.Typography.bodySoft())
                    .foregroundStyle(TB.Palette.inkSoft)
            }

            Spacer(minLength: 0)

            Image(systemName: "chevron.right")
                .font(TB.Typography.bodySoft())
                .foregroundStyle(TB.Palette.inkFaint)
        }
        .padding(TB.Space.lg)
        .background(TB.Palette.surface1)
        .clipShape(RoundedRectangle(cornerRadius: TB.Radius.xl, style: .continuous))
        .tbShadow(.lg)
    }

    private func createNewBillAndNavigate() async {
        isCreatingBill = true
        let uid = await MainActor.run { AuthService.shared.currentUserId }
        await viewModel.createManualBill(userId: uid)
        isCreatingBill = false
        guard viewModel.bill != nil, viewModel.error == nil else { return }
        await MainActor.run {
            viewModel.syncSplitModesFromPreferences()
            viewModel.persistSnapshotToSwiftData(context: modelContext)
            navigationPath.append(HomeNavigationDestination.itemList)
        }
    }

    private func importScannedFile(_ result: Result<[URL], Error>) async {
        switch result {
        case .failure:
            return
        case .success(let urls):
            guard let url = urls.first else { return }
            guard url.startAccessingSecurityScopedResource() else { return }
            defer { url.stopAccessingSecurityScopedResource() }
            do {
                let data = try Data(contentsOf: url)
                let ext = url.pathExtension.lowercased()
                let mime: String
                let name: String
                switch ext {
                case "pdf":
                    mime = "application/pdf"
                    name = url.lastPathComponent
                case "png":
                    mime = "image/png"
                    name = url.lastPathComponent
                case "heic":
                    mime = "image/heic"
                    name = url.lastPathComponent
                default:
                    mime = "image/jpeg"
                    name = url.lastPathComponent.isEmpty ? "receipt.jpg" : url.lastPathComponent
                }
                let scan = try await OCRAPI().scanReceipt(fileData: data, fileName: name, mimeType: mime)
                let uid = await MainActor.run { AuthService.shared.currentUserId }
                await viewModel.createBillFromScan(scan, userId: uid)
                await MainActor.run {
                    guard viewModel.bill != nil, viewModel.error == nil else { return }
                    viewModel.syncSplitModesFromPreferences()
                    viewModel.persistSnapshotToSwiftData(context: modelContext)
                    navigationPath = NavigationPath()
                    navigationPath.append(HomeNavigationDestination.itemList)
                }
            } catch {
                await MainActor.run { viewModel.error = error.localizedDescription }
            }
        }
    }
}

#Preview {
    struct HomePreview: View {
        @State private var path = NavigationPath()
        var body: some View {
            HomeView(navigationPath: $path)
                .environment(BillViewModel())
                .modelContainer(for: [PersistentBill.self, PersistentItem.self, PersistentPerson.self], inMemory: true)
        }
    }
    return HomePreview()
}
