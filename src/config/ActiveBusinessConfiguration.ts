import {
    getBusinessOperatingProfile,
} from "./BusinessOperatingProfiles";
import type {
    BusinessOperatingProfile,
} from "./BusinessOperatingProfile";
import type {
    BusinessOperatingProfileId,
} from "./BusinessOperatingProfiles";

export type ConfigurationSource =
    | "local"
    | "nextera";

export type ActiveBusinessConfiguration = {
    tenantId: string;

    storeCode: string;
    registerCode: string;

    profileId:
        BusinessOperatingProfileId;

    source:
        ConfigurationSource;
};

const STORAGE_KEY =
    "lumora.active-business-configuration";

const defaultConfiguration:
    ActiveBusinessConfiguration = {
    tenantId:
        "coffee-time-demo",

    storeCode:
        "01",

    registerCode:
        "02",

    profileId:
        "retail",

    source:
        "local",
};

function loadConfiguration():
    ActiveBusinessConfiguration {
    try {
        const raw =
            window.localStorage.getItem(
                STORAGE_KEY,
            );

        if (!raw) {
            return defaultConfiguration;
        }

        const parsed =
            JSON.parse(
                raw,
            ) as Partial<ActiveBusinessConfiguration>;

        if (
            !parsed.tenantId ||
            !parsed.storeCode ||
            !parsed.registerCode ||
            !parsed.profileId ||
            !parsed.source
        ) {
            return defaultConfiguration;
        }

        return {
            tenantId:
                parsed.tenantId,

            storeCode:
                parsed.storeCode,

            registerCode:
                parsed.registerCode,

            profileId:
                parsed.profileId,

            source:
                parsed.source,
        };
    } catch {
        return defaultConfiguration;
    }
}

let activeConfiguration =
    loadConfiguration();

export function getActiveBusinessConfiguration():
    ActiveBusinessConfiguration {
    return {
        ...activeConfiguration,
    };
}

export function saveActiveBusinessConfiguration(
    configuration:
        ActiveBusinessConfiguration,
) {
    activeConfiguration = {
        ...configuration,
    };

    window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            activeConfiguration,
        ),
    );

    return getActiveBusinessConfiguration();
}

export function resetActiveBusinessConfiguration() {
    activeConfiguration = {
        ...defaultConfiguration,
    };

    window.localStorage.removeItem(
        STORAGE_KEY,
    );

    return getActiveBusinessConfiguration();
}

export function getActiveBusinessOperatingProfile():
    BusinessOperatingProfile {
    return getBusinessOperatingProfile(
        activeConfiguration.profileId,
    );
}

export function getActiveRegisterProfile() {
    const profile =
        getActiveBusinessOperatingProfile();

    return profile.registers.find(
        (register) =>
            register.storeCode ===
                activeConfiguration.storeCode &&
            register.registerCode ===
                activeConfiguration.registerCode,
    );
}