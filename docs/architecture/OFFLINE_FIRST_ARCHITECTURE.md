# Lumora POS — Offline-First Architecture

## Status

Architecture Decision — Locked

Extends:
Lumora POS Product & UX Baseline 0.1 — Section 17: Offline Operation.

---

# 1. Core Principle

Every Lumora POS terminal is an independent standalone unit.

This remains true regardless of:

- Number of registers in the business
- Number of registers in the same branch
- Internet availability
- Local network availability
- Central server availability
- Replication service availability

A register must be able to continue normal permitted sales operation without another register or central server being available.

---

# 2. Local-First Rule

The local register database is the operational source used by the cashier.

The sale flow must follow:

LOCAL READ
→ LOCAL WRITE
→ LOCAL COMMIT
→ QUEUE REPLICATION
→ SERVER SYNC

It must not follow:

CLIENT
→ WAIT FOR SERVER
→ COMPLETE SALE

Normal sale completion must not depend on a round trip to the server.

---

# 3. Local Data

Each register maintains the local data required for normal operation.

This includes, at minimum:

- Products
- Categories
- Barcodes / SKU
- Price lists
- Promotions
- Customers
- Tax configuration
- Store configuration
- Register configuration
- Payment configuration
- Employees
- Permissions required locally
- Shifts
- Sales
- Sale lines
- Payments
- Returns
- Accounting documents
- Document numbering state
- Credit vouchers where enabled
- Relevant inventory state
- Audit events
- Replication queue

---

# 4. Register Independence

Registers in the same branch do not depend on each other.

Example:

Branch 01

Register 01
- Local database
- Local document sequences
- Local replication queue

Register 02
- Local database
- Local document sequences
- Local replication queue

Register 03
- Local database
- Local document sequences
- Local replication queue

Each register communicates independently with the replication/server layer.

Failure of Register 01 must not stop Register 02 or Register 03.

---

# 5. Replication Architecture

Logical flow:

Register Local Store
↓
Durable Replication Queue
↓
Register Replicator
↓
Server / Branch / Central Services

The server may also deliver changes back to the register.

Examples:

- Products
- Prices
- Promotions
- Customer changes
- Tax configuration
- Permissions
- Configuration
- Inventory updates
- Other master data

---

# 6. Replication Requirements

Replication must support:

- Durable queue
- Restart recovery
- Retry
- Exponential/backoff policy where appropriate
- Idempotency
- Duplicate prevention
- Global unique event identifiers
- Ordering where business rules require it
- Conflict detection
- Conflict resolution policy
- Last successful sync timestamp
- Failed event tracking
- Manual retry for authorized users
- Audit trail
- Recovery after long offline periods

A replication error must never silently delete a local transaction.

---

# 7. Connectivity Indicators

Lumora exposes three independent operational indicators.

## Internet

States:

- Connected
- Disconnected

Represents external Internet availability.

## Ethernet / Network

States:

- Connected
- Disconnected

Represents local network connectivity.

The implementation may later distinguish Ethernet, Wi-Fi or another network interface, but the cashier-facing status remains simple.

## Replicator

Minimum states:

- Healthy / Connected
- Syncing
- Delayed
- Disconnected
- Error

The three indicators must not be collapsed into one.

Example:

Internet: Connected
Network: Connected
Replicator: Error

This is a valid and important operational state.

---

# 8. Offline Behaviour

When connectivity is unavailable:

- Sale operation continues when permitted
- Products remain available
- Local prices remain available
- Local promotions remain available
- Local customers remain available
- Local tax configuration remains available
- Cash payments remain available
- Transactions are committed locally
- Documents may be issued when safe numbering is available
- Replication events accumulate locally
- Synchronization resumes automatically when possible

The cashier must receive a clear indication of degraded connectivity without unnecessary blocking.

---

# 9. Operations That May Require Connectivity

Operations dependent on external services may be:

- Disabled
- Switched to a configured fallback
- Recorded externally/manual where policy allows
- Queued where legally and technically permitted

Examples:

- Echo
- Online terminal operations
- External customer validation
- External gift card validation
- Remote manager approval
- External fiscal/tax services

Exact behaviour is configurable by country, provider and business policy.

---

# 10. Document Numbering Offline

Document numbering must never depend on an unsafe live-server counter.

Each register owns independent sequences for each document type.

Offline numbering must use a safe mechanism such as:

- Locally owned register-specific sequence
- Preallocated ranges
- Another collision-safe allocation mechanism

Requirements:

- No duplicate document numbers
- No sequence rollback
- No reuse of issued numbers
- Sequence configuration changes require authorization
- Every sequence change is audited

See:

DOCUMENTS_AND_NUMBERING.md

---

# 11. Inventory

Inventory updates created by POS transactions are committed locally first.

They are then replicated.

The server may later reconcile inventory across:

- Registers
- Branches
- Warehouses
- Central inventory

Temporary replication delays must not rewrite or discard the original local transaction.

Inventory conflicts must be visible and auditable.

---

# 12. Conflict Principle

Business transactions are immutable facts.

Replication conflict resolution must not silently modify completed historical transactions.

Where reconciliation is required, create:

- Adjustment
- Correction
- Audit event
- Management exception

Do not rewrite completed history silently.

---

# 13. Platform Requirement

Lumora architecture must support:

- Windows
- Linux
- Android
- iOS

Core transaction and replication logic must therefore avoid permanent dependency on Windows-only technology.

Platform-specific adapters may exist for:

- Printers
- Cash drawers
- Scanners
- Payment terminals
- Local databases
- Background services

But business logic should remain platform-independent.

---

# 14. Local Storage Evolution

Current development may use browser localStorage for temporary demo persistence.

This is not the production local database architecture.

Production requires a durable local database suitable for:

- Transactional writes
- Indexed queries
- Migration/versioning
- Crash recovery
- Replication metadata
- Audit
- Offline operation

The UI must not depend directly on the storage implementation.

Repositories/services provide the abstraction.

---

# 15. Product Goal

Connectivity affects synchronization.

Connectivity must not normally affect the cashier's ability to sell.

The system should remain stable during:

- Internet outage
- Server outage
- Local network outage
- Replication outage
- Temporary integration outage

Lumora is a local-first POS with server replication — not a web client that becomes unusable when the server disappears.