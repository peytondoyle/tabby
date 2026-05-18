import SwiftUI
import SwiftData

/// Main tab view container for the app's primary navigation
struct MainTabView: View {
    @Environment(BillViewModel.self) private var viewModel
    @Environment(\.modelContext) private var modelContext

    /// Currently selected tab
    @State private var selectedTab: Tab = .home

    /// Scan tab stack — lifted so deep links can push `ItemListView` while switching to Scan.
    @State private var homeNavigationPath = NavigationPath()

    /// Count of bills in history (for badge)
    @State private var historyBadgeCount: Int = 0

    /// Available tabs in the app
    enum Tab: String, CaseIterable {
        case home
        case history
        case settings

        var title: String {
            switch self {
            case .home: return "Scan"
            case .history: return "History"
            case .settings: return "Settings"
            }
        }

        var icon: String {
            switch self {
            case .home: return "camera.viewfinder"
            case .history: return "clock.fill"
            case .settings: return "gearshape.fill"
            }
        }
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            // Scan (receipt entry)
            HomeView(navigationPath: $homeNavigationPath)
                .tabItem {
                    Label(Tab.home.title, systemImage: Tab.home.icon)
                }
                .tag(Tab.home)

            // History Tab
            HistoryView()
                .tabItem {
                    Label(Tab.history.title, systemImage: Tab.history.icon)
                }
                .tag(Tab.history)
                .badge(historyBadgeCount > 0 ? historyBadgeCount : 0)

            // Settings Tab
            SettingsView()
                .tabItem {
                    Label(Tab.settings.title, systemImage: Tab.settings.icon)
                }
                .tag(Tab.settings)
        }
        .tint(TB.Palette.clay)
        .background(TB.Palette.bg)
        .onChange(of: viewModel.homeItemListNavigationTick) { _, _ in
            selectedTab = .home
            homeNavigationPath = NavigationPath()
            homeNavigationPath.append(HomeNavigationDestination.itemList)
            viewModel.persistSnapshotToSwiftData(context: modelContext)
        }
    }
}

// MARK: - Preview

#Preview("Main Tab View") {
    MainTabView()
        .environment(BillViewModel())
        .modelContainer(for: [PersistentBill.self, PersistentItem.self, PersistentPerson.self], inMemory: true)
}

