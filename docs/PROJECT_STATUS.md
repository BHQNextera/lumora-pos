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


---

# Product / Architecture Roadmap Update - 2026-08-14

## Current Foundation Status

Business Operating Profile V1 foundation is now in place.

Implemented foundation includes:

- Calculator operating model
- Retail operating model
- Fashion operating model
- Local / Nextera / Hybrid data ownership model
- Business feature exposure
- Product operating profile
- Active Business Configuration
- Tenant / store / register identity
- Register hardware profile
- Register-specific 80mm / 57mm printer configuration
- Business identity consumed by accounting-document rendering
- Active register consumed by document numbering
- Active register/profile as the single source for printer routing

Verified:

- Business identity can be changed through the active profile and is reflected in accounting documents.
- Branch identity is profile-driven.
- Document numbering uses active store/register configuration.
- Printer configuration no longer owns separate hard-coded register identity.
- Build passes.

## Core Architecture Principle

Lumora uses one shared product core.

Segment-specific behavior is layered on top of that core through Business Operating Profiles and capabilities.

Target model:

Lumora Core
-> Business Operating Profile
-> Segment capabilities
-> Register configuration
-> Local runtime/hardware adapters

Do not create separate independent applications for Fashion, Market/Retail, Calculator or future segments.

## Segment Profiles

### Calculator

Designed for businesses that require a simple calculator-style POS.

Default behavior may include:

- No mandatory catalog
- No mandatory promotions
- Manual amount/description entry
- Returns/exchanges where enabled
- Stored value where enabled
- Payment/document capabilities remain available

### Retail / Market

Supports:

- Product catalog
- Barcode
- Categories
- Pricing
- Promotions
- Coupons
- Customer club where enabled
- Inventory
- Mixed catalog/calculator operation where configured

### Fashion

Supports variant-based products.

Required product hierarchy:

Style / Model
-> Color
-> Size
-> Variant

Each variant may have:

- SKU
- Barcode
- Price
- Inventory
- Exact return/exchange identity

Fashion must remain part of the same Lumora core.

## Data Ownership

Each relevant domain may be configured independently as:

- local
- nextera
- hybrid

Domains include at minimum:

- Products
- Customers
- Inventory
- Promotions
- Pricing
- Configuration

Lumora must remain standalone and offline-capable when Nextera is unavailable.

## Runtime / Platform Targets

Lumora must become an installed POS application and must not depend on a browser-only runtime.

Priority:

P1:
- Windows
- Android

P2:
- Linux

Future option:
- iOS

Android is P1 because many kiosk/POS terminals are Android-based.

The same business/domain core must be preserved across platforms.

Platform-specific concerns must be isolated behind adapters.

Required runtime foundation includes:

- Local database
- Offline-first persistence
- Installation/setup
- Register identity
- Printer adapter
- Barcode/scanner adapter
- Payment-terminal adapter
- Local file/configuration access
- Auto-start / kiosk mode where relevant
- Crash/recovery behavior
- Update mechanism

## Local GUI / Register Configuration

Lumora must support local register layout configuration without requiring a back office.

Examples:

- Presets
- Quick buttons
- Images
- Category placement
- Register-specific layout
- Segment-specific layout

GUI configuration should be persisted per register.

Initial persistence concept:

- JSON-based register GUI profile
- current generation
- previous generation 1
- previous generation 2

Three generations are retained for rollback/recovery.

When Nextera is connected, GUI/configuration may be replicated or distributed centrally.

The local register copy remains operational if Nextera is unavailable.

## Reporting Engine

Reporting must be treated as a reusable engine rather than a collection of hard-coded screens.

Conceptual flow:

Report Definition
-> Data
-> Renderer
-> Output

Initial target:

- 3-4 built-in operational reports

Supported output families should include:

- 57mm thermal
- 80mm thermal
- A4
- PDF

Long report lines may wrap on narrow thermal formats.

Delivery/output targets may include:

- Local printer
- PDF
- Email
- WhatsApp

Future capability:

- Configurable/custom report builder
- AI-assisted on-the-spot report generation based on business requirements

Custom/AI report generation is not a pilot blocker.

## Local Printing / Output Service

Printing is a platform service and is not limited to accounting documents.

It must eventually support:

- Accounting documents
- Stored-value documents
- Reports
- Shelf signage
- Window signage
- Counter signage
- Barcode labels

Target formats include:

- 57mm thermal
- 80mm thermal
- A5
- A4
- PDF

A4/A5 printing may use a locally installed OS printer driver.

## Signage

Planned capabilities:

- Shelf signage from local printer
- Front-window signage on A4
- Counter signage on A5

