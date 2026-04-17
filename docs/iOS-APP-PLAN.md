# Tabby iOS App - Implementation Plan

## Tech Stack
- **UI Framework**: SwiftUI
- **State Management**: @Observable + Combine
- **Networking**: URLSession + async/await
- **Database**: Supabase Swift SDK
- **Local Cache**: SwiftData (iOS 17+)
- **Camera**: AVFoundation

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                    Views                         │
│  (SwiftUI screens: Welcome, ItemList, Assign)   │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│               ViewModels (@Observable)           │
│  BillViewModel, ScannerViewModel, HistoryVM     │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                   Services                       │
│  BillService, OCRService, ShareService          │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│              Core (Pure Swift)                   │
│  BillCalculator, Models, Utilities              │
└─────────────────────────────────────────────────┘
```

---

## File Structure

```
Tabby/
├── App/
│   ├── TabbyApp.swift              # @main entry point
│   └── AppState.swift              # Global app state
│
├── Core/
│   ├── Models/
│   │   ├── Bill.swift              # Bill model
│   │   ├── Item.swift              # Item model
│   │   ├── Person.swift            # Person model
│   │   └── ItemShare.swift         # Share mapping
│   │
│   ├── Calculator/
│   │   ├── BillCalculator.swift    # PORT: computeTotals.ts
│   │   └── PennyReconciler.swift   # Penny distribution logic
│   │
│   └── Utilities/
│       ├── Money.swift             # Decimal money handling
│       └── EmojiMapper.swift       # Food → emoji mapping
│
├── Services/
│   ├── API/
│   │   ├── APIClient.swift         # Base URLSession client
│   │   ├── BillAPI.swift           # Bills CRUD
│   │   └── OCRAPI.swift            # Receipt scanning
│   │
│   ├── Supabase/
│   │   └── SupabaseClient.swift    # Supabase Swift SDK
│   │
│   └── Storage/
│       ├── BillCache.swift         # SwiftData local cache
│       └── ImageCache.swift        # Receipt image cache
│
├── ViewModels/
│   ├── BillViewModel.swift         # Main bill state
│   ├── ScannerViewModel.swift      # Camera + OCR
│   ├── HistoryViewModel.swift      # Past bills
│   └── ShareViewModel.swift        # Share link generation
│
├── Views/
│   ├── Screens/
│   │   ├── WelcomeView.swift       # Landing/splash
│   │   ├── ScannerView.swift       # Camera capture
│   │   ├── ItemListView.swift      # View/edit items
│   │   ├── AssignView.swift        # Assign items to people
│   │   ├── SummaryView.swift       # Final breakdown
│   │   ├── ShareView.swift         # Share receipt
│   │   └── HistoryView.swift       # Past bills
│   │
│   ├── Components/
│   │   ├── ItemRow.swift           # Single item display
│   │   ├── PersonChip.swift        # Person pill/chip
│   │   ├── PeopleDock.swift        # Horizontal people list
│   │   ├── TotalsCard.swift        # Subtotal/tax/tip/total
│   │   ├── WeightSlider.swift      # Split weight adjustment
│   │   ├── EmojiPicker.swift       # Food emoji selector
│   │   └── LoadingOverlay.swift    # Loading state
│   │
│   └── Shared/
│       ├── PrimaryButton.swift     # Main action button
│       ├── SecondaryButton.swift   # Secondary actions
│       ├── InputField.swift        # Text input
│       └── SheetModifier.swift     # Bottom sheet styling
│
└── Resources/
    ├── Assets.xcassets             # App icons, colors
    ├── Localizable.strings         # i18n
    └── Info.plist                  # App config
```

---

## Phase 1: Core Foundation

### 1.1 Port BillCalculator (CRITICAL)

**Source**: `src/lib/computeTotals.ts`
**Target**: `Core/Calculator/BillCalculator.swift`

```swift
import Foundation

struct BillCalculator {

