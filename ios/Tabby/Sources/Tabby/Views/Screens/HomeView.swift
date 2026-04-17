import SwiftUI
import SwiftData
#if canImport(UIKit)
import UIKit
#endif
#if canImport(AppKit)
import AppKit
#endif

// MARK: - Cross-platform Color Extension

private extension Color {
    static var homeBackground: Color {
        #if os(iOS)
        Color(uiColor: .systemGroupedBackground)
        #else
        Color(nsColor: .windowBackgroundColor)
        #endif
    }

    static var cardBackground: Color {
        #if os(iOS)
        Color(uiColor: .secondarySystemGroupedBackground)
        #else
        Color(nsColor: .controlBackgroundColor)
        #endif
    }
}

/// Navigation destination types for the home screen flow
enum HomeNavigationDestination: Hashable {
    case scanner
    case itemList
}

/// Main home screen with scan receipt and manual entry options
struct HomeView: View {
    @Environment(BillViewModel.self) private var viewModel

    @State private var navigationPath = NavigationPath()
    @State private var showingScannerSheet = false

    var body: some View {
        NavigationStack(path: $navigationPath) {
            ScrollView {
                VStack(spacing: 32) {
                    // Hero section with app branding
                    heroSection

                    // Main action buttons
                    actionButtonsSection

                    // Recent bills section (placeholder)
                    recentBillsSection
                }
                .padding()
            }
            .background(Color.homeBackground)
            .navigationTitle("Tabby")
            .navigationDestination(for: HomeNavigationDestination.self) { destination in
                switch destination {
                case .scanner:
                    #if os(iOS)
                    ScannerView()
                    #else
                    Text("Scanner is only available on iOS")
                    #endif
                case .itemList:
                    ItemListView(viewModel: viewModel)
                }
            }
        }
    }

    // MARK: - Hero Section

    private var heroSection: some View {
        VStack(spacing: 16) {
            // App icon/logo placeholder
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [.blue, .purple],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 80, height: 80)

                Image(systemName: "dollarsign.circle.fill")
                    .font(.system(size: 44))
                    .foregroundStyle(.white)
            }
            .shadow(color: .blue.opacity(0.3), radius: 10, x: 0, y: 5)

            VStack(spacing: 4) {
                Text("Split bills with ease")
                    .font(.title2)
                    .fontWeight(.semibold)

                Text("Scan a receipt or enter items manually")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.top, 20)
    }

    // MARK: - Action Buttons Section

    private var actionButtonsSection: some View {
        VStack(spacing: 16) {
            // Scan Receipt Button
            Button {
                navigationPath.append(HomeNavigationDestination.scanner)
            } label: {
                HStack(spacing: 16) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.blue.opacity(0.15))
                            .frame(width: 56, height: 56)

                        Image(systemName: "camera.viewfinder")
                            .font(.title2)
                            .foregroundStyle(.blue)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Scan Receipt")
                            .font(.headline)
                            .foregroundStyle(.primary)

                        Text("Use your camera to scan")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.body)
                        .foregroundStyle(.tertiary)
                }
                .padding()
                .background(Color.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }
            .buttonStyle(.plain)

            // Enter Manually Button
            Button {
                createNewBillAndNavigate()
            } label: {
                HStack(spacing: 16) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.green.opacity(0.15))
                            .frame(width: 56, height: 56)

                        Image(systemName: "square.and.pencil")
                            .font(.title2)
                            .foregroundStyle(.green)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Enter Manually")
                            .font(.headline)
                            .foregroundStyle(.primary)

                        Text("Add items by hand")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.body)
                        .foregroundStyle(.tertiary)
                }
                .padding()
                .background(Color.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Recent Bills Section

    private var recentBillsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Bills")
                    .font(.headline)

                Spacer()

                Button("See All") {
                    // TODO: Navigate to history tab
                }
                .font(.subheadline)
            }

            // Placeholder for recent bills
            if true { // Replace with actual check for recent bills
                emptyRecentBillsView
            } else {
                // TODO: Populate with actual recent bills
                EmptyView()
            }
        }
    }

    private var emptyRecentBillsView: some View {
        VStack(spacing: 12) {
            Image(systemName: "clock")
                .font(.system(size: 32))
                .foregroundStyle(.tertiary)

            Text("No recent bills")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Text("Your bill history will appear here")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Actions

    private func createNewBillAndNavigate() {
        // Create a new empty bill for manual entry
        let newBill = Bill(
            id: UUID().uuidString,
            title: "New Bill"
        )
        viewModel.bill = newBill
        viewModel.items = []
        viewModel.people = []
        viewModel.shares = []

        navigationPath.append(HomeNavigationDestination.itemList)
    }
}

// MARK: - Preview

#Preview {
    HomeView()
        .environment(BillViewModel())
        .modelContainer(for: [PersistentBill.self, PersistentItem.self, PersistentPerson.self], inMemory: true)
}
