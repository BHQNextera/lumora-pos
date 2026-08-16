$ErrorActionPreference = "Stop"

Set-Location "C:\PROJECT\lumora-pos"

$statusPath = ".\docs\PROJECT_STATUS.md"

if (-not (Test-Path $statusPath)) {
    throw "docs\PROJECT_STATUS.md not found"
}

$checkpoint = @'

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

A future adapter is required for external accounting/document systems such as Green Invoice / חשבונית ירוקה.

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
'@

Add-Content `
    -Path $statusPath `
    -Value $checkpoint `
    -Encoding UTF8

Write-Host "PROJECT STATUS ROADMAP UPDATED"

Write-Host "`n=== BUILD ==="
npm run build

if ($LASTEXITCODE -ne 0) {
    throw "BUILD FAILED"
}

Write-Host "`nLUMORA ROADMAP 2026-08-14 SAVED"