    struct BillTotals {
        let subtotal: Decimal
        let discount: Decimal
        let serviceFee: Decimal
        let tax: Decimal
        let tip: Decimal
        let grandTotal: Decimal
        let personTotals: [PersonTotal]
        let pennyReconciliation: PennyReconciliation
    }

    struct PersonTotal {
        let personId: String
        let name: String
        let subtotal: Decimal
        let discountShare: Decimal
        let serviceFeeShare: Decimal
        let taxShare: Decimal
        let tipShare: Decimal
        let total: Decimal
        let items: [AssignedItem]
    }

    struct AssignedItem {
        let itemId: String
        let emoji: String
        let label: String
        let price: Decimal
        let quantity: Int
        let weight: Decimal
        let shareAmount: Decimal
    }

    struct PennyReconciliation {
        let distributed: Decimal
        let method: String = "distribute_largest"
    }

    enum SplitMode {
        case proportional
        case even
    }

    /// Main calculation function - PORT EXACTLY from computeTotals.ts
    static func computeTotals(
        items: [Item],
        shares: [ItemShare],
        people: [Person],
        tax: Decimal,
        tip: Decimal,
        discount: Decimal = 0,
        serviceFee: Decimal = 0,
        taxMode: SplitMode = .proportional,
        tipMode: SplitMode = .proportional,
        includeZeroPeople: Bool = true
    ) -> BillTotals {
        // 1. Calculate subtotal
        let subtotal = items.reduce(Decimal.zero) { $0 + $1.price }
        let grandTotal = subtotal - discount + serviceFee + tax + tip

        // 2. Build lookup maps
        let itemMap = Dictionary(uniqueKeysWithValues: items.map { ($0.id, $0) })

        // 3. Initialize person totals
        var personTotals = people.map { person in
            PersonTotal(
                personId: person.id,
                name: person.name,
                subtotal: 0,
                discountShare: 0,
                serviceFeeShare: 0,
                taxShare: 0,
                tipShare: 0,
                total: 0,
                items: []
            )
        }
        var personTotalMap = Dictionary(uniqueKeysWithValues: personTotals.enumerated().map { ($1.personId, $0) })

        // 4. Calculate weight totals per item
        var itemWeightTotals: [String: Decimal] = [:]
        for share in shares {
            itemWeightTotals[share.itemId, default: 0] += share.weight
        }

        // 5. Distribute items to people
        for share in shares {
            guard let item = itemMap[share.itemId],
                  let index = personTotalMap[share.personId] else { continue }

            let totalWeight = itemWeightTotals[share.itemId] ?? 1
            let shareRatio = share.weight / totalWeight
            let shareAmount = item.price * shareRatio

            personTotals[index].subtotal += shareAmount
            personTotals[index].items.append(AssignedItem(
                itemId: share.itemId,
                emoji: item.emoji ?? "📦",
                label: item.label,
                price: item.price,
                quantity: item.quantity,
                weight: share.weight,
                shareAmount: shareAmount
            ))
        }

        // 6. Calculate discount shares (always proportional)
        if subtotal > 0 {
            for i in personTotals.indices {
                personTotals[i].discountShare = (personTotals[i].subtotal / subtotal) * discount
            }
        }

        // 7. Calculate service fee shares (always proportional)
        if subtotal > 0 {
            for i in personTotals.indices {
                personTotals[i].serviceFeeShare = (personTotals[i].subtotal / subtotal) * serviceFee
            }
        }

        // 8. Calculate tax shares
        switch taxMode {
        case .proportional:
            if subtotal > 0 {
                for i in personTotals.indices {
                    personTotals[i].taxShare = (personTotals[i].subtotal / subtotal) * tax
                }
            }
        case .even:
            let relevantPeople = includeZeroPeople ? personTotals : personTotals.filter { $0.subtotal > 0 }
            if !relevantPeople.isEmpty {
                let taxPerPerson = tax / Decimal(relevantPeople.count)
                for i in personTotals.indices where includeZeroPeople || personTotals[i].subtotal > 0 {
                    personTotals[i].taxShare = taxPerPerson
                }
            }
        }

        // 9. Calculate tip shares
        switch tipMode {
        case .proportional:
            if subtotal > 0 {
                for i in personTotals.indices {
                    personTotals[i].tipShare = (personTotals[i].subtotal / subtotal) * tip
                }
            }
        case .even:
            let relevantPeople = includeZeroPeople ? personTotals : personTotals.filter { $0.subtotal > 0 }
            if !relevantPeople.isEmpty {
                let tipPerPerson = tip / Decimal(relevantPeople.count)
                for i in personTotals.indices where includeZeroPeople || personTotals[i].subtotal > 0 {
                    personTotals[i].tipShare = tipPerPerson
                }
            }
        }

        // 10. Calculate raw totals
        for i in personTotals.indices {
            personTotals[i].total = personTotals[i].subtotal
                - personTotals[i].discountShare
                + personTotals[i].serviceFeeShare
                + personTotals[i].taxShare
                + personTotals[i].tipShare
        }

        // 11. Penny reconciliation
        let reconciled = PennyReconciler.reconcile(personTotals: &personTotals, targetTotal: grandTotal)

        return BillTotals(
            subtotal: subtotal,
            discount: discount,
            serviceFee: serviceFee,
            tax: tax,
            tip: tip,
            grandTotal: grandTotal,
            personTotals: personTotals,
            pennyReconciliation: reconciled
        )
    }
}
```

### 1.2 Models

```swift
// Core/Models/Bill.swift
struct Bill: Identifiable, Codable {
    let id: String
    var title: String
    var place: String?
    var date: Date?
    var subtotal: Decimal
    var tax: Decimal
    var tip: Decimal
    var discount: Decimal
    var serviceFee: Decimal
    var editorToken: String
    var viewerToken: String
    var receiptImagePath: String?
    let createdAt: Date
    var updatedAt: Date
}

