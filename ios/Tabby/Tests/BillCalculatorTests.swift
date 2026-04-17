import XCTest
@testable import Tabby

final class BillCalculatorTests: XCTestCase {

    // MARK: - Helper Functions

    /// Helper to create a Decimal from a string for precision
    private func decimal(_ value: String) -> Decimal {
        Decimal(string: value)!
    }

    /// Helper to create a simple item
    private func makeItem(
        id: String,
        label: String,
        price: Decimal,
        quantity: Int = 1,
        emoji: String? = nil
    ) -> Item {
        Item(
            id: id,
            emoji: emoji,
            label: label,
            price: price,
            quantity: quantity,
            unitPrice: price / Decimal(quantity)
        )
    }

    /// Helper to create a person
    private func makePerson(id: String, name: String) -> Person {
        Person(id: id, name: name, isPaid: false)
    }

    /// Helper to create a share
    private func makeShare(itemId: String, personId: String, weight: Decimal = 1) -> ItemShare {
        ItemShare(itemId: itemId, personId: personId, weight: weight)
    }

    // MARK: - 1. Basic Calculations

    func testSingleItemSinglePerson() {
        // Single item, single person -> person gets full amount
        let items = [makeItem(id: "1", label: "Burger", price: decimal("10.00"))]
        let shares = [makeShare(itemId: "1", personId: "p1")]
        let people = [makePerson(id: "p1", name: "Alice")]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: decimal("1.00"),
            tip: decimal("2.00"),
            discount: .zero,
            serviceFee: .zero
        )

