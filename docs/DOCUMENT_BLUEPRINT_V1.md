# Lumora Document Blueprint V1

## 1. Architecture

Lumora separates four independent policy layers:

1. Document Policy
   - Determines which accounting document(s) are created.

2. Stored Value Policy
   - Determines whether a Credit Voucher or Gift Card is created.
   - Determines Gift Card media type, such as paper or plastic card.

3. Output Policy
   - Determines whether each created document is automatically printed.
   - Auto-print behavior is tenant-configurable and must not be hard-coded.

4. Delivery Policy
   - Determines which delivery capabilities are exposed for the tenant/business.
   - Product capabilities may include Print, SMS, WhatsApp and Email.
   - All capabilities may exist in Lumora while tenant configuration determines which relevant buttons are visible.

---

## 2. Accounting Documents

Accounting documents share a common transaction-document structure.

Examples:
- Tax Invoice / Receipt
- Receipt
- Tax Credit Invoice
- Credit Receipt
- Additional country/tenant-specific document types

### Structure

- Business identity
- Business legal details
- Document title and document number displayed together
- Original / Copy indication
- Issue date and time
- Transaction/register/employee metadata where relevant
- Customer details where relevant
- Transaction lines
- Source document reference at RETURN LINE level
- Discounts
- Tax breakdown where applicable
- Totals
- Payments / refunds
- Operational barcode
- Required fiscal/legal information
- Optional tenant-configured footer

### Accounting Document Output Policy

Accounting documents are created automatically when required by Document Policy.

Printing behavior is controlled independently by Output Policy.

Default:
- Tax Invoice / Receipt: autoPrint = false
- Receipt: autoPrint = false
- Tax Credit Invoice: autoPrint = false
- Credit Receipt: autoPrint = false

These are DEFAULT values only.

A tenant/business may configure automatic printing for the relevant accounting document types.

Example:
- Tenant A may keep Tax Invoice / Receipt auto-print disabled.
- Tenant B may configure Tax Invoice / Receipt auto-print enabled.

Document creation and document printing must remain separate concepts.

---

## 3. Returns and Exchanges

A returned line preserves its source-document identity.

The source reference is displayed next to the returned item rather than as a generic transaction-level reference.

### Zero-balance Exchange

The accounting document depends on tenant Document Policy.

Tax Invoice / Receipt model:
- Issue Tax Invoice / Receipt for total 0.

Receipt + consolidated/periodic invoice model:
- Issue Receipt for total 0.

This behavior must remain configurable and must not be universally hard-coded.

---

## 4. Credit Voucher

When a return is refunded using a Credit Voucher, two independent documents/instruments are produced in sequence:

1. Accounting credit document according to Document Policy.
2. Credit Voucher.

The accounting document follows the tenant's configured Output Policy.

Default accounting-document behavior:
- autoPrint = false

The Credit Voucher default behavior:
- autoPrint = true

### Credit Voucher Structure

- Business identity
- Title
- Voucher number
- Issue date/time
- Voucher amount / balance
- Operational redemption barcode
- Expiration where configured
- Conditions where configured
- Optional tenant-configured footer

The Credit Voucher has its own identity, lifecycle and output history.

---

## 5. Gift Card

Loading a Gift Card creates two separate outcomes:

1. Receipt
2. Gift Card stored-value instrument

The receipt for Gift Card loading is without VAT.

The accounting Receipt follows Output Policy.

Default:
- Receipt autoPrint = false

The Gift Card output depends on the tenant's configured media type.

### Paper Gift Card

Default:
- autoPrint = true

Structure:
- Business identity
- Gift Card title
- Card/voucher number
- Issue date/time
- Initial value / balance
- Operational barcode
- Expiration where configured
- Conditions where configured
- Optional tenant-configured footer

### Plastic Gift Card

- Value is loaded onto the physical card.
- No automatic paper Gift Card output is required by default.

Additional Gift Card media types may be introduced later without changing the accounting-document model.

---

## 6. Barcode Principle

Barcode identity is part of the underlying document/stored-value model and not merely a visual element in a print template.

### Accounting Document Barcode

- Identifies the relevant accounting document / transaction.
- Scanning it in Lumora should resolve and open the relevant transaction directly.