// Core/Models/Item.swift
struct Item: Identifiable, Codable {
    let id: String
    var billId: String
    var label: String
    var emoji: String?
    var quantity: Int
    var unitPrice: Decimal
    var price: Decimal { Decimal(quantity) * unitPrice }
}

// Core/Models/Person.swift
struct Person: Identifiable, Codable {
    let id: String
    var billId: String
    var name: String
    var avatarUrl: String?
    var venmoHandle: String?
    var isArchived: Bool
}

// Core/Models/ItemShare.swift
struct ItemShare: Codable {
    let itemId: String
    let personId: String
    var weight: Decimal  // 0.0 to 1.0
}
```

---

## Phase 2: Services Layer

### 2.1 API Client

```swift
// Services/API/APIClient.swift
actor APIClient {
    static let shared = APIClient()

    private let baseURL = URL(string: "https://tabby.dev/api")!
    private let session = URLSession.shared

    struct APIError: Error {
        let message: String
        let code: String?
    }

    func fetch<T: Decodable>(_ endpoint: String, method: String = "GET", body: Encodable? = nil) async throws -> T {
        var request = URLRequest(url: baseURL.appendingPathComponent(endpoint))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let body = body {
            request.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError(message: "Invalid response", code: nil)
        }

        guard 200..<300 ~= httpResponse.statusCode else {
            let errorBody = try? JSONDecoder().decode(APIErrorResponse.self, from: data)
            throw APIError(message: errorBody?.error ?? "Request failed", code: errorBody?.code)
        }

        return try JSONDecoder().decode(T.self, from: data)
    }
}
```

### 2.2 Bill Service

```swift
// Services/API/BillAPI.swift
class BillAPI {
    private let client = APIClient.shared

    func fetchBill(token: String) async throws -> BillResponse {
        return try await client.fetch("/receipts/\(token)")
    }

    func createBill(_ bill: CreateBillRequest) async throws -> Bill {
        return try await client.fetch("/receipts/create", method: "POST", body: bill)
    }

    func updateBill(token: String, updates: BillUpdateRequest) async throws -> Bill {
        return try await client.fetch("/receipts/\(token)/update", method: "POST", body: updates)
    }