        XCTAssertEqual(result.grandTotal, decimal("13.00"))
        XCTAssertEqual(result.personTotals.count, 1)
        XCTAssertEqual(result.personTotals[0].total, decimal("13.00"))
        XCTAssertEqual(result.personTotals[0].subtotal, decimal("10.00"))
        XCTAssertEqual(result.personTotals[0].taxShare, decimal("1.00"))
        XCTAssertEqual(result.personTotals[0].tipShare, decimal("2.00"))
    }

    func testMultipleItemsSinglePerson() {
        // Multiple items, single person -> person gets sum
        let items = [
            makeItem(id: "1", label: "Burger", price: decimal("10.00")),
            makeItem(id: "2", label: "Fries", price: decimal("5.00")),
            makeItem(id: "3", label: "Drink", price: decimal("3.00"))
        ]
        let shares = [
            makeShare(itemId: "1", personId: "p1"),
            makeShare(itemId: "2", personId: "p1"),
            makeShare(itemId: "3", personId: "p1")
        ]
        let people = [makePerson(id: "p1", name: "Alice")]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: decimal("1.80"),
            tip: decimal("3.60"),
            discount: .zero,
            serviceFee: .zero
        )

        // Subtotal: 10 + 5 + 3 = 18
        // Grand total: 18 + 1.80 + 3.60 = 23.40
        XCTAssertEqual(result.subtotal, decimal("18.00"))
        XCTAssertEqual(result.grandTotal, decimal("23.40"))
        XCTAssertEqual(result.personTotals[0].subtotal, decimal("18.00"))
        XCTAssertEqual(result.personTotals[0].total, decimal("23.40"))
    }

    func testTaxAndTipAddedProportionally() {
        // Two people with different amounts - tax/tip split proportionally
        let items = [
            makeItem(id: "1", label: "Steak", price: decimal("30.00")),
            makeItem(id: "2", label: "Salad", price: decimal("10.00"))
        ]
        let shares = [
            makeShare(itemId: "1", personId: "p1"),
            makeShare(itemId: "2", personId: "p2")
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: decimal("4.00"),
            tip: decimal("8.00"),
            discount: .zero,
            serviceFee: .zero,
            taxMode: .proportional,
            tipMode: .proportional
        )

        // Subtotal: 40.00, Alice has 75% (30/40), Bob has 25% (10/40)
        // Tax: Alice = 3.00, Bob = 1.00
        // Tip: Alice = 6.00, Bob = 2.00
        XCTAssertEqual(result.grandTotal, decimal("52.00"))

        let alice = result.personTotals.first { $0.personId == "p1" }!
        let bob = result.personTotals.first { $0.personId == "p2" }!

        XCTAssertEqual(alice.subtotal, decimal("30.00"))
        XCTAssertEqual(alice.taxShare, decimal("3.00"))
        XCTAssertEqual(alice.tipShare, decimal("6.00"))
        XCTAssertEqual(alice.total, decimal("39.00"))

        XCTAssertEqual(bob.subtotal, decimal("10.00"))
        XCTAssertEqual(bob.taxShare, decimal("1.00"))
        XCTAssertEqual(bob.tipShare, decimal("2.00"))
        XCTAssertEqual(bob.total, decimal("13.00"))
    }

    // MARK: - 2. Split Items

    func testItemSplit5050BetweenTwoPeople() {
        // Item split 50/50 between 2 people
        let items = [makeItem(id: "1", label: "Pizza", price: decimal("20.00"))]
        let shares = [
            makeShare(itemId: "1", personId: "p1", weight: decimal("0.5")),
            makeShare(itemId: "1", personId: "p2", weight: decimal("0.5"))
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: decimal("2.00"),
            tip: decimal("4.00"),
            discount: .zero,
            serviceFee: .zero
        )

        // Each person gets half of everything
        XCTAssertEqual(result.grandTotal, decimal("26.00"))

        let alice = result.personTotals.first { $0.personId == "p1" }!
        let bob = result.personTotals.first { $0.personId == "p2" }!

        XCTAssertEqual(alice.subtotal, decimal("10.00"))
        XCTAssertEqual(alice.total, decimal("13.00"))

        XCTAssertEqual(bob.subtotal, decimal("10.00"))
        XCTAssertEqual(bob.total, decimal("13.00"))
    }

    func testItemSplitWithCustomWeights6040() {
        // Item split with custom weights (60/40)
        let items = [makeItem(id: "1", label: "Appetizer", price: decimal("10.00"))]
        let shares = [
            makeShare(itemId: "1", personId: "p1", weight: decimal("0.6")),
            makeShare(itemId: "1", personId: "p2", weight: decimal("0.4"))
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: .zero,
            tip: .zero,
            discount: .zero,
            serviceFee: .zero
        )

        let alice = result.personTotals.first { $0.personId == "p1" }!
        let bob = result.personTotals.first { $0.personId == "p2" }!

        XCTAssertEqual(alice.subtotal, decimal("6.00"))
        XCTAssertEqual(bob.subtotal, decimal("4.00"))
    }

    func testItemSplitBetweenThreePeople() {
        // Item split between 3+ people
        let items = [makeItem(id: "1", label: "Nachos", price: decimal("15.00"))]
        let shares = [
            makeShare(itemId: "1", personId: "p1", weight: decimal("1")),
            makeShare(itemId: "1", personId: "p2", weight: decimal("1")),
            makeShare(itemId: "1", personId: "p3", weight: decimal("1"))
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob"),
            makePerson(id: "p3", name: "Carol")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: .zero,
            tip: .zero,
            discount: .zero,
            serviceFee: .zero
        )

        // Each person gets 1/3 = $5.00 each
        XCTAssertEqual(result.grandTotal, decimal("15.00"))

        for personTotal in result.personTotals {
            XCTAssertEqual(personTotal.subtotal, decimal("5.00"))
            XCTAssertEqual(personTotal.total, decimal("5.00"))
        }
    }

    func testMixedOwnedAndSharedItems() {
        // Mix of owned and shared items
        let items = [
            makeItem(id: "1", label: "Burger", price: decimal("12.00")),
            makeItem(id: "2", label: "Shared Fries", price: decimal("6.00"))
        ]
        let shares = [
            makeShare(itemId: "1", personId: "p1", weight: decimal("1")), // Alice owns burger
            makeShare(itemId: "2", personId: "p1", weight: decimal("0.5")), // Shared fries
            makeShare(itemId: "2", personId: "p2", weight: decimal("0.5"))
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: .zero,
            tip: .zero,
            discount: .zero,
            serviceFee: .zero
        )

        let alice = result.personTotals.first { $0.personId == "p1" }!
        let bob = result.personTotals.first { $0.personId == "p2" }!

        // Alice: $12 burger + $3 fries = $15
        // Bob: $3 fries = $3
        XCTAssertEqual(alice.subtotal, decimal("15.00"))
        XCTAssertEqual(bob.subtotal, decimal("3.00"))
    }

    // MARK: - 3. Proportional vs Even Distribution

    func testProportionalTaxDistribution() {
        // Proportional tax: person with more items pays more tax
        let items = [
            makeItem(id: "1", label: "Expensive", price: decimal("80.00")),
            makeItem(id: "2", label: "Cheap", price: decimal("20.00"))
        ]
        let shares = [
            makeShare(itemId: "1", personId: "p1"),
            makeShare(itemId: "2", personId: "p2")
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: decimal("10.00"),
            tip: .zero,
            discount: .zero,
            serviceFee: .zero,
            taxMode: .proportional
        )

        let alice = result.personTotals.first { $0.personId == "p1" }!
        let bob = result.personTotals.first { $0.personId == "p2" }!

        // Alice has 80% of subtotal -> 80% of tax = $8
        // Bob has 20% of subtotal -> 20% of tax = $2
        XCTAssertEqual(alice.taxShare, decimal("8.00"))
        XCTAssertEqual(bob.taxShare, decimal("2.00"))
    }

    func testEvenTaxDistribution() {
        // Even tax: everyone pays equal tax
        let items = [
            makeItem(id: "1", label: "Expensive", price: decimal("80.00")),
            makeItem(id: "2", label: "Cheap", price: decimal("20.00"))
        ]
        let shares = [
            makeShare(itemId: "1", personId: "p1"),
            makeShare(itemId: "2", personId: "p2")
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: decimal("10.00"),
            tip: .zero,
            discount: .zero,
            serviceFee: .zero,
            taxMode: .even
        )

        let alice = result.personTotals.first { $0.personId == "p1" }!
        let bob = result.personTotals.first { $0.personId == "p2" }!

        // Each pays $5 tax regardless of their subtotal
        XCTAssertEqual(alice.taxShare, decimal("5.00"))
        XCTAssertEqual(bob.taxShare, decimal("5.00"))
    }

    func testProportionalTipDistribution() {
        // Proportional tip: person with more items pays more tip
        let items = [
            makeItem(id: "1", label: "Expensive", price: decimal("60.00")),
            makeItem(id: "2", label: "Cheap", price: decimal("40.00"))
        ]
        let shares = [
            makeShare(itemId: "1", personId: "p1"),
            makeShare(itemId: "2", personId: "p2")
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: .zero,
            tip: decimal("20.00"),
            discount: .zero,
            serviceFee: .zero,
            tipMode: .proportional
        )

        let alice = result.personTotals.first { $0.personId == "p1" }!
        let bob = result.personTotals.first { $0.personId == "p2" }!

        // Alice has 60% -> $12 tip
        // Bob has 40% -> $8 tip
        XCTAssertEqual(alice.tipShare, decimal("12.00"))
        XCTAssertEqual(bob.tipShare, decimal("8.00"))
    }

    func testEvenTipDistribution() {
        // Even tip: everyone pays equal tip
        let items = [
            makeItem(id: "1", label: "Expensive", price: decimal("60.00")),
            makeItem(id: "2", label: "Cheap", price: decimal("40.00"))
        ]
        let shares = [
            makeShare(itemId: "1", personId: "p1"),
            makeShare(itemId: "2", personId: "p2")
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: .zero,
            tip: decimal("20.00"),
            discount: .zero,
            serviceFee: .zero,
            tipMode: .even
        )

        let alice = result.personTotals.first { $0.personId == "p1" }!
        let bob = result.personTotals.first { $0.personId == "p2" }!

        // Each pays $10 tip regardless of their subtotal
        XCTAssertEqual(alice.tipShare, decimal("10.00"))
        XCTAssertEqual(bob.tipShare, decimal("10.00"))
    }

    func testMixedTaxProportionalTipEven() {
        // Tax proportional, tip even
        let items = [
            makeItem(id: "1", label: "Item A", price: decimal("75.00")),
            makeItem(id: "2", label: "Item B", price: decimal("25.00"))
        ]
        let shares = [
            makeShare(itemId: "1", personId: "p1"),
            makeShare(itemId: "2", personId: "p2")
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: decimal("10.00"),
            tip: decimal("20.00"),
            discount: .zero,
            serviceFee: .zero,
            taxMode: .proportional,
            tipMode: .even
        )

        let alice = result.personTotals.first { $0.personId == "p1" }!
        let bob = result.personTotals.first { $0.personId == "p2" }!

        // Tax proportional: Alice 75%, Bob 25%
        XCTAssertEqual(alice.taxShare, decimal("7.50"))
        XCTAssertEqual(bob.taxShare, decimal("2.50"))

        // Tip even: each $10
        XCTAssertEqual(alice.tipShare, decimal("10.00"))
        XCTAssertEqual(bob.tipShare, decimal("10.00"))
    }

    // MARK: - 4. Penny Reconciliation

    func testTenDollarsSplitThreeWaysSumsExactly() {
        // $10.00 split 3 ways should sum to exactly $10.00
        let items = [makeItem(id: "1", label: "Shared", price: decimal("10.00"))]
        let shares = [
            makeShare(itemId: "1", personId: "p1", weight: decimal("1")),
            makeShare(itemId: "1", personId: "p2", weight: decimal("1")),
            makeShare(itemId: "1", personId: "p3", weight: decimal("1"))
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob"),
            makePerson(id: "p3", name: "Carol")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: .zero,
            tip: .zero,
            discount: .zero,
            serviceFee: .zero
        )

        // Sum of all person totals must equal grand total exactly
        let sumOfTotals = result.personTotals.reduce(Decimal.zero) { $0 + $1.total }
        XCTAssertEqual(sumOfTotals, result.grandTotal)
        XCTAssertEqual(sumOfTotals, decimal("10.00"))
    }

    func testNoFloatingPointDrift() {
        // Verify no floating point drift with many calculations
        let items = [
            makeItem(id: "1", label: "Item 1", price: decimal("33.33")),
            makeItem(id: "2", label: "Item 2", price: decimal("66.67"))
        ]
        let shares = [
            makeShare(itemId: "1", personId: "p1", weight: decimal("1")),
            makeShare(itemId: "1", personId: "p2", weight: decimal("1")),
            makeShare(itemId: "1", personId: "p3", weight: decimal("1")),
            makeShare(itemId: "2", personId: "p1", weight: decimal("1")),
            makeShare(itemId: "2", personId: "p2", weight: decimal("1"))
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob"),
            makePerson(id: "p3", name: "Carol")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: decimal("8.00"),
            tip: decimal("16.00"),
            discount: .zero,
            serviceFee: .zero
        )

        // Sum of person totals must equal grand total exactly
        let sumOfTotals = result.personTotals.reduce(Decimal.zero) { $0 + $1.total }
        XCTAssertEqual(sumOfTotals, result.grandTotal)

        // Validate using the built-in validator
        let validation = BillCalculator.validateBillTotals(result)
        XCTAssertTrue(validation.valid, validation.error ?? "")
    }

    func testLargestTotalsGetExtraPennies() {
        // Verify largest totals get extra pennies
        let items = [makeItem(id: "1", label: "Shared", price: decimal("10.00"))]
        let shares = [
            makeShare(itemId: "1", personId: "p1", weight: decimal("1")),
            makeShare(itemId: "1", personId: "p2", weight: decimal("1")),
            makeShare(itemId: "1", personId: "p3", weight: decimal("1"))
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob"),
            makePerson(id: "p3", name: "Carol")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: .zero,
            tip: .zero,
            discount: .zero,
            serviceFee: .zero
        )

        // $10 / 3 = $3.333... -> two people get $3.34, one gets $3.33 (or similar)
        // Pennies are distributed to largest totals first
        let sortedTotals = result.personTotals.map { $0.total }.sorted(by: >)

        // At least one person should have $3.34 (got the extra penny)
        XCTAssertTrue(sortedTotals.contains(decimal("3.34")))

        // Total must be exactly $10.00
        let sum = result.personTotals.reduce(Decimal.zero) { $0 + $1.total }
        XCTAssertEqual(sum, decimal("10.00"))
    }

    func testPennyReconciliationMethod() {
        let items = [makeItem(id: "1", label: "Item", price: decimal("10.00"))]
        let shares = [
            makeShare(itemId: "1", personId: "p1", weight: decimal("1")),
            makeShare(itemId: "1", personId: "p2", weight: decimal("1")),
            makeShare(itemId: "1", personId: "p3", weight: decimal("1"))
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob"),
            makePerson(id: "p3", name: "Carol")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: .zero,
            tip: .zero,
            discount: .zero,
            serviceFee: .zero
        )

        XCTAssertEqual(result.pennyReconciliation.method, "distribute_largest")
    }

    // MARK: - 5. Edge Cases

    func testEmptyItemsArray() {
        let result = BillCalculator.computeTotals(
            items: [],
            shares: [],
            people: [makePerson(id: "p1", name: "Alice")],
            tax: decimal("5.00"),
            tip: decimal("3.00"),
            discount: .zero,
            serviceFee: .zero
        )

        XCTAssertEqual(result.subtotal, .zero)
        XCTAssertEqual(result.grandTotal, decimal("8.00")) // tax + tip
        XCTAssertEqual(result.personTotals[0].subtotal, .zero)
    }

    func testNoPeopleAssigned() {
        // Items exist but no shares assigned
        let items = [makeItem(id: "1", label: "Burger", price: decimal("10.00"))]
        let people = [makePerson(id: "p1", name: "Alice")]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: [], // No shares
            people: people,
            tax: decimal("1.00"),
            tip: decimal("2.00"),
            discount: .zero,
            serviceFee: .zero
        )

        XCTAssertEqual(result.subtotal, decimal("10.00"))
        XCTAssertEqual(result.grandTotal, decimal("13.00"))
        // Person has no items assigned, so subtotal is 0
        XCTAssertEqual(result.personTotals[0].subtotal, .zero)
    }

    func testZeroTaxAndTip() {
        let items = [makeItem(id: "1", label: "Burger", price: decimal("15.00"))]
        let shares = [makeShare(itemId: "1", personId: "p1")]
        let people = [makePerson(id: "p1", name: "Alice")]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: .zero,
            tip: .zero,
            discount: .zero,
            serviceFee: .zero
        )

        XCTAssertEqual(result.tax, .zero)
        XCTAssertEqual(result.tip, .zero)
        XCTAssertEqual(result.grandTotal, decimal("15.00"))
        XCTAssertEqual(result.personTotals[0].taxShare, .zero)
        XCTAssertEqual(result.personTotals[0].tipShare, .zero)
    }

    func testDiscountAppliedCorrectly() {
        let items = [
            makeItem(id: "1", label: "Item A", price: decimal("60.00")),
            makeItem(id: "2", label: "Item B", price: decimal("40.00"))
        ]
        let shares = [
            makeShare(itemId: "1", personId: "p1"),
            makeShare(itemId: "2", personId: "p2")
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: .zero,
            tip: .zero,
            discount: decimal("10.00"),
            serviceFee: .zero
        )

        // Subtotal: 100, Discount: 10, Grand total: 90
        XCTAssertEqual(result.subtotal, decimal("100.00"))
        XCTAssertEqual(result.discount, decimal("10.00"))
        XCTAssertEqual(result.grandTotal, decimal("90.00"))

        let alice = result.personTotals.first { $0.personId == "p1" }!
        let bob = result.personTotals.first { $0.personId == "p2" }!

        // Discount split proportionally: Alice 60%, Bob 40%
        XCTAssertEqual(alice.discountShare, decimal("6.00"))
        XCTAssertEqual(bob.discountShare, decimal("4.00"))

        // Totals after discount
        XCTAssertEqual(alice.total, decimal("54.00")) // 60 - 6
        XCTAssertEqual(bob.total, decimal("36.00"))   // 40 - 4
    }

    func testServiceFeeAddedCorrectly() {
        let items = [
            makeItem(id: "1", label: "Item A", price: decimal("75.00")),
            makeItem(id: "2", label: "Item B", price: decimal("25.00"))
        ]
        let shares = [
            makeShare(itemId: "1", personId: "p1"),
            makeShare(itemId: "2", personId: "p2")
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: .zero,
            tip: .zero,
            discount: .zero,
            serviceFee: decimal("8.00")
        )

        // Subtotal: 100, Service fee: 8, Grand total: 108
        XCTAssertEqual(result.subtotal, decimal("100.00"))
        XCTAssertEqual(result.serviceFee, decimal("8.00"))
        XCTAssertEqual(result.grandTotal, decimal("108.00"))

        let alice = result.personTotals.first { $0.personId == "p1" }!
        let bob = result.personTotals.first { $0.personId == "p2" }!

        // Service fee split proportionally: Alice 75%, Bob 25%
        XCTAssertEqual(alice.serviceFeeShare, decimal("6.00"))
        XCTAssertEqual(bob.serviceFeeShare, decimal("2.00"))

        XCTAssertEqual(alice.total, decimal("81.00")) // 75 + 6
        XCTAssertEqual(bob.total, decimal("27.00"))   // 25 + 2
    }

    func testDiscountAndServiceFeeTogether() {
        let items = [makeItem(id: "1", label: "Item", price: decimal("100.00"))]
        let shares = [makeShare(itemId: "1", personId: "p1")]
        let people = [makePerson(id: "p1", name: "Alice")]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: decimal("10.00"),
            tip: decimal("15.00"),
            discount: decimal("20.00"),
            serviceFee: decimal("5.00")
        )

        // Grand total: 100 - 20 + 5 + 10 + 15 = 110
        XCTAssertEqual(result.grandTotal, decimal("110.00"))
        XCTAssertEqual(result.personTotals[0].total, decimal("110.00"))
    }

    func testPersonWithNoItems() {
        // Person exists but has no items assigned
        let items = [makeItem(id: "1", label: "Burger", price: decimal("20.00"))]
        let shares = [makeShare(itemId: "1", personId: "p1")]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob") // Bob has no items
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: decimal("2.00"),
            tip: decimal("4.00"),
            discount: .zero,
            serviceFee: .zero,
            taxMode: .proportional,
            tipMode: .proportional
        )

        let alice = result.personTotals.first { $0.personId == "p1" }!
        let bob = result.personTotals.first { $0.personId == "p2" }!

        // Alice gets everything proportionally
        XCTAssertEqual(alice.subtotal, decimal("20.00"))
        XCTAssertEqual(alice.taxShare, decimal("2.00"))
        XCTAssertEqual(alice.tipShare, decimal("4.00"))

        // Bob has nothing
        XCTAssertEqual(bob.subtotal, .zero)
        XCTAssertEqual(bob.taxShare, .zero)
        XCTAssertEqual(bob.tipShare, .zero)
        XCTAssertEqual(bob.total, .zero)
    }

    func testEvenSplitIncludesZeroPeople() {
        // Even split should include people with no items when includeZeroPeople = true
        let items = [makeItem(id: "1", label: "Burger", price: decimal("20.00"))]
        let shares = [makeShare(itemId: "1", personId: "p1")]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: decimal("4.00"),
            tip: decimal("6.00"),
            discount: .zero,
            serviceFee: .zero,
            taxMode: .even,
            tipMode: .even,
            includeZeroPeople: true
        )

        let alice = result.personTotals.first { $0.personId == "p1" }!
        let bob = result.personTotals.first { $0.personId == "p2" }!

        // Tax and tip split evenly between both people
        XCTAssertEqual(alice.taxShare, decimal("2.00"))
        XCTAssertEqual(bob.taxShare, decimal("2.00"))
        XCTAssertEqual(alice.tipShare, decimal("3.00"))
        XCTAssertEqual(bob.tipShare, decimal("3.00"))
    }

    func testEvenSplitExcludesZeroPeople() {
        // Even split should exclude people with no items when includeZeroPeople = false
        let items = [makeItem(id: "1", label: "Burger", price: decimal("20.00"))]
        let shares = [makeShare(itemId: "1", personId: "p1")]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: decimal("4.00"),
            tip: decimal("6.00"),
            discount: .zero,
            serviceFee: .zero,
            taxMode: .even,
            tipMode: .even,
            includeZeroPeople: false
        )

        let alice = result.personTotals.first { $0.personId == "p1" }!
        let bob = result.personTotals.first { $0.personId == "p2" }!

        // Only Alice pays tax and tip (Bob has no items)
        XCTAssertEqual(alice.taxShare, decimal("4.00"))
        XCTAssertEqual(bob.taxShare, .zero)
        XCTAssertEqual(alice.tipShare, decimal("6.00"))
        XCTAssertEqual(bob.tipShare, .zero)
    }

    // MARK: - 6. Real-world Scenarios

    func testRestaurantBillThreePeopleFiveItemsSomeShared() {
        // Restaurant bill: 3 people, 5 items, some shared
        let items = [
            makeItem(id: "1", label: "Steak", price: decimal("32.00")),
            makeItem(id: "2", label: "Salmon", price: decimal("28.00")),
            makeItem(id: "3", label: "Pasta", price: decimal("18.00")),
            makeItem(id: "4", label: "Shared Appetizer", price: decimal("15.00")),
            makeItem(id: "5", label: "Shared Dessert", price: decimal("12.00"))
        ]

        let shares = [
            makeShare(itemId: "1", personId: "p1"), // Alice: Steak
            makeShare(itemId: "2", personId: "p2"), // Bob: Salmon
            makeShare(itemId: "3", personId: "p3"), // Carol: Pasta
            // Shared appetizer - all three
            makeShare(itemId: "4", personId: "p1", weight: decimal("1")),
            makeShare(itemId: "4", personId: "p2", weight: decimal("1")),
            makeShare(itemId: "4", personId: "p3", weight: decimal("1")),
            // Shared dessert - Alice and Bob only
            makeShare(itemId: "5", personId: "p1", weight: decimal("1")),
            makeShare(itemId: "5", personId: "p2", weight: decimal("1"))
        ]

        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob"),
            makePerson(id: "p3", name: "Carol")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: decimal("10.50"),
            tip: decimal("21.00"),
            discount: decimal("5.00"),
            serviceFee: decimal("3.00")
        )

        // Subtotal: 32 + 28 + 18 + 15 + 12 = 105
        // Grand total: 105 - 5 + 3 + 10.50 + 21 = 134.50
        XCTAssertEqual(result.subtotal, decimal("105.00"))
        XCTAssertEqual(result.grandTotal, decimal("134.50"))

        // Verify totals sum to grand total exactly
        let sumOfTotals = result.personTotals.reduce(Decimal.zero) { $0 + $1.total }
        XCTAssertEqual(sumOfTotals, result.grandTotal)

        // Validate using built-in validator
        let validation = BillCalculator.validateBillTotals(result)
        XCTAssertTrue(validation.valid, validation.error ?? "")

        // Verify each person has the expected items
        let alice = result.personTotals.first { $0.personId == "p1" }!
        let bob = result.personTotals.first { $0.personId == "p2" }!
        let carol = result.personTotals.first { $0.personId == "p3" }!

        XCTAssertEqual(alice.items.count, 3) // Steak + appetizer + dessert
        XCTAssertEqual(bob.items.count, 3)   // Salmon + appetizer + dessert
        XCTAssertEqual(carol.items.count, 2) // Pasta + appetizer

        // Alice subtotal: 32 + 5 + 6 = 43
        XCTAssertEqual(alice.subtotal, decimal("43.00"))
        // Bob subtotal: 28 + 5 + 6 = 39
        XCTAssertEqual(bob.subtotal, decimal("39.00"))
        // Carol subtotal: 18 + 5 = 23
        XCTAssertEqual(carol.subtotal, decimal("23.00"))
    }

    func testLargeBillWithManyPeople() {
        // Large bill with 6 people and 10 items
        var items: [Item] = []
        var shares: [ItemShare] = []
        var people: [Person] = []

        // Create 6 people
        for i in 1...6 {
            people.append(makePerson(id: "p\(i)", name: "Person \(i)"))
        }

        // Create 10 items with varying prices
        let prices = ["12.99", "15.50", "8.75", "22.00", "9.99", "18.00", "14.25", "11.50", "19.99", "16.00"]
        for i in 0..<10 {
            items.append(makeItem(id: "\(i)", label: "Item \(i)", price: decimal(prices[i])))
        }

        // Distribute items - some individual, some shared
        shares.append(makeShare(itemId: "0", personId: "p1"))
        shares.append(makeShare(itemId: "1", personId: "p2"))
        shares.append(makeShare(itemId: "2", personId: "p3"))
        shares.append(makeShare(itemId: "3", personId: "p4"))
        shares.append(makeShare(itemId: "4", personId: "p5"))
        shares.append(makeShare(itemId: "5", personId: "p6"))

        // Items 6-9 shared between various people
        shares.append(makeShare(itemId: "6", personId: "p1", weight: decimal("1")))
        shares.append(makeShare(itemId: "6", personId: "p2", weight: decimal("1")))

        shares.append(makeShare(itemId: "7", personId: "p3", weight: decimal("1")))
        shares.append(makeShare(itemId: "7", personId: "p4", weight: decimal("1")))
        shares.append(makeShare(itemId: "7", personId: "p5", weight: decimal("1")))

        shares.append(makeShare(itemId: "8", personId: "p1", weight: decimal("1")))
        shares.append(makeShare(itemId: "8", personId: "p3", weight: decimal("1")))
        shares.append(makeShare(itemId: "8", personId: "p5", weight: decimal("1")))

        // Item 9 shared by everyone
        for i in 1...6 {
            shares.append(makeShare(itemId: "9", personId: "p\(i)", weight: decimal("1")))
        }

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: decimal("14.89"),
            tip: decimal("29.78"),
            discount: decimal("10.00"),
            serviceFee: decimal("5.00")
        )

        // Verify totals sum exactly
        let sumOfTotals = result.personTotals.reduce(Decimal.zero) { $0 + $1.total }
        XCTAssertEqual(sumOfTotals, result.grandTotal)

        // Validate
        let validation = BillCalculator.validateBillTotals(result)
        XCTAssertTrue(validation.valid, validation.error ?? "")
    }

    func testComplexSplitWithAllFeatures() {
        // Complex scenario with all features enabled
        let items = [
            makeItem(id: "1", label: "Main Course", price: decimal("45.00")),
            makeItem(id: "2", label: "Side Dish", price: decimal("12.00")),
            makeItem(id: "3", label: "Drinks", price: decimal("18.00")),
            makeItem(id: "4", label: "Appetizer", price: decimal("25.00"))
        ]

        let shares = [
            // Main course split 3 ways unequally
            makeShare(itemId: "1", personId: "p1", weight: decimal("2")),
            makeShare(itemId: "1", personId: "p2", weight: decimal("1")),
            makeShare(itemId: "1", personId: "p3", weight: decimal("1")),
            // Side dish for p1 only
            makeShare(itemId: "2", personId: "p1"),
            // Drinks split evenly
            makeShare(itemId: "3", personId: "p1", weight: decimal("1")),
            makeShare(itemId: "3", personId: "p2", weight: decimal("1")),
            makeShare(itemId: "3", personId: "p3", weight: decimal("1")),
            // Appetizer for p2 and p3
            makeShare(itemId: "4", personId: "p2", weight: decimal("1")),
            makeShare(itemId: "4", personId: "p3", weight: decimal("1"))
        ]

        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob"),
            makePerson(id: "p3", name: "Carol")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: decimal("9.25"),
            tip: decimal("18.50"),
            discount: decimal("7.50"),
            serviceFee: decimal("4.00"),
            taxMode: .proportional,
            tipMode: .even
        )

        // Verify totals sum exactly
        let sumOfTotals = result.personTotals.reduce(Decimal.zero) { $0 + $1.total }
        XCTAssertEqual(sumOfTotals, result.grandTotal)

        // Validate
        let validation = BillCalculator.validateBillTotals(result)
        XCTAssertTrue(validation.valid, validation.error ?? "")

        // Verify tip is split evenly
        let alice = result.personTotals.first { $0.personId == "p1" }!
        let bob = result.personTotals.first { $0.personId == "p2" }!
        let carol = result.personTotals.first { $0.personId == "p3" }!

        // Tip should be split evenly (some rounding may occur)
        let tipSum = alice.tipShare + bob.tipShare + carol.tipShare
        assertDecimalEqual(tipSum, decimal("18.50"), accuracy: decimal("0.02"))
    }

    // MARK: - 7. Validation Tests

    func testValidateWeightThrowsForZeroWeight() {
        XCTAssertThrowsError(try BillCalculator.validateWeight(.zero)) { error in
            guard case BillCalculatorError.invalidWeight = error else {
                XCTFail("Expected invalidWeight error, got \(error)")
                return
            }
        }
    }

    func testValidateWeightThrowsForNegativeWeight() {
        XCTAssertThrowsError(try BillCalculator.validateWeight(decimal("-1"))) { error in
            guard case BillCalculatorError.invalidWeight = error else {
                XCTFail("Expected invalidWeight error, got \(error)")
                return
            }
        }
    }

    func testValidateWeightPassesForPositiveWeight() {
        XCTAssertNoThrow(try BillCalculator.validateWeight(decimal("0.5")))
        XCTAssertNoThrow(try BillCalculator.validateWeight(decimal("1.0")))
    }

    func testValidateItemWeightsThrowsWhenAllZero() {
        let shares = [
            ItemShare(itemId: "item1", personId: "p1", weight: .zero)
        ]

        XCTAssertThrowsError(
            try BillCalculator.validateItemWeights(
                itemId: "item1",
                shares: shares,
                newWeight: .zero,
                personId: "p2"
            )
        ) { error in
            if case BillCalculatorError.itemNeedsOwner(let itemId) = error {
                XCTAssertEqual(itemId, "item1")
            } else {
                XCTFail("Expected itemNeedsOwner error")
            }
        }
    }

    func testValidateAllItemWeightsThrowsForZeroTotalWeight() {
        let shares = [
            ItemShare(itemId: "item1", personId: "p1", weight: .zero),
            ItemShare(itemId: "item1", personId: "p2", weight: .zero)
        ]

        XCTAssertThrowsError(try BillCalculator.validateAllItemWeights(shares: shares))
    }

    func testFindExistingShare() {
        let shares = [
            ItemShare(itemId: "item1", personId: "p1", weight: decimal("0.5")),
            ItemShare(itemId: "item1", personId: "p2", weight: decimal("0.5")),
            ItemShare(itemId: "item2", personId: "p1", weight: decimal("1.0"))
        ]

        let found = BillCalculator.findExistingShare(shares: shares, itemId: "item1", personId: "p2")
        XCTAssertNotNil(found)
        XCTAssertEqual(found?.weight, decimal("0.5"))

        let notFound = BillCalculator.findExistingShare(shares: shares, itemId: "item2", personId: "p2")
        XCTAssertNil(notFound)
    }

    // MARK: - 8. Helper Method Tests

    func testDeriveAssignedMap() {
        let items = [
            makeItem(id: "1", label: "Burger", price: decimal("10.00")),
            makeItem(id: "2", label: "Fries", price: decimal("5.00"))
        ]
        let shares = [
            makeShare(itemId: "1", personId: "p1"),
            makeShare(itemId: "2", personId: "p1", weight: decimal("0.5")),
            makeShare(itemId: "2", personId: "p2", weight: decimal("0.5"))
        ]

        let assignedMap = BillCalculator.deriveAssignedMap(items: items, shares: shares)

        XCTAssertEqual(assignedMap["p1"]?.count, 2)
        XCTAssertEqual(assignedMap["p2"]?.count, 1)

        // Check share amounts
        let p1Burger = assignedMap["p1"]?.first { $0.itemId == "1" }
        XCTAssertEqual(p1Burger?.shareAmount, decimal("10.00"))

        let p1Fries = assignedMap["p1"]?.first { $0.itemId == "2" }
        XCTAssertEqual(p1Fries?.shareAmount, decimal("2.50"))

        let p2Fries = assignedMap["p2"]?.first { $0.itemId == "2" }
        XCTAssertEqual(p2Fries?.shareAmount, decimal("2.50"))
    }

    func testBuildSharesFromPeopleItems() {
        let items: [(id: String, price: Decimal)] = [
            (id: "1", price: decimal("10.00")),
            (id: "2", price: decimal("5.00")),
            (id: "3", price: decimal("15.00"))
        ]
        let people: [(id: String, items: [String])] = [
            (id: "p1", items: ["1", "2"]),
            (id: "p2", items: ["2", "3"]),
            (id: "p3", items: ["3"])
        ]

        let shares = BillCalculator.buildSharesFromPeopleItems(items: items, people: people)

        // Item 1: only p1 -> weight 1
        let item1Shares = shares.filter { $0.itemId == "1" }
        XCTAssertEqual(item1Shares.count, 1)
        XCTAssertEqual(item1Shares[0].personId, "p1")
        XCTAssertEqual(item1Shares[0].weight, decimal("1"))

        // Item 2: p1 and p2 -> weight 0.5 each
        let item2Shares = shares.filter { $0.itemId == "2" }
        XCTAssertEqual(item2Shares.count, 2)
        for share in item2Shares {
            XCTAssertEqual(share.weight, decimal("0.5"))
        }

        // Item 3: p2 and p3 -> weight 0.5 each
        let item3Shares = shares.filter { $0.itemId == "3" }
        XCTAssertEqual(item3Shares.count, 2)
        for share in item3Shares {
            XCTAssertEqual(share.weight, decimal("0.5"))
        }
    }

    func testValidateBillTotalsValid() {
        let items = [makeItem(id: "1", label: "Item", price: decimal("50.00"))]
        let shares = [makeShare(itemId: "1", personId: "p1")]
        let people = [makePerson(id: "p1", name: "Alice")]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: decimal("5.00"),
            tip: decimal("10.00"),
            discount: .zero,
            serviceFee: .zero
        )

        let validation = BillCalculator.validateBillTotals(result)
        XCTAssertTrue(validation.valid)
        XCTAssertNil(validation.error)
    }

    // MARK: - 9. Decimal Precision Tests

    func testDecimalPrecisionWithRepeatingDecimals() {
        // Test with amounts that create repeating decimals
        let items = [makeItem(id: "1", label: "Item", price: decimal("100.00"))]
        let shares = [
            makeShare(itemId: "1", personId: "p1", weight: decimal("1")),
            makeShare(itemId: "1", personId: "p2", weight: decimal("1")),
            makeShare(itemId: "1", personId: "p3", weight: decimal("1"))
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob"),
            makePerson(id: "p3", name: "Carol")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: decimal("10.00"),
            tip: decimal("20.00"),
            discount: .zero,
            serviceFee: .zero
        )

        // $130 / 3 = $43.333... should reconcile to exactly $130
        let sum = result.personTotals.reduce(Decimal.zero) { $0 + $1.total }
        XCTAssertEqual(sum, decimal("130.00"))
    }

    func testSmallAmountsSplit() {
        // Test with very small amounts
        let items = [makeItem(id: "1", label: "Item", price: decimal("0.03"))]
        let shares = [
            makeShare(itemId: "1", personId: "p1", weight: decimal("1")),
            makeShare(itemId: "1", personId: "p2", weight: decimal("1"))
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: .zero,
            tip: .zero,
            discount: .zero,
            serviceFee: .zero
        )

        let sum = result.personTotals.reduce(Decimal.zero) { $0 + $1.total }
        XCTAssertEqual(sum, decimal("0.03"))
    }

    func testLargeAmounts() {
        // Test with large amounts
        let items = [makeItem(id: "1", label: "Item", price: decimal("9999.99"))]
        let shares = [
            makeShare(itemId: "1", personId: "p1", weight: decimal("1")),
            makeShare(itemId: "1", personId: "p2", weight: decimal("1")),
            makeShare(itemId: "1", personId: "p3", weight: decimal("1"))
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob"),
            makePerson(id: "p3", name: "Carol")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: decimal("800.00"),
            tip: decimal("1500.00"),
            discount: decimal("500.00"),
            serviceFee: decimal("100.00")
        )

        let sum = result.personTotals.reduce(Decimal.zero) { $0 + $1.total }
        XCTAssertEqual(sum, result.grandTotal)

        let validation = BillCalculator.validateBillTotals(result)
        XCTAssertTrue(validation.valid, validation.error ?? "")
    }

    // MARK: - 10. Assigned Items Tests

    func testAssignedItemsContainCorrectData() {
        let items = [
            makeItem(id: "1", label: "Burger", price: decimal("12.00"), emoji: "🍔"),
            makeItem(id: "2", label: "Pizza", price: decimal("18.00"), emoji: "🍕")
        ]
        let shares = [
            makeShare(itemId: "1", personId: "p1"),
            makeShare(itemId: "2", personId: "p1", weight: decimal("0.5")),
            makeShare(itemId: "2", personId: "p2", weight: decimal("0.5"))
        ]
        let people = [
            makePerson(id: "p1", name: "Alice"),
            makePerson(id: "p2", name: "Bob")
        ]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: .zero,
            tip: .zero,
            discount: .zero,
            serviceFee: .zero
        )

        let alice = result.personTotals.first { $0.personId == "p1" }!

        // Alice should have 2 items
        XCTAssertEqual(alice.items.count, 2)

        // Check burger
        let burger = alice.items.first { $0.itemId == "1" }!
        XCTAssertEqual(burger.label, "Burger")
        XCTAssertEqual(burger.emoji, "🍔")
        XCTAssertEqual(burger.price, decimal("12.00"))
        XCTAssertEqual(burger.shareAmount, decimal("12.00"))
        XCTAssertEqual(burger.weight, decimal("1"))

        // Check pizza (half share)
        let pizza = alice.items.first { $0.itemId == "2" }!
        XCTAssertEqual(pizza.label, "Pizza")
        XCTAssertEqual(pizza.emoji, "🍕")
        XCTAssertEqual(pizza.price, decimal("18.00"))
        XCTAssertEqual(pizza.shareAmount, decimal("9.00"))
        XCTAssertEqual(pizza.weight, decimal("0.5"))
    }

    func testDefaultEmojiForItemsWithoutEmoji() {
        let items = [makeItem(id: "1", label: "Item", price: decimal("10.00"))]
        let shares = [makeShare(itemId: "1", personId: "p1")]
        let people = [makePerson(id: "p1", name: "Alice")]

        let result = BillCalculator.computeTotals(
            items: items,
            shares: shares,
            people: people,
            tax: .zero,
            tip: .zero,
            discount: .zero,
            serviceFee: .zero
        )

        let alice = result.personTotals.first { $0.personId == "p1" }!
        XCTAssertEqual(alice.items[0].emoji, "📦") // Default emoji
    }
}

// MARK: - Helper for Decimal accuracy comparison

extension XCTestCase {
    func assertDecimalEqual(
        _ expression1: Decimal,
        _ expression2: Decimal,
        accuracy: Decimal,
        _ message: @autoclosure () -> String = "",
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        let diff = abs(expression1 - expression2)
        XCTAssertTrue(
            diff <= accuracy,
            "assertDecimalEqual failed: \(expression1) is not equal to \(expression2) within accuracy \(accuracy). \(message())",
            file: file,
            line: line
        )
    }
}
