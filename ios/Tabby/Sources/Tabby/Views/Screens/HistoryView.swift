import SwiftUI
import SwiftData

/// View displaying the history of past bills
struct HistoryView: View {
    @Environment(\.modelContext) private var modelContext

    /// Query for fetching bills sorted by creation date (newest first)
    @Query(sort: \PersistentBill.createdAt, order: .reverse)
    private var bills: [PersistentBill]

    /// Search text for filtering bills
    @State private var searchText = ""

    /// Selected bill for navigation
    @State private var selectedBill: PersistentBill?

    /// Show delete confirmation alert
    @State private var showDeleteAlert = false

    /// Bill pending deletion
    @State private var billToDelete: PersistentBill?

    var body: some View {
        NavigationStack {
            Group {
                if bills.isEmpty && searchText.isEmpty {
                    EmptyStateView.noHistory()
                } else if filteredBills.isEmpty && !searchText.isEmpty {
                    EmptyStateView.noSearchResults(query: searchText)
                } else {
                    billsList
                }
            }
            .navigationTitle("History")
            .searchable(text: $searchText, prompt: "Search bills")
            .alert("Delete Bill", isPresented: $showDeleteAlert) {
                Button("Cancel", role: .cancel) {
                    billToDelete = nil
                }
                Button("Delete", role: .destructive) {
                    if let bill = billToDelete {
                        deleteBill(bill)
                    }
                }
            } message: {
                if let bill = billToDelete {
                    Text("Are you sure you want to delete \"\(bill.displayName)\"? This action cannot be undone.")
                }
            }
        }
    }

    // MARK: - Subviews

    private var billsList: some View {
        List {
            ForEach(filteredBills) { bill in
                NavigationLink(value: bill) {
                    HistoryRowView(bill: bill)
                }
                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                    Button(role: .destructive) {
                        billToDelete = bill
                        showDeleteAlert = true
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                }
            }
        }
        #if os(iOS)
        .listStyle(.insetGrouped)
        #endif
        .navigationDestination(for: PersistentBill.self) { bill in
            BillDetailView(bill: bill)
        }
    }

    // MARK: - Computed Properties

    private var filteredBills: [PersistentBill] {
        if searchText.isEmpty {
            return bills
        }

        let lowercasedSearch = searchText.lowercased()
        return bills.filter { bill in
            bill.place?.lowercased().contains(lowercasedSearch) == true ||
            bill.title?.lowercased().contains(lowercasedSearch) == true
        }
    }

    // MARK: - Actions

    private func deleteBill(_ bill: PersistentBill) {
        withAnimation {
            modelContext.delete(bill)
            try? modelContext.save()
        }
        billToDelete = nil
    }
}

// MARK: - Bill Display Name Extension

extension PersistentBill {
    /// Display name for the bill (place name or title or fallback)
    var displayName: String {
        if let place = place, !place.isEmpty {
            return place
        }
        if let title = title, !title.isEmpty {
            return title
        }
        return "Untitled Bill"
    }
}

// MARK: - Bill Detail View (Placeholder)

/// Placeholder view for viewing/editing a bill from history
struct BillDetailView: View {
    let bill: PersistentBill

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text(bill.displayName)
                        .font(.title)
                        .fontWeight(.bold)

                    if let date = bill.date ?? bill.createdAt as Date? {
                        Text(date, style: .date)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                Divider()

                // Totals Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Summary")
                        .font(.headline)

                    totalRow("Subtotal", value: bill.subtotal)

                    if bill.discount > 0 {
                        totalRow("Discount", value: -bill.discount, color: .green)
                    }

                    if bill.serviceFee > 0 {
                        totalRow("Service Fee", value: bill.serviceFee)
                    }

                    totalRow("Tax", value: bill.tax)
                    totalRow("Tip", value: bill.tip)

                    Divider()

                    HStack {
                        Text("Total")
                            .font(.headline)
                        Spacer()
                        Text(formatCurrency(bill.grandTotal))
                            .font(.headline)
                    }
                }
                .padding()
                .background(Color.gray.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))

                // Items Section
                if !bill.items.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Items (\(bill.items.count))")
                            .font(.headline)

                        ForEach(bill.items) { item in
                            HStack {
                                if let emoji = item.emoji {
                                    Text(emoji)
                                }
                                Text(item.label)
                                Spacer()
                                Text(formatCurrency(item.price))
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                // People Section
                if !bill.people.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("People (\(bill.people.count))")
                            .font(.headline)

                        ForEach(bill.people) { person in
                            HStack {
                                Circle()
                                    .fill(Color.accentColor.opacity(0.2))
                                    .frame(width: 32, height: 32)
                                    .overlay(
                                        Text(String(person.name.prefix(1)).uppercased())
                                            .font(.caption)
                                            .fontWeight(.semibold)
                                            .foregroundStyle(Color.accentColor)
                                    )

                                Text(person.name)

                                Spacer()

                                if person.isArchived {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(.green)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding()
        }
        .navigationTitle("Bill Details")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }

    private func totalRow(_ label: String, value: Decimal, color: Color = .primary) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(formatCurrency(value))
                .foregroundStyle(color)
        }
    }

    private func formatCurrency(_ value: Decimal) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: value as NSDecimalNumber) ?? "$0.00"
    }
}

// MARK: - Preview

#if DEBUG
#Preview("History View") {
    HistoryView()
        .modelContainer(for: [PersistentBill.self, PersistentItem.self, PersistentPerson.self], inMemory: true)
}

#Preview("Empty History") {
    HistoryView()
        .modelContainer(for: [PersistentBill.self, PersistentItem.self, PersistentPerson.self], inMemory: true)
}
#endif