Signage should consume product/pricing data rather than duplicate it.

## Barcode Labels

Initial implementation direction:

- Generate barcode labels to PDF

Later:

- Dedicated barcode-label printer integration through a printer adapter

Label templates may differ by segment.

## Payments / Echo

Lumora must support both:

- Physical/local payment
- Remote payment/link payment

Echo is the planned Coeuria integration for remote payment/payment-link flows.

Payment integration must remain behind an adapter/service boundary and must not be embedded directly into sale UI/domain logic.

## External Accounting / Fiscal Integration

A future adapter is required for external accounting/document systems such as Green Invoice / ׳—׳©׳‘׳•׳ ׳™׳× ׳™׳¨׳•׳§׳”.

Potential delivery channels include:

- SMS
- WhatsApp

Important unresolved architecture decision:

Determine whether Lumora remains the fiscal document producer and synchronizes/delivers through the external provider, or whether the external provider becomes the legal/fiscal document issuer.

Do not implement the integration before this responsibility boundary is explicitly defined.

## Tax Authority Export

Lumora requires support for the relevant unified export file for Israeli tax/accounting requirements.

Exact legal/file specification must be validated before implementation.

This belongs to the fiscal/export layer, not transaction UI.

## Price Checker / Scale Server Integration

Create an integration foundation for external retail devices/services including:

- Price checkers
- Scale servers

These integrations must use adapters/protocol services so the Lumora core does not depend on vendor-specific implementations.

## Nextera Integration

Nextera remains an optional central back-office/management layer.

Potential replicated domains include:

- Products
- Customers
- Inventory
- Pricing
- Promotions
- Business configuration
- Register configuration
- GUI profiles/presets

Lumora remains local-first/offline-first.

Nextera loss of connectivity must not prevent core POS operation.

Replication/conflict behavior must be defined per domain.

## Inventory Count Companion App

A mobile inventory-count application is planned.

Goal:

- Run from a mobile phone
- Scan/count inventory
- Submit count sessions
- Transmit results to Lumora and/or Nextera

This is a companion application and requires separate product/technical specification.

Do not embed the entire inventory-count application into SalePage.

## Online Order Intake Companion Flow

A separate order-intake capability is planned for internet orders.

Targets may include:

- POS
- Mobile phone

The flow requires separate specification for:

- Order receipt
- Acknowledgement
- Status
- Preparation
- Cancellation
- Handoff to sale/fulfillment

Do not treat an incoming online order as a normal Sale object without an explicit order lifecycle.

## Help / Self-Service

Lumora should provide contextual self-service help to reduce support volume.

Planned capabilities:

- Help access from most relevant screens
- Short written guidance
- PDF user guide
- Short training videos

Help content should be context-aware where practical.

## Complete Remaining Roadmap

### Phase 1 - Business Operating Profile V1 - CURRENT

Complete:

- Core profile model
- Calculator / Retail / Fashion profile definitions
- Active Business Configuration
- Business identity foundation
- Store/register identity foundation
- Register printer ownership foundation

Remaining:

- Consume active capabilities in application navigation
- Consume active capabilities in SalePage
- Remove remaining relevant global/hard-coded capability decisions
- Validate Calculator / Retail / Fashion exposure
- Prepare configuration persistence boundary for future installer/Nextera provisioning

### Phase 2 - Runtime Foundation

- Shared runtime abstraction
- Windows runtime P1
- Android runtime P1
- Linux runtime P2
- Local database
- Offline persistence
- Installer/setup flow
- Register provisioning
- Hardware adapter contracts
- Printer/scanner integration
- Startup/recovery/update foundation

### Phase 3 - Segment Product Models

- Calculator transaction experience
- Retail product model
- Fashion Style / Color / Size variants
- SKU/barcode per variant
- Variant inventory
- Exact variant returns/exchanges
- Promotion compatibility

### Phase 4 - Local Configuration / GUI Profiles

- Local presets
- Images
- Quick-button layout
- Per-register GUI profile
- Three-generation JSON history
- Local rollback
- Optional Nextera distribution/replication

### Phase 5 - Fiscal / Document / Output Foundation

- Business fiscal profile
- Accounting document policy
- 57mm / 80mm output
- A4/PDF output
- Output policy
- Original/Copy lifecycle
- Local print service

### Phase 6 - Reporting Engine

- 3-4 built-in reports
- Report definitions
- 57mm/80mm rendering
- A4 rendering
- PDF
- Email/WhatsApp delivery hooks
- Custom/AI report generation later

### Phase 7 - Stored Value

