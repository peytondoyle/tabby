import SwiftUI
import SwiftData

@main
struct TabbyApp: App {
    /// Shared bill view model for the entire app
    @State private var billViewModel = BillViewModel()

    /// Shared model container for SwiftData persistence
    let modelContainer: ModelContainer

    init() {
        do {
            let schema = Schema([
                PersistentBill.self,
                PersistentItem.self,
                PersistentPerson.self
            ])

            let modelConfiguration = ModelConfiguration(
                schema: schema,
                isStoredInMemoryOnly: false,
                allowsSave: true
            )

            modelContainer = try ModelContainer(
                for: schema,
                configurations: [modelConfiguration]
            )
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .environment(billViewModel)
        }
        .modelContainer(modelContainer)
    }
}
