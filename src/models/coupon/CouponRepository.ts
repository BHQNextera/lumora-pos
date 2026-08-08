import type {
    Coupon,
    CouponRedemption,
} from "./Coupon";

const COUPONS_KEY =
    "lumora.coupons";

const REDEMPTIONS_KEY =
    "lumora.coupon.redemptions";

function loadArray<T>(
    key: string,
): T[] {
    try {
        const raw =
            localStorage.getItem(
                key,
            );

        if (!raw) {
            return [];
        }

        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? (parsed as T[])
            : [];
    } catch {
        return [];
    }
}

function saveArray<T>(
    key: string,
    values: T[],
) {
    localStorage.setItem(
        key,
        JSON.stringify(values),
    );
}

export function getCoupons() {
    return loadArray<Coupon>(
        COUPONS_KEY,
    );
}

export function getCouponByCode(
    code: string,
) {
    const normalized =
        code.trim().toUpperCase();

    return getCoupons().find(
        (coupon) =>
            coupon.code
                .trim()
                .toUpperCase() ===
            normalized,
    );
}

export function saveCoupon(
    coupon: Coupon,
) {
    const current =
        getCoupons();

    const next =
        current.some(
            (item) =>
                item.id ===
                coupon.id,
        )
            ? current.map(
                (item) =>
                    item.id ===
                        coupon.id
                        ? coupon
                        : item,
            )
            : [
                ...current,
                coupon,
            ];

    saveArray(
        COUPONS_KEY,
        next,
    );

    return coupon;
}

export function removeCoupon(
    couponId: string,
) {
    saveArray(
        COUPONS_KEY,
        getCoupons().filter(
            (coupon) =>
                coupon.id !==
                couponId,
        ),
    );
}

export function getCouponRedemptions() {
    return loadArray<CouponRedemption>(
        REDEMPTIONS_KEY,
    );
}

export function saveCouponRedemption(
    redemption: CouponRedemption,
) {
    saveArray(
        REDEMPTIONS_KEY,
        [
            ...getCouponRedemptions(),
            redemption,
        ],
    );

    return redemption;
}