# Lumora POS — Project Status

## Current checkpoint

Date: 2026-08-11
Branch: main
Current HEAD: b74cd25
Current release: v0.3.0-alpha
Release checkpoint tag: v0.3.0-alpha

## Completed in this checkpoint

### Returns / Refunds

- Return flow from an original transaction/document is operational.
- Return flow without an original document is operational.
- Return quantity can be selected.
- Return price can be changed when returning an item without an original document.
- Returns correctly enter the refund/payment flow instead of silently completing the transaction.
- Small refunds up to the configured threshold can be returned in cash.

### Credit Vouchers

- Credit vouchers can be issued from returns.
- Credit vouchers can be redeemed as a payment method.
- Partial redemption is supported.
- When a partial redemption leaves more than the configured ₪5 threshold, the original voucher is depleted and a replacement voucher is issued for the remaining balance.
- The replacement voucher number and amount are shown to the cashier before transaction completion.
- When the remaining voucher balance is up to ₪5, it is returned as cash instead of issuing another voucher.
- Cash remainder is represented in the transaction/payment data.
- Walk-in customers are displayed correctly in stored-value management.
- Voucher lifecycle and replacement linkage are persisted.

### Sale / Payment completion

- Completed transactions clear the working cart.
- Refund and payment completion flows were stabilized.
- Lumora-native notices are used for the completed refund/voucher flows implemented in this checkpoint.

## Production verification

Verified manually in the deployed production environment:

- Return from original transaction.
- Return without original document.
- Editable return price without original document.
- Credit voucher issuance.
- Credit voucher redemption.
- Partial voucher redemption.
- Replacement voucher issuance when remaining balance is above ₪5.
- Replacement voucher notification with new voucher number and amount.
- Cash refund behavior for balances up to ₪5.
- Completed transaction cart reset.

## Validation

- TypeScript check: PASS
- Vite production build: PASS
- Production deployment: PASS
- Production smoke tests: PASS

## Release

Release: v0.3.0-alpha

Functional implementation checkpoint:
0db0f12 — fix: show rollover voucher notice

Release documentation commits:
45472c8 — docs: add v0.3.0-alpha release notes
b74cd25 — docs: fix v0.3.0-alpha release formatting

## Architecture baseline

- Lumora is an operational POS and must remain standalone-capable.
- Core POS operation must not depend on an internet connection.
- Each terminal must remain capable of operating independently.
- Operational data will move toward local-first persistence.
- Synchronization/replication must occur without making the till dependent on the central system.
- Nextera is the optional central Back Office / management layer for larger or more complex businesses.
- Lumora must also remain usable without Nextera.
- Echo is the payment integration layer and must not become a prerequisite for core POS operation.
- Integration architecture must remain system-agnostic and extensible.

## Current known gaps

- Browser localStorage is still used in areas where a production local database is ultimately required.
- Full offline replication is not yet implemented.
- Multi-register / multi-branch synchronization is not yet implemented.
- Nextera integration is not yet implemented.
- Fiscal/document flows require finalization and full QA.
- Remaining payment methods require completion/integration.
- Inventory transaction commit and synchronization require completion.
- Employees / permissions / shifts require completion.
- Hardware and printing integrations are pending.
- Promotion/coupon regression coverage still requires completion.
- Branch and sales-channel runtime promotion conditions remain incomplete.
- Echo integration remains pending.
- Production-wide UX/responsive/RTL/LTR polish remains pending.

## Exact next milestone

### Lumora ↔ Nextera Integration Foundation

The next development phase starts with an evidence-based audit of both systems before changing code.

The integration foundation must define:

1. Integration boundary between Lumora and Nextera.
2. Tenant / branch / register identity.
3. API and replication contracts.
4. Authentication and authorization between systems.
5. Product/catalog synchronization.
6. Customer synchronization.
7. Inventory synchronization and movement ownership.
8. Completed transaction synchronization.
9. Document synchronization.
10. Idempotency and duplicate protection.
11. Offline outbox / retry behavior.
12. Conflict handling.
13. Sync health/status visibility.
14. Versioning of integration contracts.

Lumora must continue selling while Nextera or the internet is unavailable.

## Remaining roadmap to delivery

### Phase 1 — Lumora ↔ Nextera Integration Foundation
- Audit both repositories.
- Define ownership of master and transactional data.
- Define contracts and identifiers.
- Implement first test-to-test connection.
- Implement safe sync/outbox foundation.
- Verify offline independence.

### Phase 2 — Fiscal / Documents
- Finalize invoice/receipt behavior.
- Finalize credit documents.
- Original vs duplicate rules.
- Link returns/credits to source documents.
- Printing and digital-send flow.
- Complete document numbering rules.
- Full document/payment reconciliation.

