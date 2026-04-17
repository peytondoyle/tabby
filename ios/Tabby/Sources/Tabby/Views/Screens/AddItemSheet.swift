import SwiftUI

/// Sheet for adding or editing a bill item
struct AddItemSheet: View {
    @Bindable var viewModel: BillViewModel
    let mode: Mode

    @Environment(\.dismiss) private var dismiss

    @State private var emoji: String = ""
    @State private var name: String = ""
    @State private var priceText: String = ""
    @State private var quantityText: String = "1"

    @State private var showingEmojiPicker = false
    @State private var hasAttemptedSave = false

    // Common food/drink emojis for quick selection
    private let quickEmojis = [
        "pizza", "hamburger", "fries", "taco", "burrito", "hot_dog",
        "sandwich", "green_salad", "sushi", "ramen", "spaghetti", "curry",
        "steak", "poultry_leg", "shrimp", "lobster", "cake", "ice_cream",
        "coffee", "tropical_drink", "beer", "wine_glass", "cocktail", "tea"
    ]

    enum Mode: Identifiable {
        case add
        case edit(BillItem)

        var id: String {
            switch self {
            case .add:
                return "add"
            case .edit(let item):
                return item.id
            }
        }
    }

    private var isEditing: Bool {
        if case .edit = mode { return true }
        return false
    }

    private var title: String {
        isEditing ? "Edit Item" : "Add Item"
    }

    // MARK: - Validation

    private var nameError: String? {
        guard hasAttemptedSave else { return nil }
        if name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return "Name is required"
        }
        return nil
    }

    private var priceError: String? {
        guard hasAttemptedSave else { return nil }
        if priceText.isEmpty {
            return "Price is required"
        }
        guard let price = parsePrice(priceText), price > 0 else {
            return "Enter a valid price greater than $0"
        }
        return nil
    }

    private var quantityError: String? {
        guard hasAttemptedSave else { return nil }
        guard let qty = Int(quantityText), qty > 0 else {
            return "Quantity must be at least 1"
        }
        return nil
    }

    private var isValid: Bool {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return false }
        guard let price = parsePrice(priceText), price > 0 else { return false }
        guard let qty = Int(quantityText), qty > 0 else { return false }
        return true
    }

    var body: some View {
        NavigationStack {
            Form {
                // MARK: - Emoji Section
                Section {
                    HStack {
                        Text("Emoji")
                        Spacer()
                        Button {
                            showingEmojiPicker = true
                        } label: {
                            if emoji.isEmpty {
                                Text("Select")
                                    .foregroundStyle(.secondary)
                            } else {
                                Text(emoji)
                                    .font(.title2)
                            }
                        }
                        .buttonStyle(.plain)
                    }

                    // Quick emoji selection
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(quickEmojis, id: \.self) { emojiOption in
                                Button {
                                    emoji = emojiOption
                                } label: {
                                    Text(emojiOption)
                                        .font(.title2)
                                        .padding(8)
                                        .background(emoji == emojiOption ? Color.accentColor.opacity(0.2) : Color.clear)
                                        .clipShape(RoundedRectangle(cornerRadius: 8))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                } header: {
                    Text("Appearance")
                }

                // MARK: - Name Section
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        TextField("Item name", text: $name)
                            #if os(iOS)
                            .textInputAutocapitalization(.words)
                            #endif

                        if let error = nameError {
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(.red)
                        }
                    }
                } header: {
                    Text("Name")
                }

                // MARK: - Price Section
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text("$")
                                .foregroundStyle(.secondary)
                            TextField("0.00", text: $priceText)
                                #if os(iOS)
                                .keyboardType(.decimalPad)
                                #endif
                        }

                        if let error = priceError {
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(.red)
                        }
                    }
                } header: {
                    Text("Unit Price")
                } footer: {
                    Text("Enter the price for a single item")
                }

                // MARK: - Quantity Section
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        Stepper(value: Binding(
                            get: { Int(quantityText) ?? 1 },
                            set: { quantityText = String($0) }
                        ), in: 1...99) {
                            HStack {
                                Text("Quantity")
                                Spacer()
                                Text(quantityText)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        if let error = quantityError {
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(.red)
                        }
                    }
                } footer: {
                    if let price = parsePrice(priceText), let qty = Int(quantityText), qty > 1 {
                        Text("Total: \(formatCurrency(price * Decimal(qty)))")
                    }
                }

                // MARK: - Delete Button (Edit Mode Only)
                if case .edit(let item) = mode {
                    Section {
                        Button(role: .destructive) {
                            viewModel.deleteItem(itemId: item.id)
                            dismiss()
                        } label: {
                            HStack {
                                Spacer()
                                Text("Delete Item")
                                Spacer()
                            }
                        }
                    }
                }
            }
            .navigationTitle(title)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveItem()
                    }
                    .fontWeight(.semibold)
                }
            }
            .sheet(isPresented: $showingEmojiPicker) {
                EmojiPickerSheet(selectedEmoji: $emoji)
            }
            .onAppear {
                loadExistingItem()
            }
        }
    }

    // MARK: - Private Methods

    private func loadExistingItem() {
        if case .edit(let item) = mode {
            emoji = item.emoji ?? ""
            name = item.label
            priceText = "\(item.unitPrice)"
            quantityText = "\(item.quantity)"
        }
    }

    private func saveItem() {
        hasAttemptedSave = true

        guard isValid else { return }
        guard let price = parsePrice(priceText) else { return }
        guard let quantity = Int(quantityText) else { return }
        guard let billId = viewModel.bill?.id else { return }

        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let itemEmoji = emoji.isEmpty ? nil : emoji

        switch mode {
        case .add:
            let newItem = BillItem(
                billId: billId,
                label: trimmedName,
                emoji: itemEmoji,
                quantity: Decimal(quantity),
                unitPrice: price
            )
            viewModel.addItem(newItem)

        case .edit(let existingItem):
            let updatedItem = BillItem(
                id: existingItem.id,
                billId: existingItem.billId,
                label: trimmedName,
                emoji: itemEmoji,
                quantity: Decimal(quantity),
                unitPrice: price
            )
            viewModel.updateItem(updatedItem)
        }

        dismiss()
    }

    private func parsePrice(_ text: String) -> Decimal? {
        let cleanText = text.replacingOccurrences(of: "$", with: "")
            .replacingOccurrences(of: ",", with: "")
            .trimmingCharacters(in: .whitespaces)
        return Decimal(string: cleanText)
    }

    private func formatCurrency(_ value: Decimal) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale.current
        return formatter.string(from: value as NSDecimalNumber) ?? "$0.00"
    }
}

