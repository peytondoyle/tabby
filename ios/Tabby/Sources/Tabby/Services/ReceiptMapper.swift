import Foundation

/// Maps API DTOs to app models
enum ReceiptMapper {

    static func parseAPIDate(_ string: String?) -> Date? {
        guard let string, !string.isEmpty else { return nil }
        if let d = ISO8601DateFormatter().date(from: string) { return d }
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(secondsFromGMT: 0)
        let prefix = String(string.prefix(10))
        return f.date(from: prefix)
    }

    static func bill(from data: BillData) -> Bill {
        let title = data.title ?? data.place ?? "Receipt"
        return Bill(
            id: data.id,
            title: title,
            place: data.place,
            date: parseAPIDate(data.date),
            subtotal: data.subtotal ?? 0,
            tax: data.salesTax ?? 0,
            tip: data.tip ?? 0,
            discount: data.discount ?? 0,
            serviceFee: data.serviceFee ?? 0,
            editorToken: data.editorToken,
            viewerToken: data.viewerToken,
            receiptImagePath: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
    }

    static func billItem(from item: BillItemData, billId: String) -> BillItem {
        let qty = max(Decimal(1), Decimal(item.quantity ?? 1))
        let lineTotal = item.price
        let unitPrice = qty > 0 ? lineTotal / qty : lineTotal
        return BillItem(
            id: item.id,
            billId: billId,
            label: item.label,
            emoji: item.emoji,
            quantity: qty,
            unitPrice: unitPrice
        )
    }

    static func billPerson(from person: PersonData, billId: String) -> BillPerson {
        BillPerson(
            id: person.id,
            billId: billId,
            name: person.name,
            avatarUrl: person.avatarUrl,
            venmoHandle: person.venmoHandle,
            isArchived: false,
            personalCredit: 0,
            creditNote: nil
        )
    }

    static func billShare(from share: ItemShareData) -> BillItemShare {
        BillItemShare(
            itemId: share.itemId,
            personId: share.personId,
            weight: Decimal(share.weight)
        )
    }

    /// Editor token used for mutating API calls
    static func editorTokenForWrites(bill: Bill, sessionToken: String) -> String? {
        if let editor = bill.editorToken, !editor.isEmpty { return editor }
        if sessionToken.hasPrefix("e_") { return sessionToken }
        return nil
    }

    static func mapFetchResponse(_ response: BillResponse, sessionToken: String) -> (
        bill: Bill,
        items: [BillItem],
        people: [BillPerson],
        shares: [BillItemShare],
        isReadOnly: Bool
    )? {
        guard let data = response.billData else {
            return nil
        }
        let bill = bill(from: data)
        let items = response.items.map { billItem(from: $0, billId: bill.id) }
        let people = response.people.map { billPerson(from: $0, billId: bill.id) }
        let shares = response.shares.map { billShare(from: $0) }
        let isViewer = (data.viewerToken == sessionToken) && (data.editorToken != sessionToken)
        return (bill, items, people, shares, isReadOnly: isViewer)
    }

    static func mapCreateResponse(
        _ response: CreateBillResponse,
        scanResult: ScanResult?,
        titleFallback: String
    ) -> (bill: Bill, items: [BillItem]) {
        let r = response.receipt
        let place = r.place ?? scanResult?.place
        let title = r.title ?? place ?? titleFallback
        let subtotal = scanResult?.subtotal ?? response.items.reduce(Decimal.zero) { $0 + $1.price }
        let tax = scanResult?.tax ?? 0
        let tip = scanResult?.tip ?? 0
        let bill = Bill(
            id: r.id,
            title: title,
            place: place,
            date: ReceiptMapper.parseAPIDate(scanResult?.date),
            subtotal: subtotal,
            tax: tax,
            tip: tip,
            discount: 0,
            serviceFee: 0,
            editorToken: r.editorToken ?? r.token,
            viewerToken: r.viewerToken,
            receiptImagePath: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
        let items: [BillItem] = response.items.map { info in
            let qty = max(1, info.quantity ?? 1)
            let qDec = Decimal(qty)
            let unit = qDec > 0 ? info.price / qDec : info.price
            return BillItem(
                id: info.id,
                billId: bill.id,
                label: info.label,
                emoji: info.emoji,
                quantity: qDec,
                unitPrice: unit
            )
        }
        return (bill, items)
    }
}
