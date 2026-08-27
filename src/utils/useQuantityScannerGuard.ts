/* LUMORA QUANTITY SCANNER GUARD V1 */

import {
    useRef,
} from "react";

const SCANNER_MAX_INTERVAL_MS = 80;
const SCANNER_MIN_DIGITS = 8;
const SCANNER_BLOCK_RELEASE_MS = 450;

type ScannerState = {
    fieldKey: string;
    buffer: string;
    lastAt: number;
    blockedUntil: number;
};

export function useQuantityScannerGuard() {
    const stateRef =
        useRef<ScannerState>({
            fieldKey: "",
            buffer: "",
            lastAt: 0,
            blockedUntil: 0,
        });

    const reset = () => {
        stateRef.current = {
            fieldKey: "",
            buffer: "",
            lastAt: 0,
            blockedUntil: 0,
        };
    };

    const handleKeyDown = ({
        fieldKey,
        key,
        onDetected,
    }: {
        fieldKey: string;
        key: string;
        onDetected: () => void;
    }) => {
        const state =
            stateRef.current;
        const now =
            Date.now();

        if (
            state.blockedUntil >
            now
        ) {
            if (
                /^\d$/.test(key) ||
                key === "Enter" ||
                key === "Tab"
            ) {
                return true;
            }

            reset();
            return false;
        }

        if (!/^\d$/.test(key)) {
            if (
                key === "Enter" ||
                key === "Tab" ||
                key === "Escape"
            ) {
                reset();
            }
            return false;
        }

        const sameBurst =
            state.fieldKey ===
                fieldKey &&
            now - state.lastAt <=
                SCANNER_MAX_INTERVAL_MS;

        const buffer =
            sameBurst
                ? state.buffer + key
                : key;

        stateRef.current = {
            fieldKey,
            buffer,
            lastAt: now,
            blockedUntil: 0,
        };

        if (
            buffer.length >=
            SCANNER_MIN_DIGITS
        ) {
            stateRef.current = {
                fieldKey,
                buffer,
                lastAt: now,
                blockedUntil:
                    now +
                    SCANNER_BLOCK_RELEASE_MS,
            };

            onDetected();
            return true;
        }

        return false;
    };

    return {
        handleKeyDown,
        reset,
    };
}
