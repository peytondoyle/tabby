import SwiftUI

/// Main Settings screen for the Tabby app
///
/// Sections:
/// 1. Profile - Name and Venmo handle
/// 2. Bill Defaults - Tip percentage, tax/tip distribution
/// 3. App Settings - Haptic feedback, app version
/// 4. Account - Sign out and delete account (if signed in)
/// 5. About - Links and footer
struct SettingsView: View {

    // MARK: - Properties

    @State private var preferences = UserPreferences.shared

    /// Whether the user is signed in (placeholder for future auth integration)
    @State private var isSignedIn = false

    /// Show confirmation dialog for sign out
    @State private var showingSignOutConfirmation = false

    /// Show confirmation dialog for account deletion
    @State private var showingDeleteConfirmation = false

    /// Show tip picker sheet
    @State private var showingTipPicker = false

    // MARK: - Constants

    private let appVersion: String = {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(version) (\(build))"
    }()

    private let websiteURL = URL(string: "https://tabby.vercel.app")!
    private let privacyPolicyURL = URL(string: "https://tabby.vercel.app/privacy")!
    private let termsOfServiceURL = URL(string: "https://tabby.vercel.app/terms")!

    // MARK: - Body

    var body: some View {
        NavigationStack {
            Form {
                profileSection
                billDefaultsSection
                appSettingsSection

                if isSignedIn {
                    accountSection
                }

                aboutSection
            }
            .navigationTitle("Settings")
            .sheet(isPresented: $showingTipPicker) {
                tipPickerSheet
            }
            .confirmationDialog(
                "Sign Out",
                isPresented: $showingSignOutConfirmation,
                titleVisibility: .visible
            ) {
                Button("Sign Out", role: .destructive) {
                    signOut()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to sign out?")
            }
            .confirmationDialog(
                "Delete Account",
                isPresented: $showingDeleteConfirmation,
                titleVisibility: .visible
            ) {
                Button("Delete Account", role: .destructive) {
                    deleteAccount()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This action cannot be undone. All your data will be permanently deleted.")
            }
        }
    }

    // MARK: - Profile Section

    private var profileSection: some View {
        Section {
            // Name field
            HStack {
                Image(systemName: "person.fill")
                    .foregroundStyle(.secondary)
                    .frame(width: 24)
                TextField("Your Name", text: $preferences.userName)
                    .textContentType(.name)
                    .autocorrectionDisabled()
            }

            // Venmo handle field
            HStack {
                Image(systemName: "v.square.fill")
                    .foregroundStyle(.secondary)
                    .frame(width: 24)
                HStack(spacing: 0) {
                    Text("@")
                        .foregroundStyle(.secondary)
                    TextField("venmo-handle", text: $preferences.venmoHandle)
                        .textContentType(.username)
                        .autocorrectionDisabled()
                        #if os(iOS)
                        .textInputAutocapitalization(.never)
                        #endif
                }
            }
        } header: {
            Text("Profile")
        } footer: {
            Text("Your name and Venmo handle will be used when sharing bills with others.")
        }
    }

    // MARK: - Bill Defaults Section

    private var billDefaultsSection: some View {
        Section {
            // Default tip percentage
            Button {
                showingTipPicker = true
            } label: {
                HStack {
                    Image(systemName: "percent")
                        .foregroundStyle(.secondary)
                        .frame(width: 24)
                    Text("Default Tip")
                        .foregroundStyle(.primary)
                    Spacer()
                    Text("\(preferences.defaultTipPercent)%")
                        .foregroundStyle(.secondary)
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }

            // Tax distribution picker
            HStack {
                Image(systemName: "dollarsign.arrow.circlepath")
                    .foregroundStyle(.secondary)
                    .frame(width: 24)
                Picker("Tax Distribution", selection: $preferences.taxDistributionMode) {
                    ForEach(DistributionMode.allCases) { mode in
                        Text(mode.displayName).tag(mode)
                    }
                }
            }

            // Tip distribution picker
            HStack {
                Image(systemName: "hands.sparkles.fill")
                    .foregroundStyle(.secondary)
                    .frame(width: 24)
                Picker("Tip Distribution", selection: $preferences.tipDistributionMode) {
                    ForEach(DistributionMode.allCases) { mode in
                        Text(mode.displayName).tag(mode)
                    }
                }
            }
        } header: {
            Text("Bill Defaults")
        } footer: {
            Text("Proportional distributes based on each person's subtotal. Even splits equally among all people.")
        }
    }

    // MARK: - App Settings Section

    private var appSettingsSection: some View {
        Section {
            // Haptic feedback toggle
            Toggle(isOn: $preferences.hapticFeedback) {
                HStack {
                    Image(systemName: "iphone.radiowaves.left.and.right")
                        .foregroundStyle(.secondary)
                        .frame(width: 24)
                    Text("Haptic Feedback")
                }
            }

            // App version (read-only)
            HStack {
                Image(systemName: "info.circle")
                    .foregroundStyle(.secondary)
                    .frame(width: 24)
                Text("Version")
                Spacer()
                Text(appVersion)
                    .foregroundStyle(.secondary)
            }
        } header: {
            Text("App Settings")
        }
    }

    // MARK: - Account Section

    private var accountSection: some View {
        Section {
            // Sign out button
            Button {
                showingSignOutConfirmation = true
            } label: {
                HStack {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .foregroundStyle(.secondary)
                        .frame(width: 24)
                    Text("Sign Out")
                        .foregroundStyle(.primary)
                }
            }

            // Delete account button
            Button(role: .destructive) {
                showingDeleteConfirmation = true
            } label: {
                HStack {
                    Image(systemName: "trash")
                        .frame(width: 24)
                    Text("Delete Account")
                }
            }
        } header: {
            Text("Account")
        }
    }

    // MARK: - About Section

    private var aboutSection: some View {
        Section {
            // Website link
            Link(destination: websiteURL) {
                HStack {
                    Image(systemName: "globe")
                        .foregroundStyle(.secondary)
                        .frame(width: 24)
                    Text("Website")
                        .foregroundStyle(.primary)
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }

            // Privacy policy link
            Link(destination: privacyPolicyURL) {
                HStack {
                    Image(systemName: "hand.raised.fill")
                        .foregroundStyle(.secondary)
                        .frame(width: 24)
                    Text("Privacy Policy")
                        .foregroundStyle(.primary)
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }

            // Terms of service link
            Link(destination: termsOfServiceURL) {
                HStack {
                    Image(systemName: "doc.text")
                        .foregroundStyle(.secondary)
                        .frame(width: 24)
                    Text("Terms of Service")
                        .foregroundStyle(.primary)
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
        } header: {
            Text("About")
        } footer: {
            VStack(spacing: 8) {
                Text("Made with \u{2764}\u{FE0F} by the Tabby Team")
                    .font(.footnote)
                Text("Tabby \(appVersion)")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 16)
        }
    }

    // MARK: - Tip Picker Sheet

    private var tipPickerSheet: some View {
        NavigationStack {
            TipPickerSheet(selectedPercent: $preferences.defaultTipPercent)
                .navigationTitle("Default Tip")
                #if os(iOS)
                .navigationBarTitleDisplayMode(.inline)
                #endif
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") {
                            showingTipPicker = false
                        }
                    }
                }
        }
        #if os(iOS)
        .presentationDetents([.medium])
        #endif
    }

    // MARK: - Actions

    private func signOut() {
        // TODO: Implement sign out functionality
        isSignedIn = false
        triggerHaptic()
    }

    private func deleteAccount() {
        // TODO: Implement account deletion functionality
        isSignedIn = false
        triggerHaptic()
    }

    private func triggerHaptic() {
        guard preferences.hapticFeedback else { return }

        #if os(iOS)
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
        #endif
    }
}

// MARK: - Settings Row Components

/// A reusable row for Settings that displays a label with an icon
struct SettingsRow: View {
    let icon: String
    let title: String
    var value: String? = nil
    var iconColor: Color = .secondary

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundStyle(iconColor)
                .frame(width: 24)
            Text(title)
            Spacer()
            if let value = value {
                Text(value)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

/// A reusable link row for Settings
struct SettingsLinkRow: View {
    let icon: String
    let title: String
    let destination: URL
    var iconColor: Color = .secondary

    var body: some View {
        Link(destination: destination) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(iconColor)
                    .frame(width: 24)
                Text(title)
                    .foregroundStyle(.primary)
                Spacer()
                Image(systemName: "arrow.up.right")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Settings") {
    SettingsView()
}

#Preview("Settings - Signed In") {
    struct PreviewWrapper: View {
        var body: some View {
            SettingsView()
                .onAppear {
                    // Simulate signed in state for preview
                }
        }
    }
    return PreviewWrapper()
}
#endif
