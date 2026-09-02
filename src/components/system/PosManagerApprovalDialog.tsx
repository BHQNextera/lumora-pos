import {
    useMemo,
    useState,
} from "react";

import type {
    Employee,
} from "../../models/employee/Employee";

import {
    getPosManagerApprovers,
    verifyPosManagerApproval,
    type PosManagerApproval,
} from "../../models/employee/PosManagerApprovalService";

type Props = {
    actor: Employee;
    actionPermissionKey: string;
    actionLabel: string;

    onApproved: (
        approval: PosManagerApproval,
    ) => void;

    onCancel: () => void;
};

export default function PosManagerApprovalDialog({
    actor,
    actionPermissionKey,
    actionLabel,
    onApproved,
    onCancel,
}: Props) {
    const approvers =
        useMemo(
            () =>
                getPosManagerApprovers(),
            [],
        );

    const [
        approverEmployeeId,
        setApproverEmployeeId,
    ] = useState("");

    const [
        pin,
        setPin,
    ] = useState("");

    const [
        error,
        setError,
    ] = useState("");

    const [
        isVerifying,
        setIsVerifying,
    ] = useState(false);

    async function approve() {
        if (
            !approverEmployeeId ||
            !/^\d{4,6}$/.test(pin)
        ) {
            setError(
                "יש לבחור מאשר ולהזין PIN בן 4–6 ספרות.",
            );

            return;
        }

        setIsVerifying(true);
        setError("");

        try {
            const result =
                await verifyPosManagerApproval({
                    actor,
                    approverEmployeeId,
                    approverPin:
                        pin,
                    actionPermissionKey,
                });

            if (!result.ok) {
                setError(
                    "האישור נכשל. בדוק את המאשר וה־PIN.",
                );

                return;
            }

            onApproved(
                result.approval,
            );
        }
        finally {
            setIsVerifying(false);
        }
    }

    return (
        <div
            dir="rtl"
            role="presentation"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                background:
                    "rgba(15, 23, 42, 0.48)",
            }}
        >
            <section
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="pos-manager-approval-title"
                style={{
                    width: "min(460px, 100%)",
                    borderRadius: 18,
                    background: "#fff",
                    padding: 24,
                    boxShadow:
                        "0 24px 70px rgba(15, 23, 42, 0.24)",
                }}
            >
                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#64748b",
                    }}
                >
                    MANAGER APPROVAL
                </div>

                <h2
                    id="pos-manager-approval-title"
                    style={{
                        margin:
                            "6px 0 0",
                        fontSize: 22,
                    }}
                >
                    נדרש אישור מנהל
                </h2>

                <p
                    style={{
                        margin:
                            "8px 0 0",
                        color: "#64748b",
                    }}
                >
                    הפעולה{" "}
                    <strong>
                        {actionLabel}
                    </strong>{" "}
                    אינה מורשית לעובד{" "}
                    <strong>
                        {actor.name}
                    </strong>.
                </p>

                <label
                    style={{
                        display: "block",
                        marginTop: 20,
                    }}
                >
                    <span
                        style={{
                            display: "block",
                            marginBottom: 6,
                            fontWeight: 700,
                        }}
                    >
                        מאשר
                    </span>

                    <select
                        value={
                            approverEmployeeId
                        }
                        onChange={(event) => {
                            setApproverEmployeeId(
                                event.target.value,
                            );

                            setError("");
                        }}
                        style={{
                            width: "100%",
                            padding: 10,
                            border:
                                "1px solid #cbd5e1",
                            borderRadius: 10,
                            background:
                                "#fff",
                        }}
                    >
                        <option value="">
                            יש לבחור מאשר
                        </option>

                        {approvers.map(
                            (employee) => (
                                <option
                                    key={
                                        employee.id
                                    }
                                    value={
                                        employee.id
                                    }
                                >
                                    {employee.name}
                                </option>
                            ),
                        )}
                    </select>
                </label>

                <label
                    style={{
                        display: "block",
                        marginTop: 14,
                    }}
                >
                    <span
                        style={{
                            display: "block",
                            marginBottom: 6,
                            fontWeight: 700,
                        }}
                    >
                        PIN
                    </span>

                    <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={6}
                        value={pin}
                        onChange={(event) => {
                            setPin(
                                event.target.value
                                    .replace(
                                        /\D/g,
                                        "",
                                    )
                                    .slice(
                                        0,
                                        6,
                                    ),
                            );

                            setError("");
                        }}
                        onKeyDown={(event) => {
                            if (
                                event.key ===
                                "Enter"
                            ) {
                                void approve();
                            }
                        }}
                        style={{
                            width: "100%",
                            boxSizing:
                                "border-box",
                            padding: 10,
                            border:
                                "1px solid #cbd5e1",
                            borderRadius: 10,
                        }}
                    />
                </label>

                {error && (
                    <div
                        role="alert"
                        style={{
                            marginTop: 12,
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#b91c1c",
                        }}
                    >
                        {error}
                    </div>
                )}

                <div
                    style={{
                        display: "flex",
                        gap: 10,
                        marginTop: 20,
                    }}
                >
                    <button
                        type="button"
                        disabled={
                            isVerifying
                        }
                        onClick={() =>
                            void approve()
                        }
                        style={{
                            padding:
                                "10px 16px",
                            border: 0,
                            borderRadius: 10,
                            background:
                                "#0f172a",
                            color: "#fff",
                            fontWeight: 800,
                            cursor:
                                "pointer",
                        }}
                    >
                        {isVerifying
                            ? "מאמת..."
                            : "אשר פעולה"}
                    </button>

                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            padding:
                                "10px 16px",
                            border:
                                "1px solid #cbd5e1",
                            borderRadius: 10,
                            background:
                                "#fff",
                            fontWeight: 700,
                            cursor:
                                "pointer",
                        }}
                    >
                        ביטול
                    </button>
                </div>
            </section>
        </div>
    );
}