- Credit Voucher
- Gift Card
- Media policy
- Barcodes
- Output lifecycle
- Loading/redemption flows

### Phase 8 - Payments

- Physical terminal abstraction
- Echo remote-payment/payment-link integration
- Payment adapter boundary

### Phase 9 - External Integrations / Fiscal Export

- Green Invoice / external accounting adapter after responsibility decision
- Israeli unified tax/accounting export
- Price checker integration foundation
- Scale server integration foundation

### Phase 10 - Signage / Labels

- Shelf signage
- A4 window signage
- A5 counter signage
- Barcode-label PDF
- Dedicated label printer adapter later

### Phase 11 - Nextera Replication

- Product/master data
- Inventory
- Customers
- Pricing
- Promotions
- Business/register configuration
- GUI profiles
- Offline queue
- Conflict strategy
- Recovery/reconciliation

### Phase 12 - Companion Applications

Separate specifications and delivery tracks for:

- Mobile Inventory Count
- Online Order Intake

### Phase 13 - Help / Training

- Contextual screen help
- Written guide
- PDF manual
- Training videos

### Phase 14 - Hardware / Fiscal QA and Pilot

Validate on target hardware:

- Windows POS
- Android kiosk/POS
- Linux where required
- 80mm printer
- 57mm printer
- Scanner
- Payment terminal
- Local A4 printer where required

Validate end-to-end:

Sale
-> Payment
-> Accounting document
-> Output
-> Barcode lookup
-> Return / Exchange
-> Refund / Credit
-> Persistence
-> Restart/recovery
-> Offline operation

Pilot scope remains intentionally smaller than the complete roadmap.

## Pilot Principle

Do not delay the first pilot until every future Lumora capability is complete.

Pilot must prove the stable POS core and the selected pilot business profile.

Features such as AI custom reports, dedicated label-printer support, companion applications and every external integration may follow the initial pilot unless required by the selected pilot customer.

## Exact Next Action

Continue Business Operating Profile V1.

Next implementation target:

Connect active Business Operating Profile capabilities to application navigation and SalePage so Calculator / Retail / Fashion begin to produce visibly different operator experiences.

Do not begin Nextera replication, Echo integration, reporting, companion apps or external accounting integration before completing this profile-driven application foundation.

---

# Checkpoint — 2026-08-16

## Completed in this checkpoint

### Register / attendance lifecycle
- Product / Fashion variant transaction identity connected.
- Variant identity preserved through cart, transactions and linked returns.
- Seller foundation created with Shay and Kobi test employees.
- Seller assignment supported per sale line.
- Current seller persists for following items until changed.
- Seller can be changed before transaction completion.
- Linked-document returns inherit the original seller.
- Attendance foundation connected.
- Attendance panel available inside the POS.
- Available sellers derive from employees currently in attendance.
- Register access and attendance are separated:
  opening / entering the register does not automatically make the employee an available seller.
- Seller requirement enforcement connected:
  a sale item cannot enter the cart without a seller when seller assignment is required.
- Register Gate connected.
- Existing open shift detection connected.
- Refresh / return to login does not create a second opening declaration.
- Register shift persistence currently uses localStorage.
- Transactions are bound to the active shift using shiftId.

### Cash declarations
- Cash Declaration domain model completed.
- ILS denomination foundation completed.
- Opening declaration uses denomination-based counting.
- Closing declaration uses denomination-based counting.
- Opening and closing declaration snapshots preserved with the shift.
- Expected cash calculation connected.
- Declared closing cash and cash variance preserved.

### X Report
- X Report viewer connected.
- X Report uses transactions belonging to the active shift.
- Sales, returns, exchanges, discounts and payment totals included.
- Thermal preview connected.
- 57/58 mm profile verified.
- 80/88 mm profile foundation available.

### Z Report
- Immutable ShiftZReport snapshot model created.
- Z numbering created.
- Z snapshot repository created.
- Z generated from successfully closed shift data.
- Z preserves:
  register,
  shift,
  opening / closing employee,
  timestamps,
  transaction counts,
  sales,
  returns,
  exchanges,
  discounts,
  payment totals,
  cash payments,
  opening declaration,
  closing declaration,
  expected cash,
  cash variance.
- Historical Z repository connected.
- Z history viewer connected to Reports.
- Historical Z viewing / reprint flow connected.
- Z is shown on screen after closing before returning to register opening.
- Thermal Z preview connected.
- 57/58 mm thermal layout verified.
- 80/88 mm profile foundation available.