// MARK: - Emoji Picker Sheet

private struct EmojiPickerSheet: View {
    @Binding var selectedEmoji: String
    @Environment(\.dismiss) private var dismiss

    // Organized emoji categories
    private let categories: [(name: String, emojis: [String])] = [
        ("Food", [
            "pizza", "hamburger", "fries", "taco", "burrito", "hot_dog",
            "sandwich", "bacon", "egg", "cooking", "pancakes", "waffle",
            "cheese", "poultry_leg", "meat_on_bone", "steak", "cut_of_meat"
        ]),
        ("Asian", [
            "sushi", "ramen", "curry", "rice", "bento", "oden", "dango",
            "rice_ball", "rice_cracker", "fish_cake", "moon_cake", "takeout_box"
        ]),
        ("Italian", [
            "spaghetti", "stuffed_flatbread", "shallow_pan_of_food", "fondue"
        ]),
        ("Seafood", [
            "shrimp", "lobster", "crab", "oyster", "squid", "fish"
        ]),
        ("Salads & Veggies", [
            "green_salad", "leafy_green", "broccoli", "carrot", "corn",
            "hot_pepper", "cucumber", "avocado", "eggplant", "potato", "onion"
        ]),
        ("Fruits", [
            "apple", "pear", "orange", "lemon", "banana", "watermelon",
            "grapes", "strawberry", "blueberries", "peach", "cherries", "mango"
        ]),
        ("Desserts", [
            "cake", "birthday", "cupcake", "pie", "chocolate_bar", "candy",
            "lollipop", "custard", "honey_pot", "ice_cream", "shaved_ice",
            "doughnut", "cookie", "croissant", "pretzel"
        ]),
        ("Drinks", [
            "coffee", "tea", "mate", "bubble_tea", "beverage_box", "cup_with_straw",
            "beer", "beers", "wine_glass", "cocktail", "tropical_drink",
            "champagne", "tumbler_glass", "milk_glass"
        ]),
        ("Other", [
            "popcorn", "salt", "canned_food", "jar", "plate_with_cutlery",
            "fork_and_knife", "spoon", "chopsticks"
        ])
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 20) {
                    ForEach(categories, id: \.name) { category in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(category.name)
                                .font(.headline)
                                .padding(.horizontal)

                            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 6), spacing: 12) {
                                ForEach(category.emojis, id: \.self) { emoji in
                                    Button {
                                        selectedEmoji = emoji
                                        dismiss()
                                    } label: {
                                        Text(emoji)
                                            .font(.title)
                                            .frame(width: 44, height: 44)
                                            .background(selectedEmoji == emoji ? Color.accentColor.opacity(0.2) : Color.clear)
                                            .clipShape(RoundedRectangle(cornerRadius: 8))
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Select Emoji")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Clear") {
                        selectedEmoji = ""
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Preview

#Preview("Add Item") {
    let viewModel = BillViewModel()
    viewModel.bill = Bill(title: "Test Bill")

    return AddItemSheet(viewModel: viewModel, mode: .add)
}

#Preview("Edit Item") {
    let viewModel = BillViewModel()
    viewModel.bill = Bill(title: "Test Bill")

    let item = BillItem(
        billId: viewModel.bill!.id,
        label: "Margherita Pizza",
        emoji: "pizza",
        quantity: 2,
        unitPrice: 18.99
    )

    return AddItemSheet(viewModel: viewModel, mode: .edit(item))
}
