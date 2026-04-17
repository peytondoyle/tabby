import SwiftUI

/// Summary view showing the final bill breakdown with expandable person rows
/// and bill totals section
struct SummaryView: View {

    // MARK: - Properties

    @Bindable var viewModel: BillViewModel
    @State private var expandedPersonIds: Set<String> = []
    @State private var showingShareSheet = false
    @State private var hasUnsavedChanges = false
    @State private var isSaving = false
    @State private var showingSaveConfirmation = false

    // MARK: - Body

    var body: some View {
        Group {
            if viewModel.isLoading {
                loadingView
            } else if let error = viewModel.error {
                errorView(error)
            } else if let totals = viewModel.billTotals {
                billSummaryContent(totals)
            } else {
                emptyStateView
            }
        }
        .navigationTitle("Summary")
        .toolbar {
            #if os(iOS)
            ToolbarItem(placement: .topBarTrailing) {
                shareButton
            }
            #else
            ToolbarItem(placement: .primaryAction) {
                shareButton
            }
            #endif
        }
        .sheet(isPresented: $showingShareSheet) {
            if let bill = viewModel.bill {
                ShareSheet(
                    billTitle: bill.title,
                    viewerToken: bill.viewerToken,
                    editorToken: bill.editorToken
                )
            }
        }
        .alert("Bill Saved", isPresented: $showingSaveConfirmation) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("Your changes have been saved successfully.")
        }
    }

    // MARK: - Share Button

    private var shareButton: some View {
        Button {
            showingShareSheet = true
        } label: {
            Image(systemName: "square.and.arrow.up")
        }
        .disabled(viewModel.bill == nil)
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)
            Text("Loading bill...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Error View

    private func errorView(_ error: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundStyle(.orange)
            Text("Error Loading Bill")
                .font(.headline)
            Text(error)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
    }

    // MARK: - Empty State View

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.text")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("No Bill Loaded")
                .font(.headline)
            Text("Scan a receipt or load an existing bill to see the summary.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
    }

    // MARK: - Bill Summary Content

    private func billSummaryContent(_ totals: BillTotals) -> some View {
        List {
            // Person breakdowns section
            Section {
                ForEach(totals.personTotals, id: \.personId) { personTotal in
                    PersonBreakdownRow(
                        personTotal: personTotal,
                        isExpanded: expandedPersonIds.contains(personTotal.personId),
                        onToggle: {
                            toggleExpanded(personTotal.personId)
                        }
                    )
                }
            } header: {
                Text("Individual Totals")
            }

            // Bill totals section
            Section {
                billTotalsRows(totals)
            } header: {
                Text("Bill Totals")
            }

            // Penny reconciliation note if applicable
            if totals.pennyReconciliation.distributed != 0 {
                Section {
                    pennyReconciliationNote(totals.pennyReconciliation)
                }
            }

            // Save button section if there are unsaved changes
            if hasUnsavedChanges {
                Section {
                    saveButton
                }
            }
        }
        #if os(iOS)
        .listStyle(.insetGrouped)
        #endif
    }

    // MARK: - Bill Totals Rows

    @ViewBuilder
    private func billTotalsRows(_ totals: BillTotals) -> some View {
        BillTotalRow(label: "Subtotal", amount: totals.subtotal)

        if totals.discount > 0 {
            BillTotalRow(
                label: "Discount",
                amount: totals.discount,
                isDiscount: true
            )
        }

        if totals.serviceFee > 0 {
            BillTotalRow(label: "Service Fee", amount: totals.serviceFee)
        }

        BillTotalRow(label: "Tax", amount: totals.tax)
        BillTotalRow(label: "Tip", amount: totals.tip)

        BillTotalRow(
            label: "Grand Total",
            amount: totals.grandTotal,
            isGrandTotal: true
        )
    }

    // MARK: - Penny Reconciliation Note

    private func pennyReconciliationNote(_ reconciliation: PennyReconciliation) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "info.circle")
                .foregroundStyle(.blue)

            VStack(alignment: .leading, spacing: 4) {
                Text("Penny Reconciliation")
                    .font(.subheadline)
                    .fontWeight(.medium)

                let amount = abs(reconciliation.distributed)
                let direction = reconciliation.distributed > 0 ? "added to" : "removed from"
                Text("\(amount.formatted(.currency(code: "USD"))) was \(direction) individual totals to match the exact bill total.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Save Button

    private var saveButton: some View {
        Button {
            Task {
                await saveBill()
            }
        } label: {
            HStack {
                if isSaving {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "checkmark.circle")
                }
                Text(isSaving ? "Saving..." : "Save Bill")
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 4)
        }
        .buttonStyle(.borderedProminent)
        .disabled(isSaving)
    }

    // MARK: - Actions

    private func toggleExpanded(_ personId: String) {
        withAnimation(.easeInOut(duration: 0.2)) {
            if expandedPersonIds.contains(personId) {
                expandedPersonIds.remove(personId)
            } else {
                expandedPersonIds.insert(personId)
            }
        }
    }

    private func saveBill() async {
        isSaving = true
        await viewModel.saveBill()
        isSaving = false

        if viewModel.error == nil {
            hasUnsavedChanges = false
            showingSaveConfirmation = true
        }
    }

    /// Call this method to mark that changes have been made
    func markAsChanged() {
        hasUnsavedChanges = true
    }
}

// MARK: - Person Breakdown Row

/// Expandable row showing a person's bill breakdown
struct PersonBreakdownRow: View {
    let personTotal: PersonTotal
    let isExpanded: Bool
    let onToggle: () -> Void

    var body: some View {
        DisclosureGroup(
            isExpanded: Binding(
                get: { isExpanded },
                set: { _ in onToggle() }
            )
        ) {
            expandedContent
        } label: {
            collapsedHeader
        }
    }