### Thermal print foundation
- Shared ThermalPrintDocument model created.
- Shared ThermalPrintProfile created.
- Thermal renderer created.
- 57/58 mm layout profile created.
- 80/88 mm layout profile created.
- X and Z use the shared thermal renderer.
- Browser print preview is the current test mechanism.
- Physical printer integration intentionally deferred until test hardware exists.
- Future hardware adapter must support ESC/POS or equivalent printer transport without changing report domain models.

### Cash drawer foundation
- CashDrawer domain model created.
- CashDrawerAdapter contract created.
- SimulatedCashDrawerAdapter created.
- Drawer commands persist for test verification.
- Drawer opening is independent from receipt printing.
- Cash payment triggers drawer-open command immediately.
- Split payment with cash triggers drawer-open command at the cash step, before transaction completion.
- Cash change notification connected.
- Closing register triggers drawer-open command before closing cash declaration.
- Manual drawer-open button connected.
- Current adapter status is simulated until physical printer / drawer hardware is available.
- Future hardware adapter must support a drawer pulse through the printer without requiring a print job.

### Pricing / React stability
- Removed SalePage state updates from inside PricingProvider cart state updater callbacks.
- Removed pricing-rule mutation from inside cart state updater.
- React warning:
  "Cannot update a component (SalePage) while rendering a different component (PricingProvider)"
  is resolved.
- Runtime test after hard refresh is clean.
- Typecheck and production build are green.

## External blockers

### Credit transmission / SHVA
- Deferred until a real test terminal or real provider sandbox/API is available.
- Do not create fake credit transmission data that may not match the eventual terminal integration.
- Credit transmission report remains:
  BLOCKED — TEST TERMINAL / REAL INTEGRATION REQUIRED.

### Physical printing
- Thermal rendering foundation is complete.
- Physical printer transport, ESC/POS, cutter and physical paper calibration are deferred until hardware is available.

## Remaining roadmap

### 1. Register operations completion
- Cash in / cash out operational movements.
- Controlled non-sale drawer operations and reasons.
- Include cash movements in expected cash calculation.
- Register operational audit history.
- Manager authorization rules where required.

### 2. Reports
- Complete seller report using net sales.
- Returns linked to source transaction reduce original seller sales.
- Multi-seller transaction reporting.
- Date / time / register / employee / payment filters.
- Current day remains default reporting period.
- Continue report foundation without final visual polish.

### 3. Attendance security
- Employee PIN / badge authentication.
- Prevent buddy punching.
- Manager override.
- Attendance audit history.
- Controlled retrospective corrections.

### 4. Business policy configuration
- Seller required per transaction / line.
- Customer required according to tenant policy.
- Document policies.
- Delivery channel priorities.
- Register and employee policies.
- Cash drawer and cash movement policies.

### 5. Payment / credit hardware integration
- Test terminal integration.
- Real credit payment flow.
- Split payment with real terminal.
- Cancel / retry / failure handling.
- Credit transmission snapshot and report.
- SHVA / provider-specific requirements only after real integration is available.

### 6. Physical printer / drawer integration
- Printer transport adapter.
- ESC/POS or vendor adapter.
- X physical printing.
- Z physical printing.
- Historical reprint.
- Drawer pulse without print job.
- Cutter support.
- 58 / 80 mm physical calibration.

### 7. Operational QA
- Sale.
- Seller enforcement.
- Discounts and promotions.
- Returns.
- Exchanges.
- Fashion variants.
- Stored value.
- Customers.
- Register lifecycle.
- Attendance.
- Cash declarations.
- X / Z.
- Cash drawer.
- Split payments.
- Printing preview.

### 8. Integrations
- Echo payment integration.
- Optional Nextera back-office integration.
- Generic API / replication layer.
- Preserve Lumora standalone and offline operation.

### 9. Offline / replication
- Durable local persistence.
- Queue and retry.
- Synchronization.
- Conflict handling.
- Connectivity status.

### 10. UI / design
- Unified Lumora visual cleanup after functional flows stabilize.
- RTL / LTR.
- Hebrew / English completion.
- Greek readiness.
- Final visual structure intentionally deferred until functional flows are stable.

### 11. Release
- Full regression.
- Console / runtime error pass.
- Build optimization.
- Demo environment.
- Release candidate.

## Exact next action

Complete the current checkpoint and push it.

After the checkpoint is preserved, continue with Cash Movement V1:
cash in / cash out events during an active register shift, including amount, reason, employee, timestamp and effect on expected cash.

Do not resume credit transmission or physical printer integration until real test hardware or a real provider sandbox is available.
---

# Follow-up Checkpoint — 2026-08-16 — Cash Movement V1

## Completed in this checkpoint

