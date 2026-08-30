export type LumoraBranch = {
    id: string;
    tenantId: string;
    code: string;
    name: string;
    isActive: boolean;
    updatedAt: string;
};

const STORAGE_KEY =
    "lumora.organization.branches.v1";

function readBranches():
    LumoraBranch[] {
    const raw =
        localStorage.getItem(
            STORAGE_KEY,
        );

    if (!raw) {
        return [];
    }

    try {
        const parsed =
            JSON.parse(
                raw,
            );

        if (
            !Array.isArray(
                parsed,
            )
        ) {
            return [];
        }

        return parsed.filter(
            (
                value,
            ): value is LumoraBranch =>
                Boolean(
                    value &&
                    typeof value ===
                        "object" &&
                    typeof value.id ===
                        "string" &&
                    typeof value.tenantId ===
                        "string" &&
                    typeof value.code ===
                        "string" &&
                    typeof value.name ===
                        "string" &&
                    typeof value.isActive ===
                        "boolean" &&
                    typeof value.updatedAt ===
                        "string",
                ),
        );
    } catch {
        return [];
    }
}

function writeBranches(
    branches: LumoraBranch[],
): void {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            branches,
        ),
    );
}

export function getNexteraBranches(
    tenantId?: string,
): LumoraBranch[] {
    const branches =
        readBranches();

    return tenantId
        ? branches.filter(
            (branch) =>
                branch.tenantId ===
                tenantId,
        )
        : branches;
}

export function replaceNexteraBranches(
    branches: LumoraBranch[],
): void {
    if (
        branches.length ===
        0
    ) {
        return;
    }

    const tenantIds =
        new Set(
            branches.map(
                (branch) =>
                    branch.tenantId,
            ),
        );

    const preserved =
        readBranches().filter(
            (branch) =>
                !tenantIds.has(
                    branch.tenantId,
                ),
        );

    writeBranches([
        ...preserved,
        ...branches,
    ]);
}

export function findNexteraBranchByCode(
    tenantId: string,
    storeCode: string,
): LumoraBranch | undefined {
    const normalized =
        storeCode
            .trim()
            .toLowerCase();

    return readBranches().find(
        (branch) =>
            branch.tenantId ===
                tenantId &&
            branch.code
                .trim()
                .toLowerCase() ===
                normalized,
    );
}

export function resolveCanonicalBranchId(
    tenantId: string,
    storeCode: string,
): string | undefined {
    return findNexteraBranchByCode(
        tenantId,
        storeCode,
    )?.id;
}
