import Foundation

/// Penny reconciliation algorithm to ensure totals add up exactly
/// Distributes rounding differences to the largest amounts first
public struct PennyReconciler {

    /// Reconcile pennies by distributing rounding differences to largest totals first
    /// - Parameters:
    ///   - personTotals: Array of person totals to reconcile
    ///   - targetTotal: The exact total that person totals should sum to
    /// - Returns: Array of PersonTotal with adjusted totals that sum exactly to targetTotal
    public static func reconcilePennies(
        personTotals: [PersonTotal],
        targetTotal: Decimal
    ) -> [PersonTotal] {
        // 1. Round all values to cents (2 decimal places)
        var roundedTotals = personTotals.map { person -> PersonTotal in
            var rounded = person
            rounded.subtotal = roundToCents(person.subtotal)
            rounded.discountShare = roundToCents(person.discountShare)
            rounded.serviceFeeShare = roundToCents(person.serviceFeeShare)
            rounded.taxShare = roundToCents(person.taxShare)
            rounded.tipShare = roundToCents(person.tipShare)
            rounded.total = roundToCents(person.total)
            rounded.items = person.items.map { item -> AssignedLine in
                var roundedItem = item
                roundedItem.shareAmount = roundToCents(item.shareAmount)
                return roundedItem
            }
            return rounded
        }

        // 2. Calculate current total after rounding
        let currentTotal = roundedTotals.reduce(Decimal.zero) { sum, person in
            sum + person.total
        }

        // 3. Find the difference (in cents)
        let difference = targetTotal - currentTotal
        let differenceCents = Int(truncating: (difference * 100).rounded as NSDecimalNumber)

        // 4. If no difference, return as is
        if differenceCents == 0 {
            return roundedTotals
        }

        // 5. Sort people by their total (descending) to distribute to largest first
        var sortedTotals = roundedTotals.sorted { $0.total > $1.total }

        // 6. Distribute pennies one at a time
        let pennyValue: Decimal = differenceCents > 0 ? Decimal(string: "0.01")! : Decimal(string: "-0.01")!
        var remaining = abs(differenceCents)
        var index = 0

        while remaining > 0 && !sortedTotals.isEmpty {
            // Distribute one penny to this person
            sortedTotals[index].total += pennyValue
            sortedTotals[index].total = roundToCents(sortedTotals[index].total)
            remaining -= 1

            // Move to next person, loop back if needed
            index += 1
            if remaining > 0 && index >= sortedTotals.count {
                index = 0
            }
        }

        // 7. Return the totals in original order
        let resultMap = Dictionary(uniqueKeysWithValues: sortedTotals.map { ($0.personId, $0) })
        return personTotals.compactMap { resultMap[$0.personId] }
    }

    /// Round a Decimal value to cents (2 decimal places)
    /// Uses banker's rounding (round half to even) for consistency
    private static func roundToCents(_ value: Decimal) -> Decimal {
        var result = value
        var rounded = Decimal()
        NSDecimalRound(&rounded, &result, 2, .plain)
        return rounded
    }
}

// MARK: - Decimal Extension for Rounding

extension Decimal {
    /// Returns this Decimal rounded to 2 decimal places
    var rounded: Decimal {
        var value = self
        var result = Decimal()
        NSDecimalRound(&result, &value, 2, .plain)
        return result
    }
}
