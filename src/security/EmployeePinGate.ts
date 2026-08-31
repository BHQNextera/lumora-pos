import {
    hasEmployeePin,
    verifyEmployeePin,
} from "../models/employee/EmployeePinService";

export type EmployeePinAction =
    | "clock_in"
    | "clock_out";

function actionLabel(action: EmployeePinAction) { return action === "clock_in" ? "\u05db\u05e0\u05d9\u05e1\u05d4" : "\u05d9\u05e6\u05d9\u05d0\u05d4"; }

function createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    style: Partial<CSSStyleDeclaration>,
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);
    Object.assign(element.style, style);
    return element;
}
export async function requireEmployeePinAuthorization(
    employeeId: string,
    employeeName: string,
    action:
        EmployeePinAction,
): Promise<boolean> {
    if (
        typeof document ===
            "undefined"
    ) {
        return false;
    }

    const configured =
        await hasEmployeePin(
            employeeId,
        );

    return new Promise<boolean>(
        (resolve) => {
            const overlay =
                createElement(
                    "div",
                    {
                        position:
                            "fixed",
                        inset:
                            "0",
                        zIndex:
                            "2147483647",
                        display:
                            "flex",
                        alignItems:
                            "center",
                        justifyContent:
                            "center",
                        background:
                            "rgba(15,23,42,0.48)",
                        padding:
                            "20px",
                    },
                );

            const card =
                createElement(
                    "div",
                    {
                        width:
                            "min(420px, 100%)",
                        background:
                            "#ffffff",
                        borderRadius:
                            "18px",
                        boxShadow:
                            "0 24px 80px rgba(15,23,42,0.28)",
                        padding:
                            "24px",
                        direction:
                            "rtl",
                        fontFamily:
                            "inherit",
                    },
                );

            const title =
                createElement(
                    "h2",
                    {
                        margin:
                            "0 0 8px",
                        fontSize:
                            "20px",
                    },
                );

            title.textContent = `\u05d0\u05d9\u05de\u05d5\u05ea \u05e2\u05d5\u05d1\u05d3 \u2014 ${actionLabel(action)}`;

            const description =
                createElement(
                    "p",
                    {
                        margin:
                            "0 0 18px",
                        color:
                            "#475569",
                        fontSize:
                            "14px",
                        lineHeight:
                            "1.5",
                    },
                );

            description.textContent = configured ? `${employeeName} \u2014 \u05d4\u05d6\u05df \u05e7\u05d5\u05d3 \u05db\u05e0\u05d9\u05e1\u05d4 \u05d0\u05d9\u05e9\u05d9` : `${employeeName} \u2014 \u05dc\u05d0 \u05d4\u05d5\u05d2\u05d3\u05e8 \u05e7\u05d5\u05d3 PIN. \u05d9\u05e9 \u05dc\u05d4\u05d2\u05d3\u05d9\u05e8 \u05e7\u05d5\u05d3 \u05d1\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05d4\u05e2\u05d5\u05d1\u05d3.`;

            const input =
                createElement(
                    "input",
                    {
                        width:
                            "100%",
                        boxSizing:
                            "border-box",
                        border:
                            "1px solid #cbd5e1",
                        borderRadius:
                            "12px",
                        padding:
                            "12px 14px",
                        fontSize:
                            "22px",
                        textAlign:
                            "center",
                        letterSpacing:
                            "8px",
                        outline:
                            "none",
                    },
                );

            input.type =
                "password";

            input.inputMode =
                "numeric";

            input.autocomplete =
                "off";

            input.maxLength =
                6;

            input.disabled =
                !configured;

            const error =
                createElement(
                    "div",
                    {
                        minHeight:
                            "24px",
                        marginTop:
                            "8px",
                        color:
                            "#b91c1c",
                        fontSize:
                            "13px",
                    },
                );

            const actions =
                createElement(
                    "div",
                    {
                        display:
                            "flex",
                        gap:
                            "10px",
                        marginTop:
                            "14px",
                    },
                );

            const cancel =
                createElement(
                    "button",
                    {
                        flex:
                            "1",
                        border:
                            "1px solid #cbd5e1",
                        borderRadius:
                            "10px",
                        padding:
                            "10px 12px",
                        background:
                            "#ffffff",
                        cursor:
                            "pointer",
                        fontWeight:
                            "700",
                    },
                );

            cancel.type =
                "button";

            cancel.textContent = configured ? "\u05d1\u05d9\u05d8\u05d5\u05dc" : "\u05e1\u05d2\u05d5\u05e8";

            const approve =
                createElement(
                    "button",
                    {
                        flex:
                            "1",
                        border:
                            "0",
                        borderRadius:
                            "10px",
                        padding:
                            "10px 12px",
                        background:
                            "#0f172a",
                        color:
                            "#ffffff",
                        cursor:
                            "pointer",
                        fontWeight:
                            "700",
                    },
                );

            approve.type =
                "button";

            approve.textContent = "\u05d0\u05d9\u05e9\u05d5\u05e8";

            approve.disabled =
                !configured;

            const cleanup = (
                result:
                    boolean,
            ) => {
                overlay.remove();
                resolve(result);
            };

            cancel.onclick =
                () => {
                    cleanup(
                        false,
                    );
                };

            const submit =
                async () => {
                    if (
                        !configured
                    ) {
                        return;
                    }

                    const pin =
                        input.value
                            .trim();

                    if (
                        !/^\d{4,6}$/.test(
                            pin,
                        )
                    ) {
                        error.textContent = "\u05e7\u05d5\u05d3 \u05d4\u05db\u05e0\u05d9\u05e1\u05d4 \u05d7\u05d9\u05d9\u05d1 \u05dc\u05d4\u05db\u05d9\u05dc 4\u20136 \u05e1\u05e4\u05e8\u05d5\u05ea.";

                        input.select();

                        return;
                    }

                    approve.disabled =
                        true;

                    input.disabled =
                        true;

                    const result =
                        await verifyEmployeePin(
                            employeeId,
                            pin,
                        );

                    if (result.ok) {
                        cleanup(
                            true,
                        );

                        return;
                    }

                    if (
                        result.reason ===
                        "locked"
                    ) {
                        error.textContent = `\u05d4\u05e7\u05d5\u05d3 \u05e0\u05e2\u05d5\u05dc \u05d6\u05de\u05e0\u05d9\u05ea. \u05e0\u05e1\u05d4 \u05e9\u05d5\u05d1 \u05d1\u05e2\u05d5\u05d3 ${result.retryAfterSeconds ?? 60} \u05e9\u05e0\u05d9\u05d5\u05ea.`;
                    }
                    else {
                        error.textContent = "\u05e7\u05d5\u05d3 \u05db\u05e0\u05d9\u05e1\u05d4 \u05e9\u05d2\u05d5\u05d9.";
                    }

                    input.value =
                        "";

                    input.disabled =
                        false;

                    approve.disabled =
                        false;

                    input.focus();
                };

            approve.onclick =
                () => {
                    void submit();
                };

            input.onkeydown =
                (event: KeyboardEvent) => {
                    if (
                        event.key ===
                        "Enter"
                    ) {
                        event.preventDefault();

                        void submit();
                    }
                    else if (
                        event.key ===
                        "Escape"
                    ) {
                        cleanup(
                            false,
                        );
                    }
                };

            actions.append(
                cancel,
                approve,
            );

            card.append(
                title,
                description,
            );

            if (configured) {
                card.append(
                    input,
                    error,
                );
            }

            card.append(
                actions,
            );

            overlay.append(
                card,
            );

            document.body.append(
                overlay,
            );

            if (configured) {
                window.setTimeout(
                    () =>
                        input.focus(),
                    0,
                );
            }
        },
    );
}

