import {
    useState,
} from "react";

import {
    employeeSeed,
} from "../../models/employee/EmployeeSeed";

import {
    clockInEmployee,
    clockOutEmployee,
    getPresentAttendance,
} from "../../models/attendance/AttendanceRepository";

type AttendancePanelProps = {
    onClose: () => void;
};

function AttendancePanel({
    onClose,
}: AttendancePanelProps) {
    const [
        revision,
        setRevision,
    ] =
        useState(0);

    const present =
        getPresentAttendance();

    const presentByEmployee =
        new Map(
            present.map(
                (entry) => [
                    entry.employeeId,
                    entry,
                ],
            ),
        );

    const employees =
        employeeSeed.filter(
            (employee) =>
                employee.isActive,
        );

    const refresh = () => {
        setRevision(
            (value) =>
                value + 1,
        );
    };

    void revision;

    return (
        <div
            dir="rtl"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 12000,
                display: "grid",
                placeItems: "center",
                padding: "24px",
                background:
                    "rgba(15,23,42,.38)",
            }}
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
                style={{
                    width:
                        "min(520px, 94vw)",
                    maxHeight:
                        "80vh",
                    overflow: "auto",
                    padding: "24px",
                    borderRadius: "18px",
                    background: "#fff",
                    boxShadow:
                        "0 24px 70px rgba(15,23,42,.22)",
                }}
            >
                <header
                    style={{
                        display: "flex",
                        justifyContent:
                            "space-between",
                        alignItems:
                            "flex-start",
                        gap: "20px",
                        marginBottom:
                            "22px",
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize:
                                    "12px",
                                fontWeight:
                                    800,
                            }}
                        >
                            ATTENDANCE
                        </div>

                        <h2
                            style={{
                                margin:
                                    "4px 0",
                            }}
                        >
                            נוכחות עובדים
                        </h2>

                        <div
                            style={{
                                opacity: .65,
                            }}
                        >
                            {
                                present.length
                            }{" "}
                            עובדים בנוכחות
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                    >
                        ✕
                    </button>
                </header>

                <div
                    style={{
                        display: "grid",
                        gap: "10px",
                    }}
                >
                    {employees.map(
                        (employee) => {
                            const attendance =
                                presentByEmployee.get(
                                    employee.id,
                                );

                            return (
                                <div
                                    key={
                                        employee.id
                                    }
                                    style={{
                                        display:
                                            "flex",
                                        justifyContent:
                                            "space-between",
                                        alignItems:
                                            "center",
                                        gap:
                                            "16px",
                                        padding:
                                            "14px",
                                        border:
                                            "1px solid #e2e8f0",
                                        borderRadius:
                                            "12px",
                                    }}
                                >
                                    <div>
                                        <strong>
                                            {
                                                employee.name
                                            }
                                        </strong>

                                        <div
                                            style={{
                                                marginTop:
                                                    "3px",
                                                fontSize:
                                                    "13px",
                                                opacity:
                                                    .65,
                                            }}
                                        >
                                            {attendance
                                                ? `בנוכחות · כניסה ${new Date(
                                                      attendance.clockedInAt,
                                                  ).toLocaleTimeString(
                                                      "he-IL",
                                                      {
                                                          hour:
                                                              "2-digit",
                                                          minute:
                                                              "2-digit",
                                                      },
                                                  )}`
                                                : "לא בנוכחות"}
                                        </div>
                                    </div>

                                    {attendance ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                clockOutEmployee(
                                                    employee.id,
                                                );

                                                refresh();
                                            }}
                                        >
                                            יציאה
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                clockInEmployee({
                                                    employeeId:
                                                        employee.id,
                                                    employeeName:
                                                        employee.name,
                                                });

                                                refresh();
                                            }}
                                        >
                                            כניסה
                                        </button>
                                    )}
                                </div>
                            );
                        },
                    )}
                </div>
            </section>
        </div>
    );
}

export default AttendancePanel;