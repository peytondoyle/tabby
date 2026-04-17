import SwiftUI

/// A picker for selecting tip percentages with standard options and custom input
///
/// Features:
/// - Segmented control for standard tip percentages (0%, 15%, 18%, 20%, 22%, 25%)
/// - Custom option that reveals a text field for entering any percentage
/// - Binding to an Int percentage value
///
/// Usage:
/// ```swift
/// @State private var tipPercent = 18
/// TipPickerView(selectedPercent: $tipPercent)
/// ```
struct TipPickerView: View {

    // MARK: - Properties

    /// The currently selected tip percentage (0-100)
    @Binding var selectedPercent: Int

    /// Whether the custom input field is focused
    @FocusState private var isCustomFieldFocused: Bool

    /// Text for the custom percentage input
    @State private var customText: String = ""

    /// Whether we're showing the custom input mode
    @State private var isCustomMode: Bool = false

    // MARK: - Computed Properties

    /// The currently selected tip percentage option
    private var selectedOption: TipPercentage {
        if isCustomMode {
            return .custom
        }
        return TipPercentage.from(percent: selectedPercent)
    }

    /// All available standard options plus custom
    private var allOptions: [TipPercentage] {
        TipPercentage.allCases
    }

    // MARK: - Body

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Segmented picker for standard options
            segmentedPicker

            // Custom input field (shown when custom is selected)
            if isCustomMode {
                customInputField
            }
        }
    }

    // MARK: - Segmented Picker

    private var segmentedPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(allOptions) { option in
                    tipOptionButton(option)
                }
            }
            .padding(.horizontal, 4)
        }
    }

    private func tipOptionButton(_ option: TipPercentage) -> some View {
        Button {
            selectOption(option)
        } label: {
            Text(option.displayName)
                .font(.subheadline)
                .fontWeight(isSelected(option) ? .semibold : .regular)
                .foregroundStyle(isSelected(option) ? .white : .primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background {
                    if isSelected(option) {
                        Capsule()
                            .fill(Color.accentColor)
                    } else {
                        Capsule()
                            .fill(Color.secondary.opacity(0.15))
                    }
                }
        }
        .buttonStyle(.plain)
    }

    private func isSelected(_ option: TipPercentage) -> Bool {
        if option == .custom {
            return isCustomMode
        }
        return !isCustomMode && option.rawValue == selectedPercent
    }

    // MARK: - Custom Input Field

    private var customInputField: some View {
        HStack(spacing: 12) {
            Image(systemName: "pencil")
                .foregroundStyle(.secondary)

            TextField("Enter percentage", text: $customText)
                #if os(iOS)
                .keyboardType(.numberPad)
                #endif
                .focused($isCustomFieldFocused)
                .onChange(of: customText) { _, newValue in
                    updateCustomValue(newValue)
                }

            Text("%")
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color.secondary.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .onAppear {
            // Initialize custom text if entering custom mode with a non-standard value
            if isCustomMode && TipPercentage.from(percent: selectedPercent) == .custom {
                customText = String(selectedPercent)
            }
            // Focus the field when it appears
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                isCustomFieldFocused = true
            }
        }
    }

    // MARK: - Actions

    private func selectOption(_ option: TipPercentage) {
        withAnimation(.easeInOut(duration: 0.2)) {
            if option == .custom {
                isCustomMode = true
                // Keep current value when switching to custom, or default to 20
                if selectedPercent == 0 || TipPercentage.standardOptions.map(\.rawValue).contains(selectedPercent) {
                    customText = String(selectedPercent)
                } else {
                    customText = String(selectedPercent)
                }
            } else {
                isCustomMode = false
                selectedPercent = option.rawValue
                isCustomFieldFocused = false
            }
        }
    }

    private func updateCustomValue(_ text: String) {
        // Only allow digits
        let filtered = text.filter { $0.isNumber }
        if filtered != text {
            customText = filtered
        }

        // Update the selected percent
        if let value = Int(filtered) {
            // Clamp to reasonable range (0-100)
            selectedPercent = min(max(value, 0), 100)
        } else if filtered.isEmpty {
            selectedPercent = 0
        }
    }
}

// MARK: - Compact Tip Picker

/// A more compact version of the tip picker using a wheel picker style (iOS only)
#if os(iOS)
struct CompactTipPickerView: View {

    @Binding var selectedPercent: Int

    @State private var isCustomMode: Bool = false
    @State private var customText: String = ""
    @FocusState private var isCustomFieldFocused: Bool