### Cash Movement domain
- CashMovement domain model created.
- Cash movement types:
  - cash_in
  - cash_out
- Movement records preserve:
  - tenant
  - store
  - register
  - shiftId
  - type
  - amount
  - reason
  - optional note
  - employee identity
  - timestamp
- CashMovementRepository created using current local persistence.
- Cash movements remain separate immutable operational events rather than being silently merged into RegisterShift.

### Cash Movement operator flow
- Cash Movement dialog created.
- Supported operator actions:
  - deposit cash into register
  - withdraw cash from register
- Amount validation connected.
- Reason selection connected.
- Optional note connected.
- Employee performing the operation is selected only from employees currently in attendance.
- Zero employees present blocks the operation.
- One employee present is selected automatically.
- Multiple employees require explicit selection.
- Drawer-open command is triggered for the physical cash operation.
- Sidebar action "הפקדה / משיכה" connected for active register shifts.

### Expected cash calculation
- Shift cash calculation now uses:

  opening cash
  + cash payments
  + cash in
  - cash out
  = expected cash

- ShiftXReport now exposes:
  - cashIn
  - cashOut
  - netCashMovement
  - expectedCash
- Runtime verified:
  opening cash 200
  + deposits 100
  - withdrawals 30
  = expected cash 270.

### X Report
- X screen displays:
  - cash receipts
  - deposits
  - withdrawals
  - net cash movement
  - expected cash
- Shared thermal X document displays the same values.
- Runtime verification passed.

### Z Report
- ShiftZReport immutable snapshot extended with:
  - cashIn
  - cashOut
  - netCashMovement
- Z repository copies these values into the snapshot at shift close.
- Historical Z therefore does not depend on recalculating current cash movement data.
- Z screen and thermal output display the movement totals.
- Runtime verification passed:
  - opening declaration: 200
  - cash receipts: 0
  - deposits: 100
  - withdrawals: 30
  - net movement: 70
  - expected cash: 270
  - closing declaration: 200
  - cash variance: -70

### QA note
- Negative monetary values are mathematically correct.
- RTL rendering of negative currency currently needs visual cleanup so values render consistently as e.g. -₪70.00 rather than visually reordered punctuation.
- This is a presentation issue, not a calculation issue.

## Current external blockers

### Credit / SHVA
BLOCKED — real test terminal or provider sandbox/API required.

### Physical printer / drawer
DOMAIN + SIMULATION READY.
Physical ESC/POS / vendor adapter, cutter and drawer pulse require real hardware for final verification.

## Remaining roadmap from current state

### 1. Register operational audit
- Cash movement history viewer.
- Show individual deposit / withdrawal events.
- Preserve employee, reason, amount, note and timestamp.
- Register / shift filtering.
- Manager authorization policy for sensitive movements.
- Controlled manual drawer-open audit policy.

### 2. Reports
- Complete seller report using net sales.
- Returns linked to source transaction reduce original seller sales.
- Multi-seller transaction reporting.
- Date / time / register / employee / payment filters.
- Current day remains default reporting period.

### 3. Attendance security
- Employee PIN / badge authentication.
- Prevent buddy punching.
- Manager override.
- Attendance audit history.
- Controlled retrospective corrections.

### 4. Business policy configuration
- Seller required per transaction / line.
- Customer requirement policy.
- Cash movement permissions.
- Manual drawer-open permissions.
- Document policies.
- Delivery-channel priorities.
- Register and employee policies.

### 5. Payment hardware integration
- Real credit terminal integration.
- Real credit payment flow.
- Split payment with real terminal.
- Cancel / retry / failure handling.
- Credit transmission snapshot/report.
- Provider / SHVA requirements after integration is available.

### 6. Physical printer / drawer integration
- Printer transport adapter.
- ESC/POS or vendor adapter.
- Physical X printing.
- Physical Z printing.
- Historical reprint.
- Drawer pulse without print job.
- Cutter support.
- 58 / 80 mm physical calibration.

### 7. Operational QA
- Sale.
- Seller enforcement.
- Discounts and promotions.
- Returns.
- Exchanges.
- Fashion variants.
- Stored value.
- Customers.
- Register lifecycle.
- Attendance.
- Cash declarations.
- Cash movements.
- X / Z.
- Cash drawer.
- Split payments.
- Printing preview.

### 8. Integrations
- Echo payment integration.
- Optional Nextera back-office integration.
- Generic API / replication layer.
- Preserve Lumora standalone / offline operation.

### 9. Offline / replication
- Durable local persistence.
- Queue and retry.
- Synchronization.
- Conflict handling.
- Connectivity status.

