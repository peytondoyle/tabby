import SwiftUI
import SwiftData

/// Main tab view container for the app's primary navigation
struct MainTabView: View {
    @Environment(BillViewModel.self) private var viewModel

    /// Currently selected tab
    @State private var selectedTab: Tab = .home

    /// Count of bills in history (for badge)
    @State private var historyBadgeCount: Int = 0

    /// Available tabs in the app
    enum Tab: String, CaseIterable {
        case home
        case history
        case settings

        var title: String {
            switch self {
            case .home: return "Home"
            case .history: return "History"
            case .settings: return "Settings"
            }
        }

        var icon: String {
            switch self {
            case .home: return "house.fill"
            case .history: return "clock.fill"
            case .settings: return "gearshape.fill"
            }
        }
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            // Home Tab
            HomeView()
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
            SettingsTabView()
                .tabItem {
                    Label(Tab.settings.title, systemImage: Tab.settings.icon)
                }
                .tag(Tab.settings)
        }
    }
}

// MARK: - Settings Tab View (Placeholder)

/// Placeholder view for app settings
struct SettingsTabView: View {
    var body: some View {
        NavigationStack {
            List {
                // Account Section
                Section("Account") {
                    HStack {
                        Image(systemName: "person.circle.fill")
                            .font(.title)
                            .foregroundStyle(.blue)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Sign In")
                                .font(.body)
                            Text("Sync your bills across devices")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }

                // Preferences Section
                Section("Preferences") {
                    NavigationLink {
                        Text("Currency Settings")
                    } label: {
                        Label("Currency", systemImage: "dollarsign.circle")
                    }

                    NavigationLink {
                        Text("Default Tip Settings")
                    } label: {
                        Label("Default Tip", systemImage: "percent")
                    }

                    NavigationLink {
                        Text("Tax Settings")
                    } label: {
                        Label("Default Tax Rate", systemImage: "building.columns")
                    }
                }

                // Payment Section
                Section("Payment") {
                    NavigationLink {
                        Text("Venmo Settings")
                    } label: {
                        Label("Venmo", systemImage: "creditcard")
                    }
                }

                // About Section
                Section("About") {
                    NavigationLink {
                        Text("Help & Support")
                    } label: {
                        Label("Help & Support", systemImage: "questionmark.circle")
                    }

                    NavigationLink {
                        Text("Privacy Policy")
                    } label: {
                        Label("Privacy Policy", systemImage: "hand.raised")
                    }

                    NavigationLink {
                        Text("Terms of Service")
                    } label: {
                        Label("Terms of Service", systemImage: "doc.text")
                    }

                    HStack {
                        Label("Version", systemImage: "info.circle")
                        Spacer()
                        Text("1.0.0")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }
}

// MARK: - Preview

#Preview("Main Tab View") {
    MainTabView()
        .environment(BillViewModel())
        .modelContainer(for: [PersistentBill.self, PersistentItem.self, PersistentPerson.self], inMemory: true)
}

#Preview("Settings Tab") {
    SettingsTabView()
}