### Credit Voucher Barcode

- Identifies the stored-value voucher.
- Used for lookup, validation and redemption.

### Gift Card Barcode

- Identifies the Gift Card.
- Used for balance lookup, loading and redemption.

The same underlying identity may later be rendered in:
- Printed output
- PDF
- Digital document page
- Other supported representations

---

## 7. Original / Copy

Original / Copy lifecycle is controlled by document output events.

Viewing a document on screen does not consume the original printed output.

First actual produced output:
- Original

Subsequent produced outputs:
- Copy

Automatic printing and manual printing must both pass through the same output lifecycle.

Stored-value documents maintain their own output lifecycle independently from their related accounting document.

---

## 8. Output Policy

Output Policy is tenant-configurable.

Example conceptual configuration:

Accounting:
- Tax Invoice / Receipt: autoPrint false by default
- Receipt: autoPrint false by default
- Tax Credit Invoice: autoPrint false by default
- Credit Receipt: autoPrint false by default

Stored Value:
- Credit Voucher: autoPrint true by default
- Paper Gift Card: autoPrint true by default
- Plastic Gift Card: no paper auto-print by default

Defaults provide initial behavior only.

Tenant configuration may override supported document-output behavior.

---

## 9. Delivery

Delivery is independent from document creation and printing.

Potential Lumora capabilities:
- SMS
- WhatsApp
- Email
- Print

All supported capabilities may exist in the product.

Tenant configuration determines which delivery/output buttons are exposed to the operator.

SMS is expected to be a primary digital delivery channel for many tenants.

Delivery implementation follows completion of document structure and stored-value flows.

---

## 10. Rendering Families

### Transaction Document Renderer

Used for accounting transaction documents.

Examples:
- Tax Invoice / Receipt
- Receipt
- Tax Credit Invoice
- Credit Receipt

The core layout is shared.
Document title and relevant fiscal behavior change according to Document Policy.

### Stored Value Renderer

Used for:
- Credit Voucher
- Paper Gift Card

Stored-value instruments have a simpler layout centered around:
- Business identity
- Value/balance
- Instrument identity
- Barcode

They must not be forced into the accounting-document layout.

---

## 11. Multi-Document / Multi-Output Flows

A single business event may produce more than one independent document/instrument.

### Return refunded to Credit Voucher

Sequence:
1. Create accounting credit document.
2. Create Credit Voucher.
3. Apply Output Policy independently to each.

Default:
- Accounting credit document: no automatic print.
- Credit Voucher: automatic print.

### Gift Card Load

Sequence:
1. Create Receipt without VAT.
2. Load/create Gift Card.
3. Apply Output Policy independently.

Default for paper Gift Card:
- Receipt: no automatic print.
- Gift Card: automatic print.

Default for plastic Gift Card:
- Receipt: no automatic print.
- Physical card is loaded; no paper Gift Card output by default.

---

## 12. Implementation Order

1. Accounting Document structure/layout
2. Operational barcode identity
3. Credit Voucher model + renderer
4. Gift Card model + media policy + renderer
5. Tenant-configurable Output Policy
6. Automatic output orchestration
7. Multi-document transaction orchestration
8. Delivery channels
9. Final visual/print polish

---

## 13. Thermal Accounting Document Formats

Accounting documents use one canonical AccountingDocumentData model.

### 80mm - Full Thermal
80mm is the primary full thermal format.

### 57mm - Full Thermal Compact
57mm is a fully supported accounting-document format for small, backup and peak-period terminals.

57mm must preserve the same business/accounting information as 80mm:
- Business identity
- Document title and number
- Original / Copy
- Date/time
- Register / store / transaction metadata
- Customer
- Transaction lines
- Line discounts
- Promotions
- Return-line source document
- Document-level source where semantically valid
- Tax breakdown
- Totals
- Payments / refunds
- Operational barcode
- Required legal/fiscal lines

The difference is layout only:
- Narrower width
- Smaller spacing and typography
- More wrapping / vertical stacking
- More compact metadata
- Narrower barcode rendering

No accounting, discount, promotion, return-source or payment information may be silently removed because the printer is 57mm.

80mm and 57mm render from the same AccountingDocumentData source.