    func updateAssignments(token: String, people: [Person], shares: [ItemShare]) async throws {
        let request = AssignmentUpdateRequest(editorToken: token, people: people, shares: shares)
        let _: EmptyResponse = try await client.fetch("/receipts/\(token)/assign", method: "POST", body: request)
    }
}
```

### 2.3 OCR Service

```swift
// Services/API/OCRAPI.swift
class OCRAPI {
    private let client = APIClient.shared

    struct ScanResult: Decodable {
        let items: [ScannedItem]
        let total: Decimal
        let subtotal: Decimal
        let tax: Decimal
        let tip: Decimal
        let place: String?
        let date: String?
    }

    struct ScannedItem: Decodable {
        let label: String
        let price: Decimal
        let emoji: String?
    }

    func scanReceipt(imageData: Data) async throws -> ScanResult {
        // Multipart form upload
        var request = URLRequest(url: URL(string: "https://tabby.dev/api/scan-receipt")!)
        request.httpMethod = "POST"

        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"receipt.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(ScanResult.self, from: data)
    }
}
```

---

## Phase 3: ViewModels

### 3.1 Main Bill ViewModel

```swift
// ViewModels/BillViewModel.swift
import SwiftUI
import Combine

@Observable
class BillViewModel {
    // State
    var bill: Bill?
    var items: [Item] = []
    var people: [Person] = []
    var shares: [ItemShare] = []
    var isLoading = false
    var error: String?

    // Computed totals (using BillCalculator)
    var billTotals: BillCalculator.BillTotals? {
        guard !items.isEmpty else { return nil }
        return BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: bill?.tax ?? 0,
            tip: bill?.tip ?? 0,
            discount: bill?.discount ?? 0,
            serviceFee: bill?.serviceFee ?? 0
        )
    }

    // Services
    private let billAPI = BillAPI()

    // MARK: - Actions

    func loadBill(token: String) async {
        isLoading = true
        defer { isLoading = false }

        do {
            let response = try await billAPI.fetchBill(token: token)
            bill = response.bill
            items = response.items
            people = response.people
            shares = response.shares
        } catch {
            self.error = error.localizedDescription
        }
    }

    func addItem(_ item: Item) {
        items.append(item)
        // Debounced save...
    }

    func assignItem(_ itemId: String, to personId: String) {
        // Check if share exists
        if let index = shares.firstIndex(where: { $0.itemId == itemId && $0.personId == personId }) {
            // Remove (toggle off)
            shares.remove(at: index)
        } else {
            // Add share
            shares.append(ItemShare(itemId: itemId, personId: personId, weight: 1.0))
        }

        // Recalculate weights for shared items
        recalculateWeights(for: itemId)
    }

    private func recalculateWeights(for itemId: String) {
        let itemShares = shares.filter { $0.itemId == itemId }
        guard itemShares.count > 1 else { return }

        let evenWeight = Decimal(1) / Decimal(itemShares.count)
        for i in shares.indices where shares[i].itemId == itemId {
            shares[i].weight = evenWeight
        }
    }

    func getPersonTotal(_ personId: String) -> Decimal {
        billTotals?.personTotals.first(where: { $0.personId == personId })?.total ?? 0
    }
}
```

---

## Phase 4: Views

### 4.1 Main Tab View

```swift
// Views/Screens/MainTabView.swift
struct MainTabView: View {
    @State private var selectedTab = 0
    @StateObject private var billVM = BillViewModel()

    var body: some View {
        TabView(selection: $selectedTab) {
            WelcomeView()
                .tabItem { Label("Scan", systemImage: "camera") }
                .tag(0)

            ItemListView(viewModel: billVM)
                .tabItem { Label("Items", systemImage: "list.bullet") }
                .tag(1)

            AssignView(viewModel: billVM)
                .tabItem { Label("Split", systemImage: "person.2") }
                .tag(2)

            SummaryView(viewModel: billVM)
                .tabItem { Label("Total", systemImage: "dollarsign.circle") }
                .tag(3)

            HistoryView()
                .tabItem { Label("History", systemImage: "clock") }
                .tag(4)
        }
    }
}
```

### 4.2 Item List View

```swift
// Views/Screens/ItemListView.swift
struct ItemListView: View {
    @Bindable var viewModel: BillViewModel
    @State private var showAddItem = false

