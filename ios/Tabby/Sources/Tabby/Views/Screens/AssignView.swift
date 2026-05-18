import SwiftUI

/// Assign screen — Milk & Clay (spec `02_ASSIGN_SCREEN_SPEC`)
struct AssignView: View {
    @Bindable var viewModel: BillViewModel

    @State private var selectedPersonId: String?
    @State private var showAddPersonSheet = false
    @State private var showSummary = false

    @State private var personEditingCredit: BillPerson?
    @State private var showAssignToast = false

    private let currencyFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter
    }()

    private let columns = [
        GridItem(.flexible(), spacing: TB.Space.md),
        GridItem(.flexible(), spacing: TB.Space.md)
    ]

    var body: some View {
        VStack(spacing: 0) {
            if viewModel.isReadOnly {
                Text("View-only link — assignments can’t be changed.")
                    .font(TB.Typography.meta())
                    .foregroundStyle(TB.Palette.inkSoft)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, TB.Space.sm)
                    .background(TB.Palette.surface2)
            }
            assignHeader
            pillStepper
            peopleDock
            itemsGrid
            bottomBar
        }
        .background(TB.Palette.bg)
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(TB.Palette.bg, for: .navigationBar)
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
        .sheet(item: $personEditingCredit) { person in
            PersonalCreditSheet(viewModel: viewModel, person: person)
        }
        .navigationDestination(isPresented: $showSummary) {
            SummaryView(viewModel: viewModel)
        }
        .onAppear {
            if selectedPersonId == nil {
                selectedPersonId = viewModel.people.first?.id
            }
        }
        .overlay(alignment: .bottom) {
            if showAssignToast {
                TBToast(message: "Assigned", systemImage: "checkmark.circle.fill")
                    .padding(.bottom, 100)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
    }

    private var doneButton: some View {
        Button("Done") {
            showSummary = true
        }
        .font(TB.Typography.buttonPrimary())
        .foregroundStyle(TB.Palette.clay)
    }

    // MARK: - Header

    private var assignHeader: some View {
        HStack(alignment: .top, spacing: TB.Space.lg) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Receipt")
                    .font(TB.Typography.eyebrow())
                    .tracking(2.2)
                    .textCase(.uppercase)
                    .foregroundStyle(TB.Palette.inkFaint)
                Text(viewModel.bill?.title ?? "Untitled")
                    .font(TB.Typography.display())
                    .foregroundStyle(TB.Palette.ink)
                    .lineLimit(1)
                if let created = viewModel.bill?.createdAt {
                    Text(metaDate(created))
                        .font(TB.Typography.meta())
                        .foregroundStyle(TB.Palette.inkFaint)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(alignment: .trailing, spacing: 6) {
                Text("Total")
                    .font(TB.Typography.eyebrow())
                    .tracking(2.2)
                    .textCase(.uppercase)
                    .foregroundStyle(TB.Palette.inkFaint)
                if let grand = viewModel.billTotals?.grandTotal {
                    Text(formatCurrency(grand))
                        .font(TB.Typography.moneyLarge())
                        .monospacedDigit()
                        .foregroundStyle(TB.Palette.clay)
                }
            }
        }
        .padding(.horizontal, TB.Space.xl)
        .padding(.top, 8)
        .padding(.bottom, TB.Space.md)
    }

    private func metaDate(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "MM.dd · EEE"
        return f.string(from: date)
    }

    // MARK: - Pills

    private var pillStepper: some View {
        HStack(spacing: TB.Space.sm) {
            Text("Scan")
                .tbPill(active: false)
            Text("People")
                .tbPill(active: false)
            Text("Assign")
                .tbPill(active: true)
        }
        .padding(.horizontal, TB.Space.xl)
        .padding(.bottom, TB.Space.md)
    }

    // MARK: - People rail

    private var peopleDock: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TB.Space.lg) {
                ForEach(Array(viewModel.people.enumerated()), id: \.element.id) { index, person in
                    PersonDockItem(
                        person: person,
                        index: index,
                        total: viewModel.getPersonTotal(personId: person.id),
                        isSelected: selectedPersonId == person.id,
                        itemCount: itemCount(for: person.id),
                        currencyFormatter: currencyFormatter
                    )
                    .onTapGesture {
                        withAnimation(.easeOut(duration: TB.Motion.fast)) {
                            selectedPersonId = person.id
                        }
                    }
                    .contextMenu {
                        if !viewModel.isReadOnly {
                            Button("Personal credit…") {
                                personEditingCredit = person
                            }
                        }
                    }
                }
                addPersonButton
            }
            .padding(.horizontal, TB.Space.xl)
            .padding(.vertical, TB.Space.md)
        }
    }

    private var addPersonButton: some View {
        Button {
            showAddPersonSheet = true
        } label: {
            VStack(spacing: 6) {
                ZStack {
                    Circle()
                        .strokeBorder(TB.Palette.clay, style: StrokeStyle(lineWidth: 2, dash: [6, 3]))
                        .frame(width: 56, height: 56)
                    Image(systemName: "plus")
                        .font(.title2)
                        .foregroundStyle(TB.Palette.clay)
                }
                Text("Add")
                    .font(TB.Typography.meta())
                    .foregroundStyle(TB.Palette.inkSoft)
                Text(" ")
                    .font(.caption2)
            }
        }
        .buttonStyle(.plain)
        .disabled(viewModel.isReadOnly)
    }

    // MARK: - Items

    private var itemsGrid: some View {
        ScrollView {
            if viewModel.items.isEmpty {
                emptyItemsView
            } else {
                LazyVGrid(columns: columns, spacing: TB.Space.md) {
                    ForEach(viewModel.items) { item in
                        ItemCard(
                            item: item,
                            isAssigned: isItemAssignedToSelectedPerson(item),
                            splitPercentage: getSplitPercentage(for: item),
                            currencyFormatter: currencyFormatter
                        )
                        .onTapGesture {
                            guard !viewModel.isReadOnly else { return }
                            toggleItemAssignment(item)
                        }
                    }
                }
                .padding(TB.Space.xl)
            }
        }
    }

    private var emptyItemsView: some View {
        VStack(spacing: TB.Space.lg) {
            Image(systemName: "tray")
                .font(.system(size: 48))
                .foregroundStyle(TB.Palette.inkFaint)
            Text("No items")
                .font(TB.Typography.display())
                .foregroundStyle(TB.Palette.ink)
            Text("Add items to the bill to start assigning them to people.")
                .font(TB.Typography.bodySoft())
                .foregroundStyle(TB.Palette.inkSoft)
                .multilineTextAlignment(.center)
        }
        .padding(TB.Space.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Bottom bar

    private var bottomBar: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(TB.Palette.rule)
                .frame(height: 1)
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Progress")
                        .font(TB.Typography.meta())
                        .foregroundStyle(TB.Palette.inkFaint)
                    Text("\(assignedItemCount) of \(viewModel.items.count) assigned")
                        .font(TB.Typography.body())
                        .foregroundStyle(TB.Palette.ink)
                }
                Spacer()
                if let personId = selectedPersonId,
                   let person = viewModel.people.first(where: { $0.id == personId }) {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(person.name)
                            .font(TB.Typography.bodySoft())
                            .foregroundStyle(TB.Palette.inkSoft)
                        Text(formatCurrency(viewModel.getPersonTotal(personId: personId)))
                            .font(TB.Typography.moneyLarge())
                            .monospacedDigit()
                            .foregroundStyle(TB.Palette.clay)
                    }
                }
            }
            .padding(.horizontal, TB.Space.xl)
            .padding(.vertical, TB.Space.md)
            .background(TB.Palette.bg)
        }
    }

    private func itemCount(for personId: String) -> Int {
        viewModel.items.filter { item in
            viewModel.isItemAssignedTo(itemId: item.id, personId: personId)
        }.count
    }

    private func isItemAssignedToSelectedPerson(_ item: BillItem) -> Bool {
        guard let personId = selectedPersonId else { return false }
        return viewModel.isItemAssignedTo(itemId: item.id, personId: personId)
    }

    private func getSplitPercentage(for item: BillItem) -> Int? {
        let assigneeCount = viewModel.people.filter { person in
            viewModel.isItemAssignedTo(itemId: item.id, personId: person.id)
        }.count
        guard assigneeCount > 1 else { return nil }
        return 100 / assigneeCount
    }

    private func toggleItemAssignment(_ item: BillItem) {
        guard let personId = selectedPersonId else { return }
        withAnimation(.easeOut(duration: TB.Motion.fast)) {
            viewModel.assignItem(itemId: item.id, to: personId)
        }
        showAssignToast = true
        Task {
            try? await Task.sleep(nanoseconds: 1_200_000_000)
            await MainActor.run {
                withAnimation(.easeOut(duration: TB.Motion.fast)) {
                    showAssignToast = false
                }
            }
        }
    }

    private var assignedItemCount: Int {
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

// MARK: - Person rail cell

private struct PersonDockItem: View {
    let person: BillPerson
    let index: Int
    let total: Decimal
    let isSelected: Bool
    let itemCount: Int
    let currencyFormatter: NumberFormatter

    var body: some View {
        VStack(spacing: 6) {
            ZStack(alignment: .topTrailing) {
                ZStack {
                    Text(personInitials)
                        .font(TB.Typography.avatarInitial())
                        .foregroundStyle(isSelected ? TB.Palette.bg : TB.Palette.ink)
                        .frame(width: 64, height: 64)
                        .background(isSelected ? TB.Palette.ink : TB.Palette.surface1)
                        .tbAvatarShape(variant: TBAvatarVariant.from(index: index))
                        .tbShadow(.md)
                }
                if itemCount > 0 {
                    TBCountBadge(count: itemCount)
                        .offset(x: 6, y: -6)
                }
            }

            Text(person.name)
                .font(TB.Typography.meta())
                .foregroundStyle(isSelected ? TB.Palette.ink : TB.Palette.inkSoft)
                .lineLimit(1)
                .frame(width: 72)

            Text(formatCurrency(total))
                .font(TB.Typography.moneySmall())
                .monospacedDigit()
                .foregroundStyle(TB.Palette.inkFaint)
        }
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

// MARK: - Item card

private struct ItemCard: View {
    let item: BillItem
    let isAssigned: Bool
    let splitPercentage: Int?
    let currencyFormatter: NumberFormatter

    var body: some View {
        VStack(alignment: .leading, spacing: TB.Space.sm) {
            HStack(alignment: .top) {
                Text(item.emoji ?? "")
                    .font(.title2)
                Spacer()
                if isAssigned {
                    if let percentage = splitPercentage {
                        Text("\(percentage)%")
                            .font(TB.Typography.meta())
                            .foregroundStyle(TB.Palette.surface1)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(TB.Palette.olive, in: Capsule())
                    } else {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(TB.Palette.clay)
                            .font(.title3)
                    }
                }
            }
            Text(item.label)
                .font(TB.Typography.body())
                .foregroundStyle(TB.Palette.ink)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
            HStack {
                if item.quantity > 1 {
                    Text("x\(item.quantity as NSDecimalNumber)")
                        .font(TB.Typography.meta())
                        .foregroundStyle(TB.Palette.inkFaint)
                }
                Spacer()
                Text(formatCurrency(item.price))
                    .font(TB.Typography.moneyMedium())
                    .monospacedDigit()
                    .foregroundStyle(isAssigned ? TB.Palette.inkFaint : TB.Palette.mustard)
            }
        }
        .padding(TB.Space.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(TB.Palette.surface1)
        .clipShape(RoundedRectangle(cornerRadius: TB.Radius.lg, style: .continuous))
        .tbShadow(.sm)
        .overlay(
            RoundedRectangle(cornerRadius: TB.Radius.lg, style: .continuous)
                .strokeBorder(isAssigned ? TB.Palette.clay.opacity(0.35) : Color.clear, lineWidth: 2)
        )
    }

    private func formatCurrency(_ value: Decimal) -> String {
        currencyFormatter.string(from: value as NSDecimalNumber) ?? "$0.00"
    }
}

// MARK: - Personal credit

private struct PersonalCreditSheet: View {
    @Bindable var viewModel: BillViewModel
    let person: BillPerson

    @Environment(\.dismiss) private var dismiss

    @State private var amountText: String = ""
    @State private var note: String = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Amount", text: $amountText)
                        #if os(iOS)
                        .keyboardType(.decimalPad)
                        #endif
                    TextField("Note (optional)", text: $note)
                } footer: {
                    Text("Applied after the split — reduces what this person owes (e.g. gift card or promo).")
                }
            }
            .navigationTitle("Personal credit")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                }
            }
        }
        #if os(iOS)
        .presentationDetents([.medium, .large])
        #endif
        .onAppear {
            if person.personalCredit > 0 {
                let nf = NumberFormatter()
                nf.numberStyle = .decimal
                nf.minimumFractionDigits = 0
                nf.maximumFractionDigits = 2
                amountText = nf.string(from: person.personalCredit as NSDecimalNumber) ?? ""
            }
            note = person.creditNote ?? ""
        }
    }

    private func save() {
        let normalized = amountText.replacingOccurrences(of: ",", with: ".")
        let parsed = Decimal(string: normalized) ?? 0
        viewModel.setPersonalCredit(
            personId: person.id,
            amount: max(0, parsed),
            note: note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : note
        )
        dismiss()
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

private func AssignView_previewViewModel() -> BillViewModel {
    let vm = BillViewModel()
    vm.bill = Bill(
        id: "preview-bill",
        title: "Dinner at Restaurant",
        subtotal: 85.50,
        tax: 7.25,
        tip: 15.00
    )
    vm.items = [
        BillItem(id: "item1", billId: "preview-bill", label: "Margherita Pizza", emoji: "pizza", quantity: 1, unitPrice: 18.99),
        BillItem(id: "item2", billId: "preview-bill", label: "Caesar Salad", emoji: "salad", quantity: 1, unitPrice: 12.50),
        BillItem(id: "item3", billId: "preview-bill", label: "Pasta Carbonara", emoji: "pasta", quantity: 1, unitPrice: 16.99),
        BillItem(id: "item4", billId: "preview-bill", label: "Garlic Bread", emoji: "bread", quantity: 2, unitPrice: 4.99),
        BillItem(id: "item5", billId: "preview-bill", label: "Tiramisu", emoji: "cake", quantity: 1, unitPrice: 8.99),
        BillItem(id: "item6", billId: "preview-bill", label: "Espresso", emoji: "coffee", quantity: 2, unitPrice: 3.50)
    ]
    vm.people = [
        BillPerson(id: "person1", billId: "preview-bill", name: "Alice"),
        BillPerson(id: "person2", billId: "preview-bill", name: "Bob"),
        BillPerson(id: "person3", billId: "preview-bill", name: "Charlie")
    ]
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