### 10. UI / design
- Unified visual cleanup after functional flows stabilize.
- RTL / LTR.
- Negative currency RTL formatting.
- Hebrew / English completion.
- Greek readiness.

### 11. Release
- Full regression.
- Console/runtime error pass.
- Build optimization.
- Demo environment.
- Release candidate.

## Exact next action

After this checkpoint is pushed, build Cash Movement History V1:
a register operational audit view showing every deposit and withdrawal with amount, reason, employee, note and timestamp.

Do not resume SHVA or physical printer integration until real test hardware or a real provider sandbox is available.
---

# Checkpoint — 2026-08-17 — Runtime Storage + Customer Policy Foundation

## Completed in this checkpoint

### Runtime Storage Boundary V1
- Added RuntimeStorage abstraction.
- Added BrowserLocalStorageAdapter as temporary development adapter.
- Added RuntimeStorageService with replaceable active storage adapter.
- Runtime/domain repositories can now migrate away from direct browser localStorage access.
- Boundary is asynchronous to support future SQLite / installed runtimes.

### Startup Hydration V1
- Added RuntimeBootstrap hydration registry.
- Lumora now completes registered runtime hydration before rendering the POS UI.
- Startup failures are caught before the operational POS is rendered.
- Added explicit runtime hydrator registration.

### Transaction runtime migration
- TransactionRepository migrated from direct localStorage access to RuntimeStorage.
- Added synchronous in-memory transaction cache.
- Added asynchronous startup hydration.
- Added serialized persistence queue.
- Added persistence flush capability for future durable-completion boundaries.
- Existing synchronous transaction API preserved for current POS flows.
- Runtime verification passed:
  - existing transactions survive hard refresh.
  - newly completed transactions survive hard refresh.

### Register shift runtime migration
- RegisterShiftRepository migrated to RuntimeStorage.
- Added synchronous shift cache.
- Added startup hydration.
- Added serialized persistence queue.
- Added persistence flush capability.
- Existing synchronous register lifecycle API preserved.
- Runtime verification passed:
  - open register shift survives hard refresh.
  - Lumora does not incorrectly request a second opening declaration after restart.
  - closing shift remains compatible with existing Z flow.

### Customer runtime migration
- CustomerRepository migrated to RuntimeStorage.
- Added synchronous customer cache.
- Added startup hydration.
- Added serialized persistence queue.
- Existing customer API preserved.
- Customer edits / new customer data survive hard refresh.

### Customer Policy V1
- Added dedicated CustomerPolicy to BusinessOperatingProfile.
- Policy is separate from feature/capability flags.
- Current policy options:
  - requireCustomerId
  - requireCustomerBirthDate
  - uniqueActivePhone
  - uniqueActiveCustomerId
- Defaults:
  - customer ID required: true
  - birth date required: false
  - active phone unique: true
  - active customer ID unique: true
- Customer Policy connected to Calculator / Retail / Fashion profiles.

### Customer validation
- Added Israel-first phone normalization and validation.
- Israeli +972 phone representation is normalized to local format.
- Added Israeli ID normalization and checksum validation.
- Active customer duplicate-ID protection added.
- Active customer duplicate-phone protection added.
- Validation is policy-driven rather than universally hard-coded.
- Walk-in customer remains a system customer and is exempt from normal customer-master requirements.

### Customer birth date
- Added birthDate to Customer model.
- Added birth-date validation.
- Future dates are rejected.
- Birth-date requirement is controlled by CustomerPolicy.
- Customer management form supports entering/editing birth date.
- Foundation is ready for future birthday-benefit / loyalty functionality.

## Runtime architecture direction

Target runtime sequence:

Lumora Domain
-> Runtime Storage Boundary
-> Runtime Hydration / Cache
-> Platform Storage Adapter
-> SQLite

Production direction:
- Windows installed runtime first.
- Android remains P1 after Windows foundation.
- Same business/domain core across platforms.
- Platform concerns remain behind adapters.

## Important remaining production issue

BrowserLocalStorageAdapter is still the active adapter.

The new architecture provides the migration boundary, but production-critical persistence is not complete until SQLite becomes the active installed-runtime persistence implementation.

Do not interpret the current RuntimeStorage migration as production database completion.

## Go-Live blockers from current state

1. SQLite / durable local database.
2. Installed Windows runtime.
3. Unprovisioned first-run state.
4. Clean tenant/store/register provisioning.
5. Customer onboarding / business setup flow.
6. Startup/restart/crash recovery verification against SQLite.
7. Remaining end-to-end operational QA.
8. Release packaging.