    var body: some View {
        NavigationStack {
            List {
                ForEach(viewModel.items) { item in
                    ItemRow(item: item)
                        .swipeActions {
                            Button(role: .destructive) {
                                viewModel.deleteItem(item.id)
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                }

                Section {
                    Button {
                        showAddItem = true
                    } label: {
                        Label("Add Item", systemImage: "plus")
                    }
                }
            }
            .navigationTitle("Items")
            .sheet(isPresented: $showAddItem) {
                AddItemSheet(viewModel: viewModel)
            }
        }
    }
}
```

### 4.3 Assignment View

```swift
// Views/Screens/AssignView.swift
struct AssignView: View {
    @Bindable var viewModel: BillViewModel
    @State private var selectedPerson: Person?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // People dock (horizontal scroll)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(viewModel.people) { person in
                            PersonChip(
                                person: person,
                                total: viewModel.getPersonTotal(person.id),
                                isSelected: selectedPerson?.id == person.id
                            )
                            .onTapGesture {
                                selectedPerson = person
                            }
                        }

                        AddPersonButton {
                            // Show add person sheet
                        }
                    }
                    .padding()
                }
                .background(Color(.systemGroupedBackground))

                Divider()

                // Items grid
                if let person = selectedPerson {
                    ItemsAssignmentGrid(
                        items: viewModel.items,
                        shares: viewModel.shares,
                        person: person,
                        onToggle: { itemId in
                            viewModel.assignItem(itemId, to: person.id)
                        }
                    )
                } else {
                    ContentUnavailableView(
                        "Select a Person",
                        systemImage: "person.crop.circle.badge.questionmark",
                        description: Text("Tap a person above to assign items")
                    )
                }
            }
            .navigationTitle("Assign Items")
        }
    }
}

struct ItemsAssignmentGrid: View {
    let items: [Item]
    let shares: [ItemShare]
    let person: Person
    let onToggle: (String) -> Void

    var body: some View {
        ScrollView {
            LazyVGrid(columns: [.init(.adaptive(minimum: 100))], spacing: 12) {
                ForEach(items) { item in
                    let isAssigned = shares.contains { $0.itemId == item.id && $0.personId == person.id }

                    ItemPill(item: item, isAssigned: isAssigned)
                        .onTapGesture {
                            onToggle(item.id)
                        }
                }
            }
            .padding()
        }
    }
}
```

### 4.4 Summary View

```swift
// Views/Screens/SummaryView.swift
struct SummaryView: View {
    @Bindable var viewModel: BillViewModel

