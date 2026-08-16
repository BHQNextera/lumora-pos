import type {
    CashDrawerAdapter,
    CashDrawerOpenResult,
} from "./CashDrawerAdapter";

import type {
    CashDrawerOpenReason,
} from "./CashDrawer";

export class SimulatedCashDrawerAdapter
implements CashDrawerAdapter {
    open(
        _reason:
            CashDrawerOpenReason,
    ): CashDrawerOpenResult {
        return {
            status:
                "simulated",

            adapter:
                "simulated",
        };
    }
}