    var body: some View {
        VStack(spacing: 8) {
            Picker("Tip Percentage", selection: $selectedPercent) {
                ForEach(TipPercentage.standardOptions) { option in
                    Text(option.displayName).tag(option.rawValue)
                }
                Text("Custom").tag(-1)
            }
            .pickerStyle(.wheel)
            .frame(height: 100)
            .onChange(of: selectedPercent) { _, newValue in
                isCustomMode = newValue == -1
                if isCustomMode {
                    selectedPercent = 20 // Default custom value
                    customText = "20"
                }
            }

            if isCustomMode {
                HStack {
                    TextField("Custom %", text: $customText)
                        .keyboardType(.numberPad)
                        .textFieldStyle(.roundedBorder)
                        .focused($isCustomFieldFocused)
                        .frame(width: 80)
                        .onChange(of: customText) { _, newValue in
                            if let value = Int(newValue.filter { $0.isNumber }) {
                                selectedPercent = min(max(value, 0), 100)
                            }
                        }
                    Text("%")
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}
#endif

// MARK: - Settings Row Tip Picker

/// A tip picker designed for use in Settings forms with a label
struct SettingsTipPickerView: View {

    let label: String
    @Binding var selectedPercent: Int

    @State private var showingPicker = false

    var body: some View {
        Button {
            showingPicker = true
        } label: {
            HStack {
                Label(label, systemImage: "percent")
                Spacer()
                Text("\(selectedPercent)%")
                    .foregroundStyle(.secondary)
            }
        }
        .sheet(isPresented: $showingPicker) {
            NavigationStack {
                TipPickerSheet(selectedPercent: $selectedPercent)
                    .navigationTitle("Default Tip")
                    #if os(iOS)
                    .navigationBarTitleDisplayMode(.inline)
                    #endif
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Done") {
                                showingPicker = false
                            }
                        }
                    }
            }
            #if os(iOS)
            .presentationDetents([.medium])
            #endif
        }
    }
}

// MARK: - Tip Picker Sheet

/// Full-screen tip picker for modal presentation
struct TipPickerSheet: View {

    @Binding var selectedPercent: Int

    private var standardOptions: [TipPercentage] {
        TipPercentage.standardOptions
    }

    var body: some View {
        List {
            Section {
                ForEach(standardOptions) { option in
                    Button {
                        selectedPercent = option.rawValue
                    } label: {
                        HStack {
                            Text(option.displayName)
                                .foregroundStyle(.primary)
                            Spacer()
                            if selectedPercent == option.rawValue {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(Color.accentColor)
                            }
                        }
                    }
                }
            } header: {
                Text("Standard Tips")
            }

            Section {
                CustomTipRow(selectedPercent: $selectedPercent)
            } header: {
                Text("Custom")
            }
        }
    }
}

/// Row for entering a custom tip percentage
private struct CustomTipRow: View {

    @Binding var selectedPercent: Int

    @State private var customText: String = ""
    @FocusState private var isFocused: Bool

    private var isCustomSelected: Bool {
        TipPercentage.from(percent: selectedPercent) == .custom
    }

    var body: some View {
        HStack {
            TextField("Custom percentage", text: $customText)
                #if os(iOS)
                .keyboardType(.numberPad)
                #endif
                .focused($isFocused)
                .onChange(of: customText) { _, newValue in
                    let filtered = newValue.filter { $0.isNumber }
                    if filtered != newValue {
                        customText = filtered
                    }
                    if let value = Int(filtered) {
                        selectedPercent = min(max(value, 0), 100)
                    }
                }
                .onAppear {
                    if isCustomSelected {
                        customText = String(selectedPercent)
                    }
                }

            Text("%")
                .foregroundStyle(.secondary)

            if isCustomSelected {
                Image(systemName: "checkmark")
                    .foregroundStyle(Color.accentColor)
            }
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Tip Picker") {
    struct PreviewWrapper: View {
        @State private var tipPercent = 18

        var body: some View {
            VStack(spacing: 32) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Selected: \(tipPercent)%")
                        .font(.headline)
                    TipPickerView(selectedPercent: $tipPercent)
                }
                .padding()

                Divider()

                Form {
                    Section("Bill Defaults") {
                        SettingsTipPickerView(label: "Default Tip", selectedPercent: $tipPercent)
                    }
                }
            }
        }
    }

    return PreviewWrapper()
}

#Preview("Tip Picker Sheet") {
    struct PreviewWrapper: View {
        @State private var tipPercent = 20

        var body: some View {
            NavigationStack {
                TipPickerSheet(selectedPercent: $tipPercent)
                    .navigationTitle("Default Tip")
            }
        }
    }

    return PreviewWrapper()
}
#endif