    var body: some View {
        NavigationStack {
            List {
                if let totals = viewModel.billTotals {
                    // Per-person breakdown
                    Section("People") {
                        ForEach(totals.personTotals, id: \.personId) { personTotal in
                            PersonTotalRow(personTotal: personTotal)
                        }
                    }

                    // Bill totals
                    Section("Bill Total") {
                        LabeledContent("Subtotal", value: totals.subtotal.currencyFormatted)

                        if totals.discount > 0 {
                            LabeledContent("Discount", value: "-\(totals.discount.currencyFormatted)")
                                .foregroundStyle(.green)
                        }

                        if totals.serviceFee > 0 {
                            LabeledContent("Service Fee", value: totals.serviceFee.currencyFormatted)
                        }

                        LabeledContent("Tax", value: totals.tax.currencyFormatted)
                        LabeledContent("Tip", value: totals.tip.currencyFormatted)

                        LabeledContent("Total", value: totals.grandTotal.currencyFormatted)
                            .fontWeight(.bold)
                    }

                    // Penny reconciliation note
                    if totals.pennyReconciliation.distributed != 0 {
                        Section {
                            Text("Due to rounding, \(totals.pennyReconciliation.distributed.currencyFormatted) was adjusted to ensure accuracy.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Summary")
            .toolbar {
                Button {
                    // Share action
                } label: {
                    Label("Share", systemImage: "square.and.arrow.up")
                }
            }
        }
    }
}

struct PersonTotalRow: View {
    let personTotal: BillCalculator.PersonTotal
    @State private var isExpanded = false

    var body: some View {
        DisclosureGroup(isExpanded: $isExpanded) {
            // Breakdown
            VStack(alignment: .leading, spacing: 4) {
                ForEach(personTotal.items, id: \.itemId) { item in
                    HStack {
                        Text(item.emoji)
                        Text(item.label)
                            .lineLimit(1)
                        Spacer()
                        if item.weight < 1 {
                            Text("\(Int(item.weight * 100))%")
                                .foregroundStyle(.secondary)
                        }
                        Text(item.shareAmount.currencyFormatted)
                    }
                    .font(.subheadline)
                }

                Divider()

                LabeledContent("Subtotal", value: personTotal.subtotal.currencyFormatted)
                    .font(.caption)
                if personTotal.discountShare > 0 {
                    LabeledContent("Discount", value: "-\(personTotal.discountShare.currencyFormatted)")
                        .font(.caption)
                }
                LabeledContent("Tax", value: personTotal.taxShare.currencyFormatted)
                    .font(.caption)
                LabeledContent("Tip", value: personTotal.tipShare.currencyFormatted)
                    .font(.caption)
            }
        } label: {
            HStack {
                Text(personTotal.name)
                Spacer()
                Text(personTotal.total.currencyFormatted)
                    .fontWeight(.semibold)
            }
        }
    }
}
```

---

## Phase 5: Camera & OCR

### 5.1 Scanner View

```swift
// Views/Screens/ScannerView.swift
struct ScannerView: View {
    @StateObject private var viewModel = ScannerViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            CameraPreview(session: viewModel.session)
                .ignoresSafeArea()

            VStack {
                Spacer()

                // Capture button
                Button {
                    viewModel.capturePhoto()
                } label: {
                    Circle()
                        .fill(.white)
                        .frame(width: 70, height: 70)
                        .overlay(
                            Circle()
                                .stroke(.white.opacity(0.5), lineWidth: 4)
                                .frame(width: 80, height: 80)
                        )
                }
                .padding(.bottom, 30)
            }

            // Loading overlay
            if viewModel.isProcessing {
                Color.black.opacity(0.7)
                    .ignoresSafeArea()

                VStack(spacing: 16) {
                    ProgressView()
                        .tint(.white)
                    Text(viewModel.processingStatus)
                        .foregroundStyle(.white)
                }
            }
        }
        .onAppear {
            viewModel.startSession()
        }
        .onDisappear {
            viewModel.stopSession()
        }
        .onChange(of: viewModel.scanResult) { _, result in
            if result != nil {
                dismiss()
            }
        }
    }
}

// ViewModels/ScannerViewModel.swift
@Observable
class ScannerViewModel: NSObject {
    let session = AVCaptureSession()
    var isProcessing = false
    var processingStatus = ""
    var scanResult: OCRAPI.ScanResult?

    private let ocrAPI = OCRAPI()
    private let photoOutput = AVCapturePhotoOutput()

    func startSession() {
        // Configure AVCaptureSession...
    }

    func stopSession() {
        session.stopRunning()
    }

    func capturePhoto() {
        let settings = AVCapturePhotoSettings()
        photoOutput.capturePhoto(with: settings, delegate: self)
    }
}

extension ScannerViewModel: AVCapturePhotoCaptureDelegate {
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard let imageData = photo.fileDataRepresentation() else { return }

        Task {
            isProcessing = true
            processingStatus = "Uploading..."

            do {
                processingStatus = "Parsing receipt..."
                scanResult = try await ocrAPI.scanReceipt(imageData: imageData)
            } catch {
                // Handle error
            }

            isProcessing = false
        }
    }
}
```

---

## Phase 6: Testing

### 6.1 BillCalculator Tests

```swift
// Tests/BillCalculatorTests.swift
import XCTest
@testable import Tabby

final class BillCalculatorTests: XCTestCase {

    func testBasicCalculation() {
        let items = [
            Item(id: "1", billId: "b1", label: "Pizza", emoji: "🍕", quantity: 1, unitPrice: 20),
            Item(id: "2", billId: "b1", label: "Beer", emoji: "🍺", quantity: 1, unitPrice: 8)
        ]

        let people = [
            Person(id: "p1", billId: "b1", name: "Alice"),
            Person(id: "p2", billId: "b1", name: "Bob")
        ]

        let shares = [
            ItemShare(itemId: "1", personId: "p1", weight: 0.5),
            ItemShare(itemId: "1", personId: "p2", weight: 0.5),
            ItemShare(itemId: "2", personId: "p1", weight: 1.0)
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: 2.52,
            tip: 5.0,
            discount: 2.0,
            serviceFee: 0
        )

        XCTAssertEqual(result.subtotal, 28)
        XCTAssertEqual(result.grandTotal, 33.52)

        let aliceTotal = result.personTotals.first { $0.personId == "p1" }?.total ?? 0
        let bobTotal = result.personTotals.first { $0.personId == "p2" }?.total ?? 0

        // Verify penny reconciliation: totals must sum exactly
        XCTAssertEqual(aliceTotal + bobTotal, result.grandTotal)
    }

    func testPennyReconciliation() {
        // Test case that produces rounding errors
        let items = [
            Item(id: "1", billId: "b1", label: "Item", emoji: "📦", quantity: 1, unitPrice: 10)
        ]

        let people = [
            Person(id: "p1", billId: "b1", name: "A"),
            Person(id: "p2", billId: "b1", name: "B"),
            Person(id: "p3", billId: "b1", name: "C")
        ]

        let shares = [
            ItemShare(itemId: "1", personId: "p1", weight: Decimal(1)/3),
            ItemShare(itemId: "1", personId: "p2", weight: Decimal(1)/3),
            ItemShare(itemId: "1", personId: "p3", weight: Decimal(1)/3)
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: 1.0,
            tip: 0,
            discount: 0,
            serviceFee: 0
        )

        let sum = result.personTotals.reduce(Decimal.zero) { $0 + $1.total }
        XCTAssertEqual(sum, result.grandTotal, "Person totals must sum to grand total exactly")
    }
}
```

---

## Development Timeline

| Phase | Focus | Deliverable |
|-------|-------|-------------|
| **1** | Core | BillCalculator, Models, API Client |
| **2** | Data | Supabase integration, local caching |
| **3** | UI | All screens (Welcome, Items, Assign, Summary) |
| **4** | Camera | AVFoundation scanner, OCR integration |
| **5** | Polish | Animations, error handling, edge cases |
| **6** | Testing | Unit tests, UI tests, TestFlight |

---

## Key Decisions Made

1. **SwiftUI** - Native feel, modern API, iOS 17+ only
2. **@Observable** - New observation framework (cleaner than ObservableObject)
3. **Decimal** - For all money calculations (avoids floating point errors)
4. **SwiftData** - Local caching (simpler than Core Data)
5. **URLSession** - Native networking (no external dependencies)
6. **Tap-to-assign** - iOS pattern instead of drag-drop

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Math drift from web | Port computeTotals.ts line-by-line, extensive test coverage |
| OCR latency | Show progress, allow manual entry fallback |
| Offline use | SwiftData local cache, sync queue for changes |
| Large bills | Virtualized lists with LazyVStack |

---

## Next Steps

1. **Create Xcode project** with structure above
2. **Port BillCalculator** with matching test cases from web
3. **Implement API client** with Supabase Swift SDK
4. **Build ItemList view** first (simplest screen)
5. **Add camera integration** last (most complex)
