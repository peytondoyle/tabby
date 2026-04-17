import SwiftUI

/// Main screen for displaying and managing bill items
struct ItemListView: View {
    @Bindable var viewModel: BillViewModel

    @State private var showingAddSheet = false
    @State private var editingItem: BillItem?
    @State private var navigateToAssign = false

    private var currencyFormatter: NumberFormatter {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale.current
        return formatter
    }

    var body: some View {
        List {
                // MARK: - Totals Summary Section
                if let bill = viewModel.bill {
                    Section {
                        LabeledContent("Subtotal") {
                            Text(formatCurrency(bill.subtotal))
                        }

                        if bill.discount > 0 {
                            LabeledContent("Discount") {
                                Text("-\(formatCurrency(bill.discount))")
                                    .foregroundStyle(.green)
                            }
                        }

                        if bill.serviceFee > 0 {
                            LabeledContent("Service Fee") {
                                Text(formatCurrency(bill.serviceFee))
                            }
                        }

                        LabeledContent("Tax") {
                            Text(formatCurrency(bill.tax))
                        }

                        LabeledContent("Tip") {
                            Text(formatCurrency(bill.tip))
                        }

                        LabeledContent("Total") {
                            Text(formatCurrency(bill.grandTotal))
                                .fontWeight(.semibold)
                        }
                    } header: {
                        Text("Bill Summary")
                    }
                }

                // MARK: - Items Section
                Section {
                    if viewModel.items.isEmpty {
                        ContentUnavailableView {
                            Label("No Items", systemImage: "list.bullet")
                        } description: {
                            Text("Add items to your bill to get started.")
                        }
                    } else {
                        ForEach(viewModel.items) { item in
                            ItemListRowView(item: item)
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    editingItem = item
                                }
                        }
                        .onDelete(perform: deleteItems)
                    }
                } header: {
                    HStack {
                        Text("Items")
                        Spacer()
                        Text("\(viewModel.items.count) item\(viewModel.items.count == 1 ? "" : "s")")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle(viewModel.bill?.title ?? "Items")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        navigateToAssign = true
                    } label: {
                        Text("Next")
                    }
                    .disabled(viewModel.items.isEmpty)
                }
            }
            .safeAreaInset(edge: .bottom) {
                Button {
                    showingAddSheet = true
                } label: {
                    Label("Add Item", systemImage: "plus.circle.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(.tint)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding()
                .background(.background)
            }
            .sheet(isPresented: $showingAddSheet) {
                AddItemSheet(viewModel: viewModel, mode: .add)
            }
            .sheet(item: $editingItem) { item in
                AddItemSheet(viewModel: viewModel, mode: .edit(item))
            }
        .navigationDestination(isPresented: $navigateToAssign) {
            AssignView(viewModel: viewModel)
        }
    }

    // MARK: - Private Methods

    private func deleteItems(at offsets: IndexSet) {
        for index in offsets {
            let item = viewModel.items[index]
            viewModel.deleteItem(itemId: item.id)
        }
    }

    private func formatCurrency(_ value: Decimal) -> String {
        currencyFormatter.string(from: value as NSDecimalNumber) ?? "$0.00"
    }
}

// MARK: - Item Row View

private struct ItemListRowView: View {
    let item: BillItem

    private var currencyFormatter: NumberFormatter {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale.current
        return formatter
    }

    var body: some View {
        HStack(spacing: 12) {
            // Emoji
            Text(item.emoji ?? "")
                .font(.title2)
                .frame(width: 40, height: 40)
                .background(Color.secondary.opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: 8))

            // Label and quantity
            VStack(alignment: .leading, spacing: 2) {
                Text(item.label)
                    .font(.body)
                    .lineLimit(1)

                if item.quantity > 1 {
                    Text("Qty: \(item.quantity as NSDecimalNumber)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            // Price
            VStack(alignment: .trailing, spacing: 2) {
                Text(formatCurrency(item.price))
                    .font(.body)
                    .fontWeight(.medium)

                if item.quantity > 1 {
                    Text("\(formatCurrency(item.unitPrice)) each")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private func formatCurrency(_ value: Decimal) -> String {
        currencyFormatter.string(from: value as NSDecimalNumber) ?? "$0.00"
    }
}

// MARK: - Preview

#Preview {
    let viewModel = BillViewModel()

    // Set up sample data for preview
    viewModel.bill = Bill(
        title: "Dinner at Restaurant",
        subtotal: 85.50,
        tax: 7.25,
        tip: 15.00,
        discount: 5.00,
        serviceFee: 3.00
    )

    viewModel.items = [
        BillItem(
            billId: viewModel.bill!.id,
            label: "Margherita Pizza",
            emoji: "pizza",
            quantity: 1,
            unitPrice: 18.99
        ),
        BillItem(
            billId: viewModel.bill!.id,
            label: "Caesar Salad",
            emoji: "green_salad",
            quantity: 2,
            unitPrice: 12.50
        ),
        BillItem(
            billId: viewModel.bill!.id,
            label: "Tiramisu",
            emoji: "cake",
            quantity: 1,
            unitPrice: 9.99
        )
    ]

    return NavigationStack {
        ItemListView(viewModel: viewModel)
    }
}