## Deferred / post-pilot items

- Cash Movement History UI.
- Advanced customer CRM.
- Birthday campaign engine.
- Advanced customer segmentation.
- Nextera synchronization.
- Android runtime implementation.
- Advanced audit/report enhancements unless they become pilot blockers.

## Exact next action

Begin SQLite Runtime Foundation V1.

First:
- select/install the Windows runtime shell and SQLite adapter,
- preserve RuntimeStorage as the application boundary,
- create the first real SQLite-backed adapter,
- migrate transactions through the new adapter without changing transaction-domain APIs.

Do not migrate every repository at once.
Prove SQLite durability with transactions first, then expand domain-by-domain.

# Checkpoint — 2026-08-17 — Windows Runtime + SQLite Transactions V1

## Completed in this checkpoint

### Tauri Windows Runtime
- Tauri V2 foundation connected to Lumora.
- Windows desktop runtime smoke test passed.
- Lumora launches as an independent Windows application window.
- Existing POS UI loads successfully inside the Tauri runtime.
- Rust/Cargo environment verified and available for Tauri development.

### SQLite Runtime Foundation
- Installed @tauri-apps/plugin-sql.
- Installed Rust tauri-plugin-sql dependency.
- Enabled SQLite feature only.
- Added required SQL execute capability for the desktop runtime.
- Added SQLiteRuntimeStorageAdapter implementing the existing RuntimeStorage contract.
- SQLite database:
  - sqlite:lumora.db
- Runtime storage table created automatically:
  - runtime_storage
  - storage_key
  - value
  - updated_at

### Transactions SQLite Migration
- Transactions are the first domain migrated to production-style local SQLite persistence.
- Existing synchronous TransactionRepository API remains unchanged.
- Existing in-memory transaction cache remains unchanged.
- Existing serialized persistence queue remains unchanged.
- Browser runtime continues using BrowserLocalStorageAdapter.
- Tauri Windows runtime uses SQLiteRuntimeStorageAdapter for Transactions only.
- Customers and Register Shifts have intentionally NOT been migrated yet.
- No broad repository migration was performed.

### Runtime verification
PASS:
- TypeScript build.
- Vite production build.
- Tauri Windows boot with SQLite plugin.
- New transaction created successfully inside Windows runtime.
- Transaction visible immediately after completion.
- Lumora closed completely.
- Tauri runtime restarted.
- Transaction remained available after full application restart.

Result:

TRANSACTIONS SQLITE RESTART GREEN

This proves the first real durable local SQLite persistence path in Lumora.

## Important scope decisions

- Do not migrate every repository to SQLite at once.
- Continue domain-by-domain.
- Cash Movement History is deferred to post-Go-Live enhancements and is NOT a Pilot blocker.
- Nextera and Echo remain outside the standalone Pilot dependency chain.
- Physical printer / drawer certification and live credit integration remain hardware/provider dependent.
- No new feature expansion during Go-Live hardening unless a real Pilot blocker is identified.

## Current Go-Live position

Lumora is beyond prototype.

Working core includes:
- Sale flow
- Seller
- Fashion variants
- Discounts / promotions foundation
- Returns / exchanges
- Cash and split payments
- Register / shift
- Attendance
- Opening and closing cash declarations
- X / Z
- Cash drawer foundation
- Cash movements
- Accounting document foundation
- Thermal preview
- Runtime hydration
- Windows Tauri runtime
- First SQLite-backed production persistence path

## Pilot Definition of Done

Controlled standalone Pilot Release:

Open day
-> real sale
-> cash / split
-> return / exchange
-> cash movement
-> X
-> close register
-> Z
-> restart / reopen

Required:
- operational data survives restart,
- trading-day state is not lost,
- no active runtime/console blocker,
- standalone operation does not depend on Nextera or Echo.

## Remaining Go-Live blockers / roadmap

### 1. Expand durable local persistence
CURRENT NEXT AREA

- Register Shift -> SQLite
- Customers -> SQLite
- Identify other Pilot-critical operational repositories still using browser persistence.
- Migrate only Pilot-critical state.
- Preserve existing domain APIs.

### 2. Restart / recovery verification
- Open shift survives complete application restart.
- Active trading-day state survives restart.
- Cash declarations survive restart.
- Customer state survives restart.
- Completed sales remain durable.
- Z / closed-shift history remains durable.
- No duplicate initialization after restart.
- Verify controlled recovery from interrupted startup/write where practical.

### 3. First-run / provisioning
- Clean tenant identity.
- Store identity.
- Register identity.
- Controlled predefined Pilot business profile.
- Defined first-run state.
- Reset / recovery path for Pilot environment.

