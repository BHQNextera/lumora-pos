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
