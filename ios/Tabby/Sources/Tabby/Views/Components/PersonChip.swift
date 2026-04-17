import SwiftUI

// MARK: - PersonChip View

/// A chip component for displaying a person in the bill splitting UI
///
/// Features:
/// - Circular avatar with initials or async image
/// - Name display below avatar
/// - Total amount below name
/// - Selected state with border highlight
/// - Compact mode for horizontal scrolling
///
/// Usage:
/// ```swift
/// PersonChip(
///     name: "Alice",
///     avatarUrl: nil,
///     total: 45.99,
///     isSelected: true,
///     onTap: { print("Selected Alice") }
/// )
/// ```
struct PersonChip: View {
    let name: String
    let avatarUrl: String?
    let total: Decimal
    let isSelected: Bool
    let isCompact: Bool
    let onTap: (() -> Void)?

    /// Creates a person chip
    /// - Parameters:
    ///   - name: The person's display name
    ///   - avatarUrl: Optional URL for profile image
    ///   - total: The person's total amount owed
    ///   - isSelected: Whether this person is currently selected
    ///   - isCompact: Whether to use compact layout (default: false)
    ///   - onTap: Optional tap handler for selection
    init(
        name: String,
        avatarUrl: String? = nil,
        total: Decimal = 0,
        isSelected: Bool = false,
        isCompact: Bool = false,
        onTap: (() -> Void)? = nil
    ) {
        self.name = name
        self.avatarUrl = avatarUrl
        self.total = total
        self.isSelected = isSelected
        self.isCompact = isCompact
        self.onTap = onTap
    }

    private var avatarSize: CGFloat {
        isCompact ? 44 : 56
    }

    var body: some View {
        Button(action: { onTap?() }) {
            VStack(spacing: isCompact ? 4 : 6) {
                // Avatar
                PersonAvatar(
                    name: name,
                    avatarUrl: avatarUrl,
                    size: avatarSize,
                    isSelected: isSelected
                )

                // Name
                Text(name)
                    .font(isCompact ? .caption : .subheadline)
                    .fontWeight(isSelected ? .semibold : .regular)
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                // Total amount
                CurrencyText(
                    total,
                    style: isCompact ? .small : .medium,
                    colorType: isSelected ? .standard : .muted
                )
            }
            .frame(width: isCompact ? 64 : 80)
            .padding(.vertical, isCompact ? 8 : 12)
            .padding(.horizontal, 4)
            .background(
                isSelected
                    ? Color.accentColor.opacity(0.1)
                    : Color.clear
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.2), value: isSelected)
    }
}

// MARK: - PersonAvatar View

/// A circular avatar showing initials or an image
struct PersonAvatar: View {
    let name: String
    let avatarUrl: String?
    let size: CGFloat
    let isSelected: Bool

    init(
        name: String,
        avatarUrl: String? = nil,
        size: CGFloat = 56,
        isSelected: Bool = false
    ) {
        self.name = name
        self.avatarUrl = avatarUrl
        self.size = size
        self.isSelected = isSelected
    }

    var body: some View {
        Group {
            if let urlString = avatarUrl, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure:
                        initialsView
                    case .empty:
                        ProgressView()
                    @unknown default:
                        initialsView
                    }
                }
            } else {
                initialsView
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(
            Circle()
                .strokeBorder(
                    isSelected ? Color.accentColor : Color.clear,
                    lineWidth: isSelected ? 3 : 0
                )
        )
    }

    private var initialsView: some View {
        ZStack {
            Circle()
                .fill(avatarColor)

            Text(initials)
                .font(.system(size: size * 0.4, weight: .medium))
                .foregroundStyle(.white)
        }
    }

    private var initials: String {
        let components = name.split(separator: " ")
        let firstInitial = components.first?.first.map(String.init) ?? ""
        let lastInitial = components.count > 1
            ? components.last?.first.map(String.init) ?? ""
            : ""
        return (firstInitial + lastInitial).uppercased()
    }

    /// Generates a consistent color based on the name
    private var avatarColor: Color {
        let colors: [Color] = [
            .blue, .green, .orange, .purple, .pink, .red, .teal, .indigo
        ]
        let hash = name.hashValue
        let index = abs(hash) % colors.count
        return colors[index]
    }
}

// MARK: - PersonChip from BillPerson

extension PersonChip {
    /// Creates a PersonChip from a BillPerson model
    /// - Parameters:
    ///   - person: The BillPerson to display
    ///   - total: The person's total amount
    ///   - isSelected: Whether selected
    ///   - isCompact: Whether to use compact layout
    ///   - onTap: Optional tap handler
    init(
        person: BillPerson,
        total: Decimal = 0,
        isSelected: Bool = false,
        isCompact: Bool = false,
        onTap: (() -> Void)? = nil
    ) {
        self.name = person.name
        self.avatarUrl = person.avatarUrl
        self.total = total
        self.isSelected = isSelected
        self.isCompact = isCompact
        self.onTap = onTap
    }
}

// MARK: - Person Chip Row

/// A horizontal scrolling row of person chips
struct PersonChipRow: View {
    let people: [BillPerson]
    let selectedPersonId: String?
    let totals: [String: Decimal]
    let isCompact: Bool
    let onSelect: (String) -> Void

    init(
        people: [BillPerson],
        selectedPersonId: String? = nil,
        totals: [String: Decimal] = [:],
        isCompact: Bool = false,
        onSelect: @escaping (String) -> Void
    ) {
        self.people = people
        self.selectedPersonId = selectedPersonId
        self.totals = totals
        self.isCompact = isCompact
        self.onSelect = onSelect
    }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: isCompact ? 8 : 12) {
                ForEach(people) { person in
                    PersonChip(
                        person: person,
                        total: totals[person.id] ?? 0,
                        isSelected: selectedPersonId == person.id,
                        isCompact: isCompact,
                        onTap: { onSelect(person.id) }
                    )
                }
            }
            .padding(.horizontal)
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Person Chips") {
    VStack(spacing: 24) {
        Text("Standard Size")
            .font(.headline)

        HStack(spacing: 16) {
            PersonChip(
                name: "Alice Johnson",
                total: 45.99,
                isSelected: true
            )

            PersonChip(
                name: "Bob",
                total: 32.50,
                isSelected: false
            )

            PersonChip(
                name: "Charlie Smith",
                total: 0,
                isSelected: false
            )
        }

        Divider()

        Text("Compact Size")
            .font(.headline)

        HStack(spacing: 8) {
            PersonChip(
                name: "Alice",
                total: 45.99,
                isSelected: true,
                isCompact: true
            )

            PersonChip(
                name: "Bob",
                total: 32.50,
                isSelected: false,
                isCompact: true
            )

            PersonChip(
                name: "Charlie",
                total: 18.00,
                isSelected: false,
                isCompact: true
            )

            PersonChip(
                name: "Diana",
                total: 22.75,
                isSelected: false,
                isCompact: true
            )
        }

        Divider()

        Text("Avatar Only")
            .font(.headline)

        HStack(spacing: 12) {
            PersonAvatar(name: "Alice", size: 44, isSelected: false)
            PersonAvatar(name: "Bob Smith", size: 44, isSelected: true)
            PersonAvatar(name: "Charlie", size: 44, isSelected: false)
            PersonAvatar(name: "Diana Lee", size: 44, isSelected: false)
        }
    }
    .padding()
}
#endif
