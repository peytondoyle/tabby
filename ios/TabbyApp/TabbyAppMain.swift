import SwiftUI
import SwiftData

@main
struct TabbyAppMain: App {
    @State private var viewModel = BillViewModel()

    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            PersistentBill.self,
            PersistentItem.self,
            PersistentPerson.self
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .environment(viewModel)
        }
        .modelContainer(sharedModelContainer)
    }
}
