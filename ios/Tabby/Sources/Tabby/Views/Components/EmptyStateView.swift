import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

// MARK: - EmptyStateView

/// A view for displaying empty states with icon, title, subtitle, and optional action
///
/// Features:
/// - SF Symbol icon with customizable size and color
/// - Title and subtitle text
/// - Optional action button
/// - Customizable spacing and styling
///
/// Usage:
/// ```swift
/// EmptyStateView(
///     icon: "doc.text.magnifyingglass",
///     title: "No Items Found",
///     subtitle: "Scan a receipt to get started",
///     actionTitle: "Scan Receipt",
///     action: { /* handle action */ }
/// )
/// ```
struct EmptyStateView: View {
    let icon: String
    let title: String
    let subtitle: String
    let iconColor: Color
    let actionTitle: String?
    let action: (() -> Void)?

    /// Creates an empty state view
    /// - Parameters:
    ///   - icon: SF Symbol name for the icon
    ///   - title: Main title text
    ///   - subtitle: Secondary descriptive text
    ///   - iconColor: Color for the icon (default: .secondary)
    ///   - actionTitle: Optional button title
    ///   - action: Optional action handler for the button
    init(
        icon: String,
        title: String,
        subtitle: String = "",
        iconColor: Color = .secondary,
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.icon = icon
        self.title = title
        self.subtitle = subtitle
        self.iconColor = iconColor
        self.actionTitle = actionTitle
        self.action = action
    }

    var body: some View {
        VStack(spacing: 16) {
            // Icon
            Image(systemName: icon)
                .font(.system(size: 56))
                .foregroundStyle(iconColor)

            // Text content
            VStack(spacing: 8) {
                Text(title)
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.center)

                if !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
            }

            // Action button
            if let actionTitle = actionTitle, let action = action {
                Button(action: action) {
                    Text(actionTitle)
                        .font(.headline)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(Color.accentColor)
                        .clipShape(Capsule())
                }
                .padding(.top, 8)
            }
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Convenience Initializers

extension EmptyStateView {
    /// Empty state for no items on a bill
    static func noItems(action: (() -> Void)? = nil) -> EmptyStateView {
        EmptyStateView(
            icon: "list.bullet.rectangle",
            title: "No Items Yet",
            subtitle: "Scan a receipt or add items manually to get started",
            iconColor: .orange,
            actionTitle: action != nil ? "Scan Receipt" : nil,
            action: action
        )
    }

    /// Empty state for no people added
    static func noPeople(action: (() -> Void)? = nil) -> EmptyStateView {
        EmptyStateView(
            icon: "person.2",
            title: "No People Added",
            subtitle: "Add people to start splitting the bill",
            iconColor: .blue,
            actionTitle: action != nil ? "Add Person" : nil,
            action: action
        )
    }

    /// Empty state for no assignments
    static func noAssignments() -> EmptyStateView {
        EmptyStateView(
            icon: "arrow.left.arrow.right",
            title: "No Items Assigned",
            subtitle: "Tap items to assign them to people",
            iconColor: .purple
        )
    }

    /// Empty state for no bill history
    static func noHistory(action: (() -> Void)? = nil) -> EmptyStateView {
        EmptyStateView(
            icon: "clock",
            title: "No Bill History",
            subtitle: "Your past bills will appear here",
            iconColor: .gray,
            actionTitle: action != nil ? "Start New Bill" : nil,
            action: action
        )
    }

    /// Empty state for search results
    static func noSearchResults(query: String) -> EmptyStateView {
        EmptyStateView(
            icon: "magnifyingglass",
            title: "No Results",
            subtitle: "No items matching \"\(query)\"",
            iconColor: .secondary
        )
    }

    /// Empty state for error
    static func error(message: String, retryAction: (() -> Void)? = nil) -> EmptyStateView {
        EmptyStateView(
            icon: "exclamationmark.triangle",
            title: "Something Went Wrong",
            subtitle: message,
            iconColor: .red,
            actionTitle: retryAction != nil ? "Try Again" : nil,
            action: retryAction
        )
    }

    /// Empty state for no network
    static func noNetwork(retryAction: (() -> Void)? = nil) -> EmptyStateView {
        EmptyStateView(
            icon: "wifi.slash",
            title: "No Connection",
            subtitle: "Check your internet connection and try again",
            iconColor: .orange,
            actionTitle: retryAction != nil ? "Retry" : nil,
            action: retryAction
        )
    }
}

// MARK: - Empty State Modifier

/// A view modifier that shows empty state when a collection is empty
struct EmptyStateModifier<EmptyContent: View>: ViewModifier {
    let isEmpty: Bool
    let emptyContent: () -> EmptyContent

    func body(content: Content) -> some View {
        if isEmpty {
            emptyContent()
        } else {
            content
        }
    }
}

extension View {
    /// Shows empty state content when condition is true
    /// - Parameters:
    ///   - isEmpty: Condition to show empty state
    ///   - content: The empty state view to display
    func emptyState<Content: View>(
        when isEmpty: Bool,
        @ViewBuilder content: @escaping () -> Content
    ) -> some View {
        modifier(EmptyStateModifier(isEmpty: isEmpty, emptyContent: content))
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Empty States") {
    ScrollView {
        VStack(spacing: 40) {
            EmptyStateView.noItems {
                print("Scan tapped")
            }
            .frame(height: 250)
            .background(Color.gray.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))

            EmptyStateView.noPeople {
                print("Add person tapped")
            }
            .frame(height: 250)
            .background(Color.gray.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))

            EmptyStateView.noAssignments()
                .frame(height: 200)
                .background(Color.gray.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))

            EmptyStateView.error(message: "Failed to load bill data") {
                print("Retry tapped")
            }
            .frame(height: 250)
            .background(Color.gray.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .padding()
    }
}

#Preview("Empty State Modifier") {
    struct PreviewWrapper: View {
        @State private var items: [String] = []

        var body: some View {
            List {
                ForEach(items, id: \.self) { item in
                    Text(item)
                }
            }
            .emptyState(when: items.isEmpty) {
                EmptyStateView.noItems {
                    items = ["Item 1", "Item 2", "Item 3"]
                }
            }
        }
    }

    return PreviewWrapper()
}
#endif