### Phase 3 — Payments
- Complete remaining payment methods.
- Validate split payments.
- Echo integration.
- Failure/retry/cancellation behavior.
- Payment reconciliation.

### Phase 4 — Recent Transactions
- Complete transaction search and details.
- Reprint / duplicate documents.
- Return/refund entry points.
- Payment and document visibility.

### Phase 5 — Inventory
- Commit stock movements from sales.
- Commit physical returns according to policy.
- Inventory audit trail.
- Nextera inventory synchronization.
- Conflict/discrepancy handling.

### Phase 6 — Customers / Catalog
- Complete customer/loyalty runtime layer.
- Complete product/catalog management.
- Nextera master-data synchronization.
- Price lists and customer groups.

### Phase 7 — Promotions / Pricing
- Complete branch/channel runtime conditions.
- Complete promotion/coupon return behavior.
- Regression test matrix.
- Finalize promotion administration.
- Price-list synchronization.

### Phase 8 — Employees / Permissions / Shifts
- Employee authentication.
- Roles and permissions.
- Manager approvals.
- Shift lifecycle and cash accountability.

### Phase 9 — Local DB / Offline / Replication
- Replace production-critical browser persistence with local database storage.
- Durable outbox.
- Retry and recovery.
- Multi-register synchronization.
- Multi-branch synchronization.
- Connectivity and replication health indicators.

### Phase 10 — Hardware / Printing
- Receipt/document printers.
- Barcode scanners.
- Cash drawer.
- Payment terminal integration.
- Hardware failure handling.

### Phase 11 — Production Polish
- Consistent Lumora dialogs/modals.
- Responsive/resolution consistency.
- RTL/LTR.
- Hebrew/English/Greek readiness.
- Keyboard/scanner workflow.
- Empty/error/loading states.
- Remove browser-native UI where inappropriate.

### Phase 12 — QA / Release
- End-to-end regression.
- Offline tests.
- Recovery tests.
- Multi-register tests.
- Integration tests.
- Production packaging.
- Stable distributor/customer demo.
- Release documentation and rollback checkpoint.

## Exact next action

Run a consolidated read-only audit of Lumora's existing integration/API/sync/persistence architecture.

Do not modify application code until the audit findings and proposed Lumora ↔ Nextera contract are reviewed.

## Checkpoint — 2026-08-12 — Documents Foundation

### Completed

- Added configurable Document Policy V2.
- Document policy is no longer treated as a universal hard-coded invoice/credit model.
- Current tenant behavior is preserved while the engine supports policy-driven document selection.
- DocumentFactory can now resolve zero, one or multiple required document types.
- Accounting documents are created at transaction completion.
- Document creation is idempotent per transaction/document type.
- Sale completion now exposes the real accounting document number.
- Receipt/document view uses the real SaleDocument instead of a static receipt title.
- Transaction Details document "Open" action now opens the actual document.
- Credit documents created from linked returns can preserve original document ID and number.
- Source document linkage was manually verified on a credit document.
- Current document numbering remains independent by store + register + document type.

### Verified

- TypeScript check: PASS
- Vite production build: PASS
- Normal sale creates current configured sales document.
- Negative return creates current configured credit document.
- Document number is consistent between completion screen and document view.
- Previous Transactions can open the persisted accounting document.
- Linked credit document displays the original document number.

### Remaining Documents Work

1. Exchange document outcomes:
   - positive net
   - negative net
   - zero balance
2. Multi-document transaction behavior where policy requires it.
3. Original / Copy lifecycle.
4. DocumentOutputEvent for print/send/reprint.
5. Reprint and resend from Previous Transactions.
6. Full linked-return reference behavior for multiple source documents.
7. Gift Card issuance accounting flow.
8. Additional configurable/country-specific document types.
9. Final document/payment reconciliation.
10. Production document UI/print polish.

### Exact next action

Implement and verify policy-driven document outcomes for exchange transactions:
positive net, negative net and zero balance.


---

# Checkpoint - 2026-08-12 - Documents / Returns / Output Foundation

## Completed in this checkpoint

### Configurable Document Policy
- Document selection is policy-driven and not universally hard-coded.
- DocumentFactory supports zero, one or multiple document outcomes.
- Accounting document creation is idempotent per transaction/document type.
- Current register numbering remains separated by store + register + document type.

### Sales / Returns / Exchanges
- Normal sale accounting document verified.
- Negative return accounting document verified.
- Positive-net exchange verified.
- Negative-net exchange verified.
- Returned lines now preserve source accounting document identity.
- Source document number is displayed next to the returned line.
- Exchange document no longer shows one misleading generic source document at header level.

