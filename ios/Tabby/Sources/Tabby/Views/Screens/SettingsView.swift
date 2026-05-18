import SwiftUI
import ClerkKit
import ClerkKitUI

/// Settings — Milk & Clay cards, clear hierarchy, tokenized type and color.
struct SettingsView: View {

    // MARK: - Properties

    @Bindable private var preferences = UserPreferences.shared

    @State private var authService = AuthService.shared

    @State private var showingAuthSheet = false

    @State private var showingSignOutConfirmation = false

    @State private var showingDeleteConfirmation = false

    @State private var showingTipPicker = false

    @FocusState private var focusedProfileField: ProfileField?

    private enum ProfileField: Hashable {
        case name, venmo
    }

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
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    introBlock
                    profileBlock
                    billDefaultsBlock
                    appSettingsBlock
                    accountBlock
                    aboutBlock
                }
                .padding(.horizontal, TB.Space.xl)
                .padding(.bottom, TB.Space.xxl)
            }
            #if os(iOS)
            .scrollDismissesKeyboard(.interactively)
            #endif
            .background(TB.Palette.bg)
            .tint(TB.Palette.clay)
            .navigationTitle("Settings")
            #if os(iOS)
            .toolbarBackground(TB.Palette.bg, for: .navigationBar)
            #endif
            .sheet(isPresented: $showingTipPicker) {
                tipPickerSheet
            }
            .sheet(isPresented: $showingAuthSheet) {
                AuthView()
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

    // MARK: - Intro

    private var introBlock: some View {
        VStack(alignment: .leading, spacing: TB.Space.sm) {
            Text("PREFERENCES")
                .font(TB.Typography.eyebrow())
                .tracking(2.2)
                .textCase(.uppercase)
                .foregroundStyle(TB.Palette.inkFaint)

            Text("Tune how Tabby splits bills and how you appear when you share.")
                .font(TB.Typography.bodySoft())
                .foregroundStyle(TB.Palette.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, TB.Space.xs)
        .padding(.bottom, TB.Space.md)
    }

    // MARK: - Profile

    private var profileBlock: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionTitle("Profile", isFirst: true)

            settingsCard {
                HStack(alignment: .center, spacing: TB.Space.md) {
                    SettingsIconBadge(systemName: "person.fill")
                    TextField("Your name", text: $preferences.userName)
                        .textContentType(.name)
                        .autocorrectionDisabled()
                        .focused($focusedProfileField, equals: .name)
                        .tbInput(isFocused: focusedProfileField == .name)
                }
                .padding(.horizontal, TB.Space.lg)
                .padding(.vertical, TB.Space.md)

                settingsRowDivider()

                HStack(alignment: .center, spacing: TB.Space.md) {
                    SettingsIconBadge(systemName: "v.square.fill")
                    HStack(spacing: 2) {
                        Text("@")
                            .font(TB.Typography.input())
                            .foregroundStyle(TB.Palette.inkDim)
                        TextField("venmo-handle", text: $preferences.venmoHandle)
                            .textContentType(.username)
                            .autocorrectionDisabled()
                            #if os(iOS)
                            .textInputAutocapitalization(.never)
                            #endif
                            .focused($focusedProfileField, equals: .venmo)
                            .tbInput(isFocused: focusedProfileField == .venmo, monospaced: true)
                    }
                }
                .padding(.horizontal, TB.Space.lg)
                .padding(.vertical, TB.Space.md)
            }

            sectionFooter("Your name and Venmo handle appear when you share a bill.")
        }
    }

    // MARK: - Bill defaults

    private var billDefaultsBlock: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionTitle("Bill defaults")

            settingsCard {
                Button {
                    showingTipPicker = true
                } label: {
                    HStack(spacing: TB.Space.md) {
                        SettingsIconBadge(systemName: "percent")
                        Text("Default tip")
                            .font(TB.Typography.body())
                            .foregroundStyle(TB.Palette.ink)
                        Spacer()
                        Text("\(preferences.defaultTipPercent)%")
                            .font(TB.Typography.meta())
                            .monospacedDigit()
                            .foregroundStyle(TB.Palette.inkSoft)
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(TB.Palette.inkDim)
                    }
                    .padding(.horizontal, TB.Space.lg)
                    .padding(.vertical, TB.Space.md)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                settingsRowDivider()

                distributionPickerRow(
                    icon: "dollarsign.arrow.circlepath",
                    title: "Tax",
                    selection: $preferences.taxDistributionMode
                )

                settingsRowDivider()

                distributionPickerRow(
                    icon: "hands.sparkles.fill",
                    title: "Tip",
                    selection: $preferences.tipDistributionMode
                )

                settingsRowDivider()

                HStack(alignment: .center, spacing: TB.Space.md) {
                    SettingsIconBadge(systemName: "person.3.fill")
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Include zero-item people")
                            .font(TB.Typography.body())
                            .foregroundStyle(TB.Palette.ink)
                        Text("When splitting tax or tip evenly")
                            .font(TB.Typography.meta())
                            .foregroundStyle(TB.Palette.inkFaint)
                    }
                    Spacer(minLength: TB.Space.sm)
                    Toggle("", isOn: $preferences.includeZeroPeopleInEvenSplits)
                        .labelsHidden()
                }
                .padding(.horizontal, TB.Space.lg)
                .padding(.vertical, TB.Space.md)
            }

            sectionFooter("Proportional uses each person’s subtotal. Even divides the cost equally among everyone.")
        }
    }

    // MARK: - App

    private var appSettingsBlock: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionTitle("App")

            settingsCard {
                HStack(alignment: .center, spacing: TB.Space.md) {
                    SettingsIconBadge(systemName: "iphone.radiowaves.left.and.right")
                    Text("Haptic feedback")
                        .font(TB.Typography.body())
                        .foregroundStyle(TB.Palette.ink)
                    Spacer(minLength: TB.Space.sm)
                    Toggle("", isOn: $preferences.hapticFeedback)
                        .labelsHidden()
                }
                .padding(.horizontal, TB.Space.lg)
                .padding(.vertical, TB.Space.md)

                settingsRowDivider()

                HStack(alignment: .center, spacing: TB.Space.md) {
                    SettingsIconBadge(systemName: "info.circle")
                    Text("Version")
                        .font(TB.Typography.body())
                        .foregroundStyle(TB.Palette.ink)
                    Spacer()
                    Text(appVersion)
                        .font(TB.Typography.meta())
                        .foregroundStyle(TB.Palette.inkSoft)
                }
                .padding(.horizontal, TB.Space.lg)
                .padding(.vertical, TB.Space.md)
            }
        }
    }

    // MARK: - Account

    private var accountBlock: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionTitle("Account")

            settingsCard {
                if authService.isAuthenticated {
                    #if os(iOS)
                    HStack(spacing: TB.Space.md) {
                        SettingsIconBadge(systemName: "person.crop.circle.fill")
                        Text("Account")
                            .font(TB.Typography.body())
                            .foregroundStyle(TB.Palette.ink)
                        Spacer()
                        UserButton(signedOutContent: { EmptyView() })
                            .frame(width: 40, height: 40)
                    }
                    .padding(.horizontal, TB.Space.lg)
                    .padding(.vertical, TB.Space.md)

                    settingsRowDivider()
                    #endif

                    Button {
                        showingSignOutConfirmation = true
                    } label: {
                        HStack(spacing: TB.Space.md) {
                            SettingsIconBadge(systemName: "rectangle.portrait.and.arrow.right")
                            Text("Sign out")
                                .font(TB.Typography.body())
                                .foregroundStyle(TB.Palette.ink)
                            Spacer()
                        }
                        .padding(.horizontal, TB.Space.lg)
                        .padding(.vertical, TB.Space.md)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)

                    settingsRowDivider()

                    Button(role: .destructive) {
                        showingDeleteConfirmation = true
                    } label: {
                        HStack(spacing: TB.Space.md) {
                            SettingsIconBadge(systemName: "trash", emphasize: true)
                            Text("Delete account")
                                .font(TB.Typography.body())
                                .foregroundStyle(TB.Palette.danger)
                            Spacer()
                        }
                        .padding(.horizontal, TB.Space.lg)
                        .padding(.vertical, TB.Space.md)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                } else {
                    Button {
                        showingAuthSheet = true
                    } label: {
                        HStack(spacing: TB.Space.md) {
                            SettingsIconBadge(systemName: "person.crop.circle.badge.plus")
                            Text("Sign in")
                                .font(TB.Typography.body())
                                .foregroundStyle(TB.Palette.ink)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(TB.Palette.inkDim)
                        }
                        .padding(.horizontal, TB.Space.lg)
                        .padding(.vertical, TB.Space.md)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }

            if !authService.isAuthenticated {
                sectionFooter("Signing in keeps new receipts tied to your account when the server accepts it.")
            }
        }
    }

    // MARK: - About

    private var aboutBlock: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionTitle("About")

            settingsCard {
                Link(destination: websiteURL) {
                    settingsLinkRowLabel(icon: "globe", title: "Website")
                }
                .buttonStyle(.plain)

                settingsRowDivider()

                Link(destination: privacyPolicyURL) {
                    settingsLinkRowLabel(icon: "hand.raised.fill", title: "Privacy policy")
                }
                .buttonStyle(.plain)

                settingsRowDivider()

                Link(destination: termsOfServiceURL) {
                    settingsLinkRowLabel(icon: "doc.text", title: "Terms of service")
                }
                .buttonStyle(.plain)
            }

            VStack(spacing: TB.Space.sm) {
                HStack(spacing: 5) {
                    Text("Made with")
                    Text("\u{2764}\u{FE0F}")
                        .foregroundStyle(TB.Palette.clay)
                    Text("by the Tabby team")
                }
                .font(TB.Typography.bodySoft())
                .foregroundStyle(TB.Palette.inkSoft)
                .multilineTextAlignment(.center)

                Text("Tabby \(appVersion)")
                    .font(TB.Typography.meta())
                    .foregroundStyle(TB.Palette.inkFaint)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, TB.Space.xl)
        }
    }

    // MARK: - Tip picker

    private var tipPickerSheet: some View {
        NavigationStack {
            TipPickerSheet(selectedPercent: $preferences.defaultTipPercent)
                .navigationTitle("Default tip")
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

    // MARK: - Layout pieces

    private func sectionTitle(_ title: String, isFirst: Bool = false) -> some View {
        Text(title)
            .font(TB.Typography.section())
            .tracking(2.2)
            .textCase(.uppercase)
            .foregroundStyle(TB.Palette.inkFaint)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, isFirst ? TB.Space.sm : TB.Space.xl)
            .padding(.bottom, TB.Space.sm)
    }

    private func sectionFooter(_ text: String) -> some View {
        Text(text)
            .font(TB.Typography.meta())
            .foregroundStyle(TB.Palette.inkSoft)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, TB.Space.sm)
            .padding(.bottom, TB.Space.xs)
    }

    private func settingsCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        VStack(spacing: 0) {
            content()
        }
        .background(TB.Palette.surface1)
        .clipShape(RoundedRectangle(cornerRadius: TB.Radius.lg, style: .continuous))
        .tbShadow(.sm)
    }

    private func settingsRowDivider() -> some View {
        Rectangle()
            .fill(TB.Palette.rule)
            .frame(height: 1)
            .padding(.leading, 56)
    }

    private func distributionPickerRow(
        icon: String,
        title: String,
        selection: Binding<DistributionMode>
    ) -> some View {
        HStack(alignment: .center, spacing: TB.Space.md) {
            SettingsIconBadge(systemName: icon)
            Text(title)
                .font(TB.Typography.body())
                .foregroundStyle(TB.Palette.ink)
            Spacer(minLength: TB.Space.sm)
            Picker(title, selection: selection) {
                ForEach(DistributionMode.allCases) { mode in
                    Text(mode.displayName).tag(mode)
                }
            }
            .labelsHidden()
            .pickerStyle(.menu)
        }
        .padding(.horizontal, TB.Space.lg)
        .padding(.vertical, TB.Space.md)
    }

    private func settingsLinkRowLabel(icon: String, title: String) -> some View {
        HStack(spacing: TB.Space.md) {
            SettingsIconBadge(systemName: icon)
            Text(title)
                .font(TB.Typography.body())
                .foregroundStyle(TB.Palette.ink)
            Spacer()
            Image(systemName: "arrow.up.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(TB.Palette.inkDim)
        }
        .padding(.horizontal, TB.Space.lg)
        .padding(.vertical, TB.Space.md)
    }

    // MARK: - Actions

    private func signOut() {
        Task {
            try? await authService.signOut()
            await APIClient.shared.clearAuthTokenProvider()
            await APIClient.shared.setAuthTokenProvider {
                await AuthService.shared.getAccessToken()
            }
            triggerHaptic()
        }
    }

    private func deleteAccount() {
        Task {
            try? await authService.deleteAccount()
            await APIClient.shared.clearAuthTokenProvider()
            await APIClient.shared.setAuthTokenProvider {
                await AuthService.shared.getAccessToken()
            }
            triggerHaptic()
        }
    }

    private func triggerHaptic() {
        guard preferences.hapticFeedback else { return }

        #if os(iOS)
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
        #endif
    }
}

// MARK: - Icon badge

private struct SettingsIconBadge: View {
    let systemName: String
    var emphasize: Bool = false

    var body: some View {
        Image(systemName: systemName)
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(emphasize ? TB.Palette.danger : TB.Palette.inkSoft)
            .frame(width: 36, height: 36)
            .background(emphasize ? TB.Palette.dangerTint : TB.Palette.surface2)
            .clipShape(RoundedRectangle(cornerRadius: TB.Radius.sm, style: .continuous))
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Settings") {
    SettingsView()
}
#endif
