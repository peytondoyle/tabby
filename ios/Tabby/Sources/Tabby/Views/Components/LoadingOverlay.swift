import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

// MARK: - LoadingOverlay View

/// A full-screen loading overlay with blur effect, spinner, and status text
///
/// Features:
/// - Semi-transparent blurred background
/// - Centered ProgressView spinner
/// - Customizable status text
/// - Smooth appear/disappear animation
/// - Used during API calls and async operations
///
/// Usage:
/// ```swift
/// ZStack {
///     ContentView()
///
///     if isLoading {
///         LoadingOverlay(statusText: "Saving changes...")
///     }
/// }
/// ```
struct LoadingOverlay: View {
    let statusText: String
    let showSpinner: Bool
    let style: LoadingOverlayStyle

    /// Creates a loading overlay
    /// - Parameters:
    ///   - statusText: The status message to display (default: "Loading...")
    ///   - showSpinner: Whether to show the spinner (default: true)
    ///   - style: The visual style of the overlay (default: .blur)
    init(
        statusText: String = "Loading...",
        showSpinner: Bool = true,
        style: LoadingOverlayStyle = .blur
    ) {
        self.statusText = statusText
        self.showSpinner = showSpinner
        self.style = style
    }

    var body: some View {
        ZStack {
            // Background
            backgroundView

            // Content
            VStack(spacing: 16) {
                if showSpinner {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .scaleEffect(1.2)
                        .tint(style == .light ? .white : .primary)
                }

                if !statusText.isEmpty {
                    Text(statusText)
                        .font(.subheadline)
                        .foregroundStyle(style == .light ? .white : .primary)
                        .multilineTextAlignment(.center)
                }
            }
            .padding(24)
            .background(cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .ignoresSafeArea()
        .transition(.opacity)
    }

    @ViewBuilder
    private var backgroundView: some View {
        switch style {
        case .blur:
            Rectangle()
                .fill(.ultraThinMaterial)
        case .dark:
            Color.black.opacity(0.5)
        case .light:
            Color.white.opacity(0.8)
        case .transparent:
            Color.clear
        }
    }

    @ViewBuilder
    private var cardBackground: some View {
        switch style {
        case .blur:
            Color.clear
        case .dark:
            Color.white.opacity(0.9)
        case .light:
            Color.black.opacity(0.7)
        case .transparent:
            Color.white
                .shadow(color: .black.opacity(0.1), radius: 10)
        }
    }
}

// MARK: - Loading Overlay Style

/// Visual styles for the loading overlay
enum LoadingOverlayStyle {
    case blur       // Blurred background (default)
    case dark       // Dark semi-transparent background
    case light      // Light background with dark text
    case transparent // No background, just the card
}

// MARK: - Loading View Modifier

/// A view modifier that shows a loading overlay when loading is true
struct LoadingModifier: ViewModifier {
    let isLoading: Bool
    let statusText: String
    let style: LoadingOverlayStyle

    func body(content: Content) -> some View {
        ZStack {
            content
                .disabled(isLoading)

            if isLoading {
                LoadingOverlay(
                    statusText: statusText,
                    style: style
                )
            }
        }
        .animation(.easeInOut(duration: 0.2), value: isLoading)
    }
}

extension View {
    /// Shows a loading overlay when the condition is true
    /// - Parameters:
    ///   - isLoading: Whether to show the loading overlay
    ///   - statusText: The status message to display
    ///   - style: The visual style of the overlay
    func loading(
        _ isLoading: Bool,
        statusText: String = "Loading...",
        style: LoadingOverlayStyle = .blur
    ) -> some View {
        modifier(LoadingModifier(
            isLoading: isLoading,
            statusText: statusText,
            style: style
        ))
    }
}

// MARK: - Inline Loading Indicator

/// A smaller inline loading indicator for buttons and list items
struct InlineLoadingIndicator: View {
    let text: String
    let showSpinner: Bool

    init(text: String = "", showSpinner: Bool = true) {
        self.text = text
        self.showSpinner = showSpinner
    }

    var body: some View {
        HStack(spacing: 8) {
            if showSpinner {
                ProgressView()
                    .progressViewStyle(.circular)
                    .scaleEffect(0.8)
            }

            if !text.isEmpty {
                Text(text)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

// MARK: - Loading Button

/// A button that shows a loading state
struct LoadingButton: View {
    let title: String
    let isLoading: Bool
    let loadingText: String
    let action: () -> Void

    init(
        _ title: String,
        isLoading: Bool,
        loadingText: String = "Loading...",
        action: @escaping () -> Void
    ) {
        self.title = title
        self.isLoading = isLoading
        self.loadingText = loadingText
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .scaleEffect(0.8)
                        .tint(.white)
                }

                Text(isLoading ? loadingText : title)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color.accentColor)
            .foregroundStyle(.white)
            .font(.headline)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .disabled(isLoading)
        .opacity(isLoading ? 0.8 : 1)
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Loading Overlay Styles") {
    VStack {
        Text("Content behind overlay")
            .font(.largeTitle)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Color.gray.opacity(0.1))
    .overlay {
        LoadingOverlay(statusText: "Saving bill...")
    }
}

#Preview("Loading Modifier") {
    struct PreviewWrapper: View {
        @State private var isLoading = true

        var body: some View {
            VStack(spacing: 20) {
                Text("Main Content")
                    .font(.title)

                Button("Toggle Loading") {
                    isLoading.toggle()
                }
                .buttonStyle(.borderedProminent)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .loading(isLoading, statusText: "Processing...")
        }
    }

    return PreviewWrapper()
}

#Preview("Loading Button") {
    struct PreviewWrapper: View {
        @State private var isLoading = false

        var body: some View {
            VStack(spacing: 20) {
                LoadingButton("Save Changes", isLoading: isLoading, loadingText: "Saving...") {
                    isLoading = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        isLoading = false
                    }
                }

                LoadingButton("Submit", isLoading: true, loadingText: "Submitting...") {}
            }
            .padding()
        }
    }

    return PreviewWrapper()
}

#Preview("Inline Loading") {
    List {
        HStack {
            Text("Item 1")
            Spacer()
            InlineLoadingIndicator(text: "Syncing")
        }

        HStack {
            Text("Item 2")
            Spacer()
            InlineLoadingIndicator()
        }

        HStack {
            Text("Item 3")
            Spacer()
            Image(systemName: "checkmark")
                .foregroundStyle(.green)
        }
    }
}
#endif