### Zero-balance Exchange Policy
Legal/accounting behavior was clarified:

- Tenant using Tax Invoice / Receipt model:
  zero-balance exchange issues Tax Invoice / Receipt for 0.

- Tenant using Receipt + consolidated/periodic invoice model:
  zero-balance exchange issues Receipt for 0.

This remains tenant-configurable Document Policy behavior.

### Original / Copy Lifecycle
- Added DocumentOutputService.
- Screen viewing is recorded separately and does not consume the original print output.
- First produced output is Original.
- Subsequent produced outputs are Copy.
- outputCount is updated.
- Printing from the document screen works.
- Printing from Previous Transactions works.

### Document Blueprint V1
Created:
- docs/DOCUMENT_BLUEPRINT_V1.md

Blueprint separates:
1. Document Policy
2. Stored Value Policy
3. Output Policy
4. Delivery Policy

### Output Policy Decisions
Accounting-document auto-print is tenant-configurable.

Defaults:
- Tax Invoice / Receipt: autoPrint false
- Receipt: autoPrint false
- Tax Credit Invoice: autoPrint false
- Credit Receipt: autoPrint false

These defaults may be overridden per tenant.

### Credit Voucher Flow
Return refunded as Credit Voucher produces two independent outputs:

1. Accounting credit document according to tenant policy.
2. Credit Voucher.

Default output behavior:
- Accounting document: no automatic print.
- Credit Voucher: automatic print.

Credit Voucher requires:
- Business identity
- Voucher number
- Amount/balance
- Barcode for redemption
- Optional expiration/conditions

### Gift Card Flow
Gift Card loading produces:

1. Receipt without VAT.
2. Gift Card stored-value instrument.

Default output:
- Accounting Receipt: no automatic print.
- Paper Gift Card: automatic print.
- Plastic Gift Card: no automatic paper voucher.

Gift Card media type is tenant-configurable.

### Delivery Direction
All delivery capabilities may exist in Lumora.
Tenant configuration determines which relevant buttons are exposed.

Expected priority:
- SMS
- WhatsApp
- Email

Print remains an independent output capability.

No PDF dependency has been committed as a mandatory architectural requirement.

### Accounting Document Layout
Accounting Document Layout V1 was started.

Current renderer now includes:
- Business identity area
- Document title + number together
- Original / Copy
- Transaction metadata
- Customer area
- Transaction lines
- Source document at returned-line level
- Discounts/promotions
- VAT breakdown
- Payments/refunds
- Barcode placeholder/identity area
- Legal information placeholder

The current visual layout is NOT final.

### Browser Investigation
A temporary full-screen dim state was investigated.
No Lumora DOM/CSS overlay was responsible.
Closing and reopening the Chrome window resolved the state.
No code workaround was introduced.

## Important design decision for next session

Do NOT continue polishing the current ReceiptPage as one universal layout.

Accounting documents must support multiple render formats from the same document data model:

- Standard / digital / regular-print renderer
- Thermal 80mm renderer
- Thermal 57mm renderer where required

The information model must remain common.
Only rendering/layout changes by output format.

Thermal output must be compact and operationally usable at POS.

## Exact next action

Define the shared AccountingDocumentData structure and the information anatomy for:

1. Standard renderer
2. Thermal 80mm renderer
3. Thermal 57mm constraints

Then implement renderers from the same canonical document data.

Do not proceed to SMS / WhatsApp / Email delivery until the accounting-document structures are stable.

## Remaining Documents Roadmap

1. Shared AccountingDocumentData model
2. Standard accounting-document renderer
3. Thermal 80mm renderer
4. Thermal 57mm support/constraints
5. Real operational barcode identity + scan lookup
6. Business Profile / fiscal identity fields
7. Credit Voucher model + renderer
8. Gift Card model + paper/plastic media policy
9. Tenant-configurable Output Policy
10. Automatic output orchestration
11. Multi-document transaction orchestration
12. Zero-balance exchange policy implementation
13. SMS delivery
14. WhatsApp delivery
15. Email delivery
16. Secure/digital document access strategy
17. Document/payment reconciliation
18. Fiscal/legal blocks by tenant/country
19. Final visual and print polish
20. Full regression QA

## Verification

- TypeScript/build passed during document work.
- Sale document rendering tested locally.
- Positive and negative exchanges tested locally.
- Line-level source-document reference tested locally.
- Original/Copy print lifecycle tested locally.
- Previous Transactions printing tested locally.