### 4. Core operational QA
Full end-to-end regression:

Sale
-> Payment
-> Return / Exchange
-> Cash Movement
-> X
-> Register Close
-> Z
-> Restart
-> Reopen

Also verify:
- variants,
- discounts / promotions recalculation,
- document numbering,
- document policies,
- seller assignment,
- customer optional/required policy,
- cash calculations.

### 5. UI / RTL cleanup
Blocker-level cleanup only:
- negative currency RTL rendering,
- dialog consistency,
- critical layout defects,
- Hebrew regression.

Do not perform broad visual redesign before Pilot.

### 6. Release hardening
- Clean active console/runtime errors.
- TypeScript PASS.
- Production build PASS.
- Tauri production build.
- Controlled Pilot seed/configuration.
- Recovery/reset procedure.
- Release candidate checkpoint.

### 7. Pilot acceptance
Run complete real operating scenario on the Windows runtime.

Fix blockers only.

## Deferred / post-Pilot

Unless they become real Pilot blockers:
- Cash Movement History
- Advanced audit UI
- AI reports
- Advanced BI
- Detailed admin permissions
- Nextera replication
- Echo integration
- Greek
- Perfect visual polish
- Physical printer integration
- SHVA / live credit terminal integration
- Advanced multi-register / multi-branch synchronization

## Exact next action

Migrate Register Shift persistence to SQLite as the second Pilot-critical domain.

Before changing code:
- inspect RegisterShiftRepository,
- preserve its current synchronous API and hydration model,
- do not modify Transactions,
- do not migrate Customers in the same step.

After implementation:
- TypeScript build,
- production build,
- Windows runtime test,
- open register,
- fully restart Lumora,
- verify the same active register shift is restored without requesting a second opening declaration.

# Checkpoint — 2026-08-17 — Register Shift SQLite V1

## Completed
- RegisterShiftRepository migrated to platform-specific persistence.
- Browser runtime continues using localStorage.
- Tauri Windows runtime uses SQLite.
- Existing synchronous Register Shift API preserved.
- Customers were intentionally not migrated in this step.

## Verified
- TypeScript: PASS
- Production build: PASS
- Open register shift created in Windows runtime.
- Lumora closed completely.
- Windows runtime restarted.
- Same active register shift restored.
- No second opening declaration requested.

Result:

REGISTER SHIFT SQLITE RESTART GREEN

## Exact next action
Migrate Customers to SQLite as the next Pilot-critical runtime domain.

Before changing code:
- inspect CustomerRepository,
- preserve current API and hydration behavior,
- do not modify Transactions or Register Shift.

# Checkpoint — 2026-08-17 — Customers SQLite V1 + Customer Modal Go-Live Fix

## Completed
- CustomerRepository migrated to SQLite in Tauri Windows runtime.
- Browser runtime continues using localStorage.
- Existing customer API, validation and normalization preserved.
- Customer modal now fits the Windows viewport.
- Form scrolls internally and Save remains accessible.

## Verified
- TypeScript: PASS
- Production build: PASS
- Customer create/save: PASS
- Full Lumora restart: PASS
- Newly created customer remained available after restart.

Result:

CUSTOMERS SQLITE RESTART GREEN

## Current durable SQLite domains
- Transactions
- Register Shift
- Customers

## Exact next action
Audit remaining Pilot-critical repositories that still use browser/local persistence.

Do not migrate everything automatically.
Cash Movement History remains deferred and is not a Go-Live blocker.

# Checkpoint — 2026-08-17 — Cash Movements SQLite V1

## Completed
- CashMovementRepository migrated from direct localStorage access to runtime persistence.
- Browser runtime continues using localStorage.
- Tauri Windows runtime uses SQLite.
- Existing synchronous Cash Movement API preserved.
- Added startup hydration for Cash Movements.
- Existing ShiftReportService / X calculations were not changed.
- Cash Movement History UI remains deferred.

## Verified
- TypeScript: PASS
- Production build: PASS
- Cash deposit created during active register shift.
- X report reflected the cash movement correctly.
- Lumora closed completely.
- Windows runtime restarted.
- Same cash movement remained available.
- X report continued to calculate the movement correctly after restart.

Result:

CASH MOVEMENT SQLITE RESTART GREEN

## Current durable SQLite domains
- Transactions
- Register Shift
- Customers
- Cash Movements

## Exact next action
Audit Shift Z Report persistence and determine whether closed-shift/Z history is still dependent on browser localStorage.

Do not change Z behavior before inspecting ShiftZReportRepository.
