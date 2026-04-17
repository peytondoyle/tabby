import SwiftUI
import SwiftData

/// ContentView now serves as a wrapper that uses MainTabView
/// This maintains backwards compatibility if ContentView is referenced elsewhere
struct ContentView: View {
    @State private var billViewModel = BillViewModel()

    var body: some View {
        MainTabView()
            .environment(billViewModel)
    }
}

#Preview {
    ContentView()
        .modelContainer(for: [PersistentBill.self, PersistentItem.self, PersistentPerson.self], inMemory: true)
}
