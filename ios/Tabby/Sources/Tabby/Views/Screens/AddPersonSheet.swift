import SwiftUI

/// Sheet for adding a new person to the bill.
/// Presents a simple form with name input and save button.
struct AddPersonSheet: View {
    @Bindable var viewModel: BillViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var name: String = ""
    @FocusState private var isNameFieldFocused: Bool

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $name)
                        .textContentType(.name)
                        .autocorrectionDisabled()
                        .focused($isNameFieldFocused)
                        .submitLabel(.done)
                        .onSubmit {
                            savePerson()
                        }
                } header: {
                    Text("Person Details")
                } footer: {
                    Text("Enter the name of the person to add to this bill.")
                }
            }
            .navigationTitle("Add Person")
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
                        savePerson()
                    }
                    .fontWeight(.semibold)
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .onAppear {
                // Auto-focus the name field when sheet appears
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    isNameFieldFocused = true
                }
            }
        }
        #if os(iOS)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        #endif
    }

    private func savePerson() {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        viewModel.addPerson(name: trimmedName)
        dismiss()
    }
}

// MARK: - Preview

#Preview("Add Person Sheet") {
    AddPersonSheet(viewModel: AddPersonSheet_previewViewModel())
}

private func AddPersonSheet_previewViewModel() -> BillViewModel {
    let vm = BillViewModel()
    vm.bill = Bill(id: "preview-bill", title: "Dinner")
    return vm
}
