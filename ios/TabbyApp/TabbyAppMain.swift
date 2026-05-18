import SwiftUI
import SwiftData
import Foundation
import ClerkKit
import ClerkKitUI

@main
struct TabbyAppMain: App {

    @State private var viewModel = BillViewModel()

    init() {
        TBFontRegistration.registerFonts()
        #if os(iOS)
        TBAppearance.configure()
        Clerk.configure(publishableKey: ClerkConfig.publishableKey)
        #endif
    }

    var sharedModelContainer: ModelContainer = {
        // SwiftData uses Core Data under the hood; ensure Application Support exists before
        // the store is created so first launch does not log recovery noise (errno 2 / NSCocoa 512).
        if let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first {
            try? FileManager.default.createDirectory(at: appSupport, withIntermediateDirectories: true)
        }

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
                #if os(iOS)
                .prefetchClerkImages()
                #endif
                .environment(Clerk.shared)
                .task {
                    AuthService.shared.syncFromClerk()
                    await APIClient.shared.setAuthTokenProvider {
                        await AuthService.shared.getAccessToken()
                    }
                }
                .onOpenURL { url in
                    if let token = DeepLinkHandler.extractBillToken(from: url) {
                        Task {
                            await viewModel.loadBill(token: token, navigateToItemList: true)
                        }
                    }
                }
        }
        .modelContainer(sharedModelContainer)
    }
}
