import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import type {
    ReactNode,
} from "react";

import {
    getAppLocale,
    saveAppLocale,
    subscribeAppLocale,
} from "./AppLocaleSettings";

import {
    LocaleContext,
} from "./LocaleContext";

import {
    getDirection,
    translate,
} from "./index";

import type {
    SupportedLocale,
} from "./types";

type LocaleProviderProps = {
    children: ReactNode;
};

function LocaleProvider({
    children,
}: LocaleProviderProps) {
    const [
        locale,
        setLocaleState,
    ] = useState(
        getAppLocale,
    );

    useEffect(
        () =>
            subscribeAppLocale(
                () => {
                    setLocaleState(
                        getAppLocale(),
                    );
                },
            ),
        [],
    );

    const setLocale =
        useCallback(
            (
                nextLocale:
                    SupportedLocale,
            ) => {
                saveAppLocale(
                    nextLocale,
                );
            },
            [],
        );

    const t =
        useCallback(
            (
                key: string,
            ) =>
                translate(
                    key,
                    locale,
                ),
            [locale],
        );

    const value =
        useMemo(
            () => ({
                locale,
                direction:
                    getDirection(
                        locale,
                    ),
                setLocale,
                t,
            }),
            [
                locale,
                setLocale,
                t,
            ],
        );

    return (
        <LocaleContext.Provider
            value={value}
        >
            {children}
        </LocaleContext.Provider>
    );
}

export default LocaleProvider;
