// LUMORA ATTENDANCE PANEL V2.1

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    getActiveBusinessConfiguration,
} from "../../config/ActiveBusinessConfiguration";

import {
    getActiveRegisterShift,
} from "../../models/shift/RegisterShiftRepository";

import {
    getEmployees,
    subscribeEmployees,
} from "../../models/employee/EmployeeRepository";

import {
    clockInEmployee,
    clockOutEmployee,
    getAttendance,
    getPresentAttendance,
    subscribeAttendance,
} from "../../models/attendance/AttendanceRepository";

import {
    useLocale,
} from "../../i18n/useLocale";

import "./attendance-panel.css";

type AttendancePanelProps = {
    onClose: () => void;
};

function AttendancePanel({
    onClose,
}: AttendancePanelProps) {
    const {
        direction,
        locale,
    } = useLocale();

    const [
        revision,
        setRevision,
    ] = useState(0);

    const [
        busyEmployeeId,
        setBusyEmployeeId,
    ] = useState<string | null>(
        null,
    );

    const [
        errorMessage,
        setErrorMessage,
    ] = useState<string | null>(
        null,
    );

    useEffect(
        () => {
            const refresh = () => {
                setRevision(
                    (current) =>
                        current + 1,
                );
            };

            const unsubscribeAttendance =
                subscribeAttendance(
                    refresh,
                );

            const unsubscribeEmployees =
                subscribeEmployees(
                    refresh,
                );

            return () => {
                unsubscribeAttendance();
                unsubscribeEmployees();
            };
        },
        [],
    );

    useEffect(
        () => {
            const handleKeyDown = (
                event: KeyboardEvent,
            ) => {
                if (
                    event.key ===
                    "Escape"
                ) {
                    onClose();
                }
            };

            document.addEventListener(
                "keydown",
                handleKeyDown,
            );

            return () => {
                document.removeEventListener(
                    "keydown",
                    handleKeyDown,
                );
            };
        },
        [onClose],
    );

    const present =
        useMemo(
            () =>
                getPresentAttendance(),
            [revision],
        );

    const presentByEmployee =
        useMemo(
            () =>
                new Map(
                    present.map(
                        (entry) => [
                            entry.employeeId,
                            entry,
                        ],
                    ),
                ),
            [present],
        );

    const configuration =
        getActiveBusinessConfiguration();

    const activeShift =
        getActiveRegisterShift();

    const todayStartedAt =
        new Date();

    todayStartedAt.setHours(
        0,
        0,
        0,
        0,
    );

    const activityStartedAt =
        activeShift
            ? Date.parse(
                  activeShift.openedAt,
              )
            : todayStartedAt.getTime();

    const latestClosedByEmployee =
        new Map<
            string,
            ReturnType<
                typeof getAttendance
            >[number]
        >();

    getAttendance()
        .filter(
            (entry) =>
                entry.tenantId ===
                    configuration.tenantId &&
                entry.storeCode ===
                    configuration.storeCode &&
                entry.status ===
                    "clocked_out" &&
                Date.parse(
                    entry.clockedOutAt ??
                        entry.clockedInAt,
                ) >=
                    activityStartedAt,
        )
        .sort(
            (left, right) =>
                Date.parse(
                    right.clockedOutAt ??
                        right.clockedInAt,
                ) -
                Date.parse(
                    left.clockedOutAt ??
                        left.clockedInAt,
                ),
        )
        .forEach(
            (entry) => {
                if (
                    !latestClosedByEmployee.has(
                        entry.employeeId,
                    )
                ) {
                    latestClosedByEmployee.set(
                        entry.employeeId,
                        entry,
                    );
                }
            },
        );

    const employees =
        useMemo(
            () =>
                getEmployees()
                    .filter(
                        (employee) =>
                            employee.isActive,
                    )
                    .sort(
                        (left, right) =>
                            left.name.localeCompare(
                                right.name,
                                locale,
                            ),
                    ),
            [locale, revision],
        );

    const timeFormatter =
        useMemo(
            () =>
                new Intl.DateTimeFormat(
                    locale,
                    {
                        hour:
                            "2-digit",
                        minute:
                            "2-digit",
                    },
                ),
            [locale],
        );

    const presentCountText =
        present.length === 0
            ? "אין עובדים בנוכחות"
            : present.length === 1
              ? "עובד אחד בנוכחות"
              : `${present.length} עובדים בנוכחות`;

    const changeAttendance = (
        employee: {
            id: string;
            name: string;
        },
        isPresent: boolean,
    ) => {
        if (busyEmployeeId) {
            return;
        }

        setBusyEmployeeId(
            employee.id,
        );
        setErrorMessage(
            null,
        );

        try {
            if (isPresent) {
                clockOutEmployee(
                    employee.id,
                );
            }
            else {
                clockInEmployee({
                    employeeId:
                        employee.id,
                    employeeName:
                        employee.name,
                });
            }
        }
        catch {
            setErrorMessage(
                "לא ניתן היה לעדכן את הנוכחות. יש לנסות שוב.",
            );
        }
        finally {
            setBusyEmployeeId(
                null,
            );
        }
    };

    return (
        <div
            className="attendance-panel__backdrop"
            dir={direction}
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <section
                aria-labelledby="attendance-panel-title"
                aria-modal="true"
                className="attendance-panel"
                role="dialog"
            >
                <header className="attendance-panel__header">
                    <div>
                        <div className="attendance-panel__eyebrow">
                            LUMORA ATTENDANCE
                        </div>

                        <h2 id="attendance-panel-title">
                            נוכחות עובדים
                        </h2>

                        <p>
                            {presentCountText}
                        </p>
                    </div>

                    <button
                        aria-label="סגירת חלון נוכחות"
                        className="attendance-panel__close"
                        onClick={onClose}
                        type="button"
                    >
                        ×
                    </button>
                </header>

                {errorMessage && (
                    <div
                        aria-live="polite"
                        className="attendance-panel__error"
                        role="status"
                    >
                        {errorMessage}
                    </div>
                )}

                {employees.length === 0 ? (
                    <div className="attendance-panel__empty">
                        <strong>
                            אין עובדים פעילים
                        </strong>

                        <span>
                            ניתן להקים או להפעיל עובדים במסך ההגדרות.
                        </span>
                    </div>
                ) : (
                    <div className="attendance-panel__list">
                        {employees.map(
                            (employee) => {
                                const attendance =
                                    presentByEmployee.get(
                                        employee.id,
                                    );

                                const latestClosed =
                                    latestClosedByEmployee.get(
                                        employee.id,
                                    );

                                const isBusy =
                                    busyEmployeeId ===
                                    employee.id;

                                return (
                                    <article
                                        className={
                                            attendance
                                                ? "attendance-panel__employee attendance-panel__employee--present"
                                                : "attendance-panel__employee"
                                        }
                                        key={employee.id}
                                    >
                                        <div className="attendance-panel__employee-copy">
                                            <div className="attendance-panel__employee-heading">
                                                <strong>
                                                    {employee.name}
                                                </strong>

                                                <span
                                                    className={
                                                        attendance
                                                            ? "attendance-panel__status attendance-panel__status--present"
                                                            : "attendance-panel__status"
                                                    }
                                                >
                                                    {attendance
                                                        ? "בנוכחות"
                                                        : latestClosed
                                                          ? "יצא"
                                                        : "לא בנוכחות"}
                                                </span>
                                            </div>

                                            <p>
                                                {attendance
                                                    ? `כניסה ${timeFormatter.format(
                                                          new Date(
                                                              attendance.clockedInAt,
                                                          ),
                                                      )}`
                                                    : latestClosed?.clockedOutAt
                                                      ? `כניסה ${timeFormatter.format(
                                                            new Date(
                                                                latestClosed.clockedInAt,
                                                            ),
                                                        )} · יציאה ${timeFormatter.format(
                                                            new Date(
                                                                latestClosed.clockedOutAt,
                                                            ),
                                                        )}`
                                                    : "טרם בוצעה כניסה במשמרת הנוכחית"}
                                            </p>
                                        </div>

                                        <button
                                            className={
                                                attendance
                                                    ? "attendance-panel__action attendance-panel__action--exit"
                                                    : "attendance-panel__action attendance-panel__action--entry"
                                            }
                                            disabled={
                                                busyEmployeeId !==
                                                null
                                            }
                                            onClick={() =>
                                                changeAttendance(
                                                    employee,
                                                    Boolean(
                                                        attendance,
                                                    ),
                                                )
                                            }
                                            type="button"
                                        >
                                            {isBusy
                                                ? "מעדכן..."
                                                : attendance
                                                  ? "יציאה"
                                                  : "כניסה"}
                                        </button>
                                    </article>
                                );
                            },
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}

export default AttendancePanel;
