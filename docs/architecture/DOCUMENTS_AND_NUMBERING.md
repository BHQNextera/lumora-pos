# Lumora POS — Documents & Numbering

## Status

Product / Architecture Decision — Locked Foundation

Extends:
Lumora POS Product & UX Baseline 0.1 — Sections 10, 11, 12, 13 and 14.

---

# 1. Transaction Is Not a Document

A Lumora transaction and an accounting document are separate entities.

Example:

An exchange transaction may contain:

- Negative return lines
- Positive new sale lines

The transaction type may be:

exchange

But the accounting result may require:

- A sales document
- A credit document
- Or another configured document flow

Therefore:

Transaction number ≠ Accounting document number

---

# 2. Transaction Types

Current transaction types:

- sale
- return
- exchange

Transaction type describes the commercial operation.

It does not determine the document numbering series by itself.

---

# 3. Document Types

Supported / planned document families include:

- Tax Invoice / Receipt
- Receipt
- Transaction Invoice, where enabled
- Tax Credit / Credit Document
- Credit Receipt where applicable
- Credit Voucher
- Exchange Note
- Gift Card Receipt
- Additional country/business-specific documents

Exact enabled types are controlled by business configuration.

---

# 4. Business Document Policy

Each business configures its accounting document policy.

Examples:

## Sales policy

Option A:

Every taxable sale issues:

Tax Invoice / Receipt

Option B:

Individual sales issue:

Receipt

and the business later creates a centralized tax invoice according to its accounting process.

## Credit policy

The business configuration determines the appropriate credit document workflow.

The system must not hard-code one universal document policy.

---

# 5. Exchange Outcome

An exchange contains both return and sale lines.

Example:

Return:
- ₪100

New sale:
+ ₪160

Net:
+ ₪60

The transaction type is:

exchange

The positive net amount is collected normally.

Accounting documents are produced according to business policy.

Example:

Return:
- ₪200

New sale:
+ ₪150

Net:
- ₪50

The transaction type is still:

exchange

But the customer receives a refund/credit of ₪50 and the relevant credit documentation is produced.

---

# 6. Zero-Balance Exchange

Example:

Return:
- ₪100

New sale:
+ ₪100

Net:
₪0

No payment collection/refund is required.

The commercial transaction and required accounting documentation are still recorded.

---

# 7. Returns Linked to Original Document

A return initiated from a previous transaction must preserve:

- Original transaction ID
- Original transaction number
- Original document ID where applicable
- Original document number where applicable
- Original sale line ID
- Returned quantity
- Remaining returnable quantity
- Actual allocated value paid
- Return reason
- Employee
- Register
- Timestamp

Multiple returns against the same original transaction are allowed.

However:

Total returned quantity per original line must never exceed the original sold quantity.

Example:

Original quantity: 4

First return: 1
Second return: 2

Remaining returnable quantity: 1

---

# 8. Value of Returned Item

A return does not automatically use the current catalogue price.

The return value is based on the actual value allocated to the original sale line.

This includes:

- Original price
- Line discounts
- Distributed document discounts
- Promotion allocation

Example:

A product's catalogue price was ₪100.

After allocated discounts, its actual paid value was ₪82.50.

Return value:

₪82.50

not ₪100.

---

# 9. Return Without Original Document

Businesses may allow returns without an original document.

This is configurable.

Flow:

Return Item
→ Select product
→ Select quantity
→ Reason / required approval
→ Add negative line to cart
→ Continue normal transaction

Such lines must be marked distinctly as:

unlinked_return

and must be identifiable in:

- Audit
- Reports
- Permissions
- Documents

Policy may configure:

- Allow/disallow
- Manager approval
- Maximum amount
- Allowed refund methods
- Required reason
- Allowed product groups
- Allowed time windows

---

# 10. Gift Card

Gift Card issuance and redemption are different accounting events.

## Gift Card issuance

Issuing/loading a Gift Card represents exchange of money for stored value.

Current locked product rule:

- Receipt
- No VAT on issuance

## Gift Card redemption

When Gift Card value is used to purchase goods/services:

- The goods are sold normally
- Tax/VAT follows the purchased items
- Gift Card is treated as payment/stored value

Gift Card issuance must therefore not be modeled as an ordinary taxable product sale.

---

# 11. Document Number Structure

Every physical/logical register owns independent numbering sequences.

Document number structure:

STORE
+
REGISTER
+
DOCUMENT TYPE
+
RUNNING NUMBER

Example:

Store:
01

Register:
02

Document type:
01

Running number:
10000

Result:

01020110000

---

# 12. Recommended Component Lengths

| Component | Recommended length | Example |
|---|---:|---|
| Store | 2–3 digits | 01 |
| Register | 2–3 digits | 02 |
| Document Type | 2 digits | 01 |
| Running Number | 5–9 digits | 10000 |

---

# 13. Independent Numbering Series

There is no single shared numbering series across all registers.

Series key is effectively:

Store
+
Register
+
Document Type

Example:

Store 01 / Register 01 / Tax Invoice Receipt
has its own sequence.

Store 01 / Register 02 / Tax Invoice Receipt
has another sequence.

Store 01 / Register 02 / Credit Document
has another sequence.

---

# 14. Document Type Codes

Document type codes are managed configuration.

Example only:

01 = Tax Invoice / Receipt
02 = Receipt
03 = Credit Document
04 = Exchange Note
05 = Credit Voucher
06 = Gift Card Receipt

The final code table must be explicitly configured and versioned.

Codes must not be inferred from display names.

---

# 15. Sequence Rules

- No rollback of issued numbers
- No reuse of issued numbers
- No deletion of issued document history
- Each register/document type has an independent sequence
- Sequence configuration changes require manager/admin permission
- Every change is recorded in Audit
- Sequence state must survive restart
- Sequence allocation must be safe offline
- Synchronization must never create duplicate document numbers

---

# 16. Offline Numbering

Lumora is standalone/offline-first.

Therefore document issuance cannot depend on a live central counter.

The numbering architecture must guarantee uniqueness while offline.

Supported architectural options include:

- Register-owned sequence
- Preallocated numeric ranges
- Another proven collision-safe mechanism

The chosen production mechanism must preserve the document number structure defined above.

---

# 17. Original and Copy

For relevant accounting documents:

First issuance:

ORIGINAL

Subsequent production:

COPY

The system tracks:

- Document ID
- Document number
- Original issuance timestamp
- Issue/reprint count
- Employee
- Register
- Output channel
- Timestamp for each output

Printing or sending another copy does not create a new accounting document number.

---

# 18. Reissue / Previous Transactions

Previous Transactions must allow authorized users to:

- Search by document number
- Search by transaction number
- Search by date
- Search by amount
- Search by payment method
- Search by employee
- Search by register
- View transaction lines
- View payments
- View documents
- View audit events
- Reprint/send copy
- Produce exchange note
- Start permitted return/credit flow

Transactions and accounting documents are not physically deleted.

---

# 19. Payment Result vs Document Result

Payment and accounting document are different concerns.

A transaction may result in:

Positive net:
→ collect payment

Negative net:
→ refund / credit

Zero net:
→ no monetary settlement

DocumentFactory determines the required document(s) according to:

- Transaction contents
- Net result
- Business document policy
- Tax configuration
- Original document references
- Country configuration

---

# 20. Required Future Components

The implementation should eventually expose:

DocumentPolicy
DocumentType
DocumentTypeCode
DocumentNumber
DocumentSequence
DocumentFactory
DocumentRepository
DocumentOutputEvent

These remain separate from:

Sale
Payment
Return
Exchange

---

# 21. Audit

Every document event must be auditable.

At minimum:

- Created
- Original issued
- Copy produced
- Sent
- Printed
- Voided where legally allowed
- Linked credit created
- Sequence configuration changed

Audit records are immutable.

---

# 22. Source of Truth

This document extends the Product & UX Baseline 0.1.

Where this document contains a later explicitly locked decision, this document represents the current architecture decision.

The Product & UX Baseline remains the product foundation and must not be deleted or silently rewritten.