    // MARK: - Collapsed Header

    private var collapsedHeader: some View {
        HStack {
            Text(personTotal.name)
                .font(.body)
                .fontWeight(.medium)

            Spacer()

            Text(personTotal.total.formatted(.currency(code: "USD")))
                .font(.body)
                .fontWeight(.semibold)
                .foregroundStyle(.primary)
        }
    }

    // MARK: - Expanded Content

    private var expandedContent: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Items list
            if !personTotal.items.isEmpty {
                ForEach(personTotal.items, id: \.itemId) { item in
                    AssignedItemRow(item: item)
                }

                Divider()
                    .padding(.vertical, 4)
            }

            // Breakdown rows
            PersonBreakdownLine(label: "Subtotal", amount: personTotal.subtotal)

            if personTotal.discountShare > 0 {
                PersonBreakdownLine(
                    label: "Discount",
                    amount: personTotal.discountShare,
                    isDiscount: true
                )
            }

            if personTotal.serviceFeeShare > 0 {
                PersonBreakdownLine(label: "Service Fee", amount: personTotal.serviceFeeShare)
            }

            PersonBreakdownLine(label: "Tax", amount: personTotal.taxShare)
            PersonBreakdownLine(label: "Tip", amount: personTotal.tipShare)

            Divider()
                .padding(.vertical, 4)

            PersonBreakdownLine(
                label: "Total",
                amount: personTotal.total,
                isTotal: true
            )
        }
        .padding(.vertical, 8)
    }
}

// MARK: - Assigned Item Row

/// Row displaying an assigned item for a person in the summary breakdown
private struct AssignedItemRow: View {
    let item: AssignedLine

    var body: some View {
        HStack {
            Text(item.emoji)
                .font(.body)

            VStack(alignment: .leading, spacing: 2) {
                Text(item.label)
                    .font(.subheadline)

                if item.weight < 1 {
                    let percentage = Int(truncating: (item.weight * 100).rounded as NSDecimalNumber)
                    Text("\(percentage)% of \(item.price.formatted(.currency(code: "USD")))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            Text(item.shareAmount.formatted(.currency(code: "USD")))
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}

// MARK: - Person Breakdown Line

/// Row for displaying a person's breakdown line item (subtotal, tax, tip, etc.)
private struct PersonBreakdownLine: View {
    let label: String
    let amount: Decimal
    var isDiscount: Bool = false
    var isTotal: Bool = false

    var body: some View {
        HStack {
            Text(label)
                .font(isTotal ? .subheadline.weight(.semibold) : .subheadline)
                .foregroundStyle(isTotal ? .primary : .secondary)

            Spacer()

            Text(formattedAmount)
                .font(isTotal ? .subheadline.weight(.semibold) : .subheadline)
                .foregroundStyle(isDiscount ? .green : (isTotal ? .primary : .secondary))
        }
    }

    private var formattedAmount: String {
        if isDiscount {
            return "-" + amount.formatted(.currency(code: "USD"))
        }
        return amount.formatted(.currency(code: "USD"))
    }
}

// MARK: - Bill Total Row

/// Row for displaying bill total line items
private struct BillTotalRow: View {
    let label: String
    let amount: Decimal
    var isDiscount: Bool = false
    var isGrandTotal: Bool = false

    var body: some View {
        HStack {
            Text(label)
                .font(isGrandTotal ? .headline : .body)

            Spacer()

            Text(formattedAmount)
                .font(isGrandTotal ? .headline : .body)
                .fontWeight(isGrandTotal ? .bold : .regular)
                .foregroundStyle(isDiscount ? .green : .primary)
        }
    }

    private var formattedAmount: String {
        if isDiscount {
            return "-" + amount.formatted(.currency(code: "USD"))
        }
        return amount.formatted(.currency(code: "USD"))
    }
}

// MARK: - Preview

#Preview("With Data") {
    let viewModel = BillViewModel()

    // Set up sample data
    viewModel.bill = Bill(
        id: "1",
        title: "Dinner at Restaurant",
        place: "The Fancy Place",
        subtotal: 100,
        tax: 8.50,
        tip: 18,
        discount: 10,
        serviceFee: 3
    )

    viewModel.items = [
        BillItem(id: "1", billId: "1", label: "Burger", emoji: "🍔", quantity: 1, unitPrice: 15),
        BillItem(id: "2", billId: "1", label: "Pizza", emoji: "🍕", quantity: 1, unitPrice: 20),
        BillItem(id: "3", billId: "1", label: "Salad", emoji: "🥗", quantity: 2, unitPrice: 12),
        BillItem(id: "4", billId: "1", label: "Wine", emoji: "🍷", quantity: 1, unitPrice: 41)
    ]

    viewModel.people = [
        BillPerson(id: "p1", billId: "1", name: "Alice"),
        BillPerson(id: "p2", billId: "1", name: "Bob"),
        BillPerson(id: "p3", billId: "1", name: "Charlie")
    ]

    viewModel.shares = [
        BillItemShare(itemId: "1", personId: "p1", weight: 1),
        BillItemShare(itemId: "2", personId: "p2", weight: 0.5),
        BillItemShare(itemId: "2", personId: "p3", weight: 0.5),
        BillItemShare(itemId: "3", personId: "p1", weight: 0.5),
        BillItemShare(itemId: "3", personId: "p2", weight: 0.5),
        BillItemShare(itemId: "4", personId: "p3", weight: 1)
    ]

    return NavigationStack {
        SummaryView(viewModel: viewModel)
    }
}

#Preview("Empty State") {
    NavigationStack {
        SummaryView(viewModel: BillViewModel())
    }
}
