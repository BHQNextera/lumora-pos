# Lumora POS — Project Status

## Current checkpoint
Date: 2026-08-08
Branch: main
Base commit before this checkpoint: a9601f5

## Completed in this checkpoint

### Promotion Engine
- Added persistent Promotion Repository.
- Default promotions are now test seed data, not the source of truth.
- Added Buy X Get Y.
- Added Buy A Get B.
- Added Mix & Match.
- Added Bundle Price.
- Added Quantity Discount.
- Added Category Discount.
- Added Fixed Amount Discount.
- Added Basket Discount.
- Added Basket Tier Discount.
- Added percentage reward variants such as second item at 50%.
- Added per-promotion allowStacking policy.
- Promotion conflicts are resolved at unit level.
- Best customer benefit is selected when promotions conflict.
- Promotions never increase the customer price.
- Fixed proportional rounding so allocated discounts reconcile exactly to the promotion amount.
- Added promotion participation metadata so all participating lines can display the promotion, even when the monetary discount is allocated to another line.
- Added date/time scheduling support including days of week, hours and overnight windows.
- Added product/category exclusions.
- Promotion details are persisted on completed sale lines.

### Coupon Engine
- Added Coupon model.
- Added Coupon Repository.
- Added Coupon Service.
- Added coupon test seed data.
- Added fixed amount and percentage coupons.
- Added maximum percentage discount cap.
- Added single-use burn policy.
- Added partial-balance policy.
- Added minimum basket, customer group, branch and channel conditions.
- Added coupon redemption history.
- Coupons are validated in the sale flow.
- Coupon discount is included in the final transaction total.
- Coupon is redeemed only when the transaction is completed.
- Single-use coupon TEST100 was verified: unused value is burned and cannot be reused.
- Coupon information is persisted on the completed sale.

### Sale / Pricing UI
- Promotion name is displayed below participating cart items.
- Monetary discount is displayed only on the line receiving the allocation.
- Coupon entry and removal are available in the cart.
- Hebrew encoding regression in SalePage was fixed.

## Verified
- npm run build passes.
- Split payment checkpoint from previous commit remains intact.
- Promotion calculations tested manually.
- Mix & Match rounding verified.
- Coupon TEST100 verified as single-use and non-reusable.

## Current architecture
- Lumora is the Test Version / Test Environment.
- Demo will later be created as a stable replica for distributors/customers.
- Lumora POS remains standalone-capable.
- Promotion and coupon data currently persist locally.
- Future multi-POS/network architecture will replicate master data and transactions across all tills/branches.
- Nextera is the optional central Back Office for larger businesses.
- Small businesses can manage supported master data directly from Lumora POS.

## Known gaps
- Promotion UI/admin screens do not yet exist.
- Customer-group conditions are modeled but not yet connected to a real customer/loyalty layer.
- Branch/channel conditions are modeled but not yet connected to runtime branch/channel context.
- Loyalty points engine is not yet implemented.
- Coupon/Promotion return and exchange behavior still needs end-to-end QA.
- Persistence is still browser local storage; production local DB is still pending.
- Offline replication and network-wide transaction synchronization are pending.
- Tax engine is pending.
- Fiscal/document finalization is pending.
- Inventory commit is pending.
- Shift/permissions are pending.
- Hardware/printing integrations are pending.

## Exact next task
Complete the remaining Promotion Engine integration:
1. Customer groups / club conditions.
2. Branch and sales-channel runtime conditions.
3. Promotion/coupon behavior on returns and exchanges.
4. Promotion and coupon test matrix.
5. Mark Promotion Engine Alpha Complete.

Then continue to:
Tax Engine -> Documents -> Inventory -> Shift/Permissions -> Local DB -> Offline/Replication -> Hardware/Printing -> QA/Packaging.

## Product rule locked today
A promotion may never make the transaction more expensive.
When multiple eligible promotion combinations conflict, Lumora must select the best valid benefit for the customer.

## Checkpoint — 2026-08-09

### Completed
- Lumora connected to Vercel production.
- Product Info added to catalog items.
- Product Info includes selling price, cost price, gross profit, gross margin, supplier, hierarchy, stock and active promotions.
- Product commercial visibility capabilities added.
- Customer foundation added.
- Test customer groups added: club / VIP.
- Promotion Engine now supports customer-group eligibility.
- Customer selection is connected to pricing.
- Club promotion was verified: walk-in customer receives regular price; club customer receives eligible club promotion.
- Existing pricing, promotion, coupon and payment foundations still build successfully.

### Current build
- npm run build: PASS

### Exact next work
1. Finish Promotion Engine runtime conditions: branch + sales channel.
2. Returns/exchanges with promotions and coupons.
3. Promotion regression test matrix.
4. Mark Promotion Engine Alpha Complete.
5. Tax Engine.
6. Fiscal/Documents finalization.
7. Inventory commit.
8. Employees / permissions / shifts.
9. Local DB.
10. Offline replication and multi-register / multi-branch synchronization.
11. Nextera integration.
12. Echo integration.
13. Hardware / printing.
14. QA and release packaging.
15. Sales Coach on top of real transaction data.
