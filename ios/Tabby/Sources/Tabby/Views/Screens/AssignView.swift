import SwiftUI

// MARK: - Cross-platform Color Extension

private extension Color {
    static var systemGroupedBackground: Color {
        #if os(iOS)
        Color(uiColor: .systemGroupedBackground)
        #else
        Color(nsColor: .windowBackgroundColor)
        #endif
    }

    static var systemBackground: Color {
        #if os(iOS)
        Color(uiColor: .systemBackground)
        #else
        Color(nsColor: .textBackgroundColor)
        #endif
    }

    static var secondarySystemGroupedBackground: Color {
        #if os(iOS)
        Color(uiColor: .secondarySystemGroupedBackground)
        #else
        Color(nsColor: .controlBackgroundColor)
        #endif
    }

    static var systemGray4: Color {
        #if os(iOS)
        Color(uiColor: .systemGray4)
        #else
        Color(nsColor: .systemGray)
        #endif
    }
}

/// Main item assignment interface for splitting bills between people.
/// Features a horizontal "People Dock" at the top and a grid of items below.
struct AssignView: View {
    @Bindable var viewModel: BillViewModel

    @State private var selectedPersonId: String?
    @State private var showAddPersonSheet = false
    @State private var showSummary = false

    private let currencyFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter
    }()

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        VStack(spacing: 0) {
            // MARK: - People Dock
            peopleDock

            Divider()

            // MARK: - Items Grid
            itemsGrid

            // MARK: - Bottom Bar
            bottomBar
        }
        .navigationTitle("Assign Items")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            #if os(iOS)
            ToolbarItem(placement: .navigationBarTrailing) {
                doneButton
            }
            #else
            ToolbarItem(placement: .automatic) {
                doneButton
            }
            #endif
        }
        .sheet(isPresented: $showAddPersonSheet) {
            AddPersonSheet(viewModel: viewModel)
        }
        .navigationDestination(isPresented: $showSummary) {
            SummaryView(viewModel: viewModel)
        }
        .onAppear {
            // Auto-select first person if none selected
            if selectedPersonId == nil {
                selectedPersonId = viewModel.people.first?.id
            }
        }
    }

    private var doneButton: some View {
        Button("Done") {
            showSummary = true
        }
        .fontWeight(.semibold)
    }

    // MARK: - People Dock

    private var peopleDock: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                ForEach(viewModel.people) { person in
                    PersonDockItem(
                        person: person,
                        total: viewModel.getPersonTotal(personId: person.id),
                        isSelected: selectedPersonId == person.id,
                        currencyFormatter: currencyFormatter
                    )
                    .onTapGesture {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            selectedPersonId = person.id
                        }
                    }
                }

                // Add Person Button
                addPersonButton
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(Color.systemGroupedBackground)
    }

    private var addPersonButton: some View {
        Button {
            showAddPersonSheet = true
        } label: {
            VStack(spacing: 6) {
                ZStack {
                    Circle()
                        .strokeBorder(Color.accentColor, style: StrokeStyle(lineWidth: 2, dash: [6, 3]))
                        .frame(width: 56, height: 56)

                    Image(systemName: "plus")
                        .font(.title2)
                        .foregroundStyle(Color.accentColor)
                }

                Text("Add")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Text(" ")
                    .font(.caption2)
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: - Items Grid

    private var itemsGrid: some View {
        ScrollView {
            if viewModel.items.isEmpty {
                emptyItemsView
            } else {
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(viewModel.items) { item in
                        ItemCard(
                            item: item,
                            isAssigned: isItemAssignedToSelectedPerson(item),
                            splitPercentage: getSplitPercentage(for: item),
                            currencyFormatter: currencyFormatter
                        )
                        .onTapGesture {
                            toggleItemAssignment(item)
                        }
                    }
                }
                .padding(16)
            }
        }
        .background(Color.systemBackground)
    }

    private var emptyItemsView: some View {
        VStack(spacing: 16) {
            Image(systemName: "tray")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("No Items")
                .font(.title3)
                .fontWeight(.medium)

            Text("Add items to the bill to start assigning them to people.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Bottom Bar

    private var bottomBar: some View {
        VStack(spacing: 8) {
            Divider()

            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Assigned Items")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Text("\(assignedItemCount) of \(viewModel.items.count)")
                        .font(.headline)
                }

                Spacer()

                if let personId = selectedPersonId,
                   let person = viewModel.people.first(where: { $0.id == personId }) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("\(person.name)'s Total")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Text(formatCurrency(viewModel.getPersonTotal(personId: personId)))
                            .font(.headline)
                            .foregroundStyle(Color.accentColor)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
        .background(Color.systemGroupedBackground)
    }

    // MARK: - Helper Methods

    private func isItemAssignedToSelectedPerson(_ item: BillItem) -> Bool {
        guard let personId = selectedPersonId else { return false }
        return viewModel.isItemAssignedTo(itemId: item.id, personId: personId)
    }

    private func getSplitPercentage(for item: BillItem) -> Int? {
        // Count how many people have this item assigned
        let assigneeCount = viewModel.people.filter { person in
            viewModel.isItemAssignedTo(itemId: item.id, personId: person.id)
        }.count

        // Only show percentage if item is shared (more than 1 person)
        guard assigneeCount > 1 else { return nil }

        return 100 / assigneeCount
    }

    private func toggleItemAssignment(_ item: BillItem) {
        guard let personId = selectedPersonId else { return }

        withAnimation(.easeInOut(duration: 0.15)) {
            viewModel.assignItem(itemId: item.id, to: personId)
        }
    }

    private var assignedItemCount: Int {
        // Count items that have at least one person assigned
        viewModel.items.filter { item in
            viewModel.people.contains { person in
                viewModel.isItemAssignedTo(itemId: item.id, personId: person.id)
            }
        }.count
    }

    private func formatCurrency(_ value: Decimal) -> String {
        currencyFormatter.string(from: value as NSDecimalNumber) ?? "$0.00"
    }
}

// MARK: - Person Dock Item

private struct PersonDockItem: View {
    let person: BillPerson
    let total: Decimal
    let isSelected: Bool
    let currencyFormatter: NumberFormatter

    var body: some View {
        VStack(spacing: 6) {
            // Avatar Circle
            ZStack {
                Circle()
                    .fill(isSelected ? Color.accentColor : Color.systemGray4)
                    .frame(width: 56, height: 56)

                Text(personInitials)
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundStyle(isSelected ? .white : .primary)
            }
            .overlay {
                if isSelected {
                    Circle()
                        .strokeBorder(Color.accentColor, lineWidth: 3)
                        .frame(width: 64, height: 64)
                }
            }

            // Name
            Text(person.name)
                .font(.caption)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundStyle(isSelected ? .primary : .secondary)
                .lineLimit(1)

            // Total
            Text(formatCurrency(total))
                .font(.caption2)
                .foregroundStyle(isSelected ? Color.accentColor : .secondary)
        }
        .frame(width: 72)
    }

    private var personInitials: String {
        let components = person.name.split(separator: " ")
        if components.count >= 2 {
            return String(components[0].prefix(1) + components[1].prefix(1)).uppercased()
        } else if let first = components.first {
            return String(first.prefix(2)).uppercased()
        }
        return "?"
    }

    private func formatCurrency(_ value: Decimal) -> String {
        currencyFormatter.string(from: value as NSDecimalNumber) ?? "$0.00"
    }
}

// MARK: - Item Card

private struct ItemCard: View {
    let item: BillItem
    let isAssigned: Bool
    let splitPercentage: Int?
    let currencyFormatter: NumberFormatter

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                // Emoji
                Text(item.emoji ?? "")
                    .font(.title2)

                Spacer()

                // Assignment indicator or split badge
                if isAssigned {
                    if let percentage = splitPercentage {
                        // Split indicator badge
                        Text("\(percentage)%")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.orange, in: Capsule())
                    } else {
                        // Checkmark for fully assigned
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(Color.accentColor)
                            .font(.title3)
                    }
                }
            }

            // Label
            Text(item.label)
                .font(.subheadline)
                .fontWeight(.medium)
                .lineLimit(2)
                .multilineTextAlignment(.leading)

            // Quantity and Price
            HStack {
                if item.quantity > 1 {
                    Text("x\(item.quantity as NSDecimalNumber)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Text(formatCurrency(item.price))
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(isAssigned ? Color.accentColor.opacity(0.1) : Color.secondarySystemGroupedBackground)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(isAssigned ? Color.accentColor : Color.clear, lineWidth: 2)
        )
    }

    private func formatCurrency(_ value: Decimal) -> String {
        currencyFormatter.string(from: value as NSDecimalNumber) ?? "$0.00"
    }
}

// MARK: - Preview

#Preview("Assign View") {
    NavigationStack {
        AssignView(viewModel: AssignView_previewViewModel())
    }
}

#Preview("Empty State") {
    NavigationStack {
        AssignView(viewModel: AssignView_emptyPreviewViewModel())
    }
}

// MARK: - Preview Helpers

private func AssignView_previewViewModel() -> BillViewModel {
    let vm = BillViewModel()

    // Set up a sample bill
    vm.bill = Bill(
        id: "preview-bill",
        title: "Dinner at Restaurant",
        subtotal: 85.50,
        tax: 7.25,
        tip: 15.00
    )

    // Add sample items
    vm.items = [
        BillItem(id: "item1", billId: "preview-bill", label: "Margherita Pizza", emoji: "pizza", quantity: 1, unitPrice: 18.99),
        BillItem(id: "item2", billId: "preview-bill", label: "Caesar Salad", emoji: "salad", quantity: 1, unitPrice: 12.50),
        BillItem(id: "item3", billId: "preview-bill", label: "Pasta Carbonara", emoji: "pasta", quantity: 1, unitPrice: 16.99),
        BillItem(id: "item4", billId: "preview-bill", label: "Garlic Bread", emoji: "bread", quantity: 2, unitPrice: 4.99),
        BillItem(id: "item5", billId: "preview-bill", label: "Tiramisu", emoji: "cake", quantity: 1, unitPrice: 8.99),
        BillItem(id: "item6", billId: "preview-bill", label: "Espresso", emoji: "coffee", quantity: 2, unitPrice: 3.50)
    ]

    // Add sample people
    vm.people = [
        BillPerson(id: "person1", billId: "preview-bill", name: "Alice"),
        BillPerson(id: "person2", billId: "preview-bill", name: "Bob"),
        BillPerson(id: "person3", billId: "preview-bill", name: "Charlie")
    ]

    // Add some sample shares
    vm.shares = [
        BillItemShare(itemId: "item1", personId: "person1", weight: 0.5),
        BillItemShare(itemId: "item1", personId: "person2", weight: 0.5),
        BillItemShare(itemId: "item2", personId: "person1", weight: 1),
        BillItemShare(itemId: "item3", personId: "person2", weight: 1),
        BillItemShare(itemId: "item4", personId: "person3", weight: 1)
    ]

    return vm
}

private func AssignView_emptyPreviewViewModel() -> BillViewModel {
    let vm = BillViewModel()

    vm.bill = Bill(id: "empty-bill", title: "New Bill")
    vm.people = [
        BillPerson(id: "person1", billId: "empty-bill", name: "Alice")
    ]

    return vm
}
