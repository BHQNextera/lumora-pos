export type RuntimeHydrator =
    () => Promise<void>;

type RegisteredHydrator = {
    id: string;
    hydrate: RuntimeHydrator;
};

const hydrators:
    RegisteredHydrator[] = [];

let initialization:
    Promise<void> | null =
        null;

let initialized =
    false;

export function registerRuntimeHydrator(
    id: string,
    hydrate: RuntimeHydrator,
): void {
    if (
        hydrators.some(
            (item) =>
                item.id === id,
        )
    ) {
        return;
    }

    hydrators.push({
        id,
        hydrate,
    });
}

async function runHydration():
Promise<void> {
    /*
     * Hydrators intentionally run sequentially.
     *
     * This makes startup deterministic and allows
     * dependencies between repositories later.
     */
    for (
        const hydrator
        of hydrators
    ) {
        await hydrator.hydrate();
    }

    initialized = true;
}

export function initializeRuntime():
Promise<void> {
    if (!initialization) {
        initialization =
            runHydration();
    }

    return initialization;
}

export function isRuntimeInitialized():
boolean {
    return initialized;
}