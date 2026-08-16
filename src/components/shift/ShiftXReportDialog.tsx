import {
    defaultPaymentMethods,
} from "../../models/PaymentMethod";
import type {
    RegisterShift,
} from "../../models/shift/RegisterShift";
import {
    generateShiftXReport,
} from "../../models/shift/ShiftReportService";

type ShiftXReportDialogProps = {
    shift: RegisterShift;
    onClose: () => void;
};

function money(
    value: number,
) {
    return `₪${value.toFixed(2)}`;
}

function ShiftXReportDialog({
    shift,
    onClose,
}: ShiftXReportDialogProps) {
    const report =
        generateShiftXReport(
            shift,
        );

    const paymentName = (
        method: string,
    ) =>
        defaultPaymentMethods.find(
            (item) =>
                item.code === method,
        )?.name ?? method;

    return (
        <div
            dir="rtl"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 14000,
                display: "grid",
                placeItems: "center",
                padding: "24px",
                background:
                    "rgba(15,23,42,.42)",
            }}
        >
            <section
                style={{
                    width:
                        "min(720px, 95vw)",
                    maxHeight:
                        "88vh",
                    overflow:
                        "auto",
                    padding:
                        "26px",
                    borderRadius:
                        "18px",
                    background:
                        "#fff",
                }}
            >
                <header
                    style={{
                        display:
                            "flex",
                        justifyContent:
                            "space-between",
                        gap:
                            "20px",
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
                            X REPORT
                        </div>

                        <h2
                            style={{
                                margin:
                                    "4px 0",
                            }}
                        >
                            דוח X
                        </h2>

                        <div>
                            קופה{" "}
                            {
                                report.registerCode
                            }
                            {" · "}
                            נפתחה{" "}
                            {
                                new Date(
                                    report.openedAt,
                                ).toLocaleString(
                                    "he-IL",
                                )
                            }
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

                <table
                    style={{
                        width:
                            "100%",
                        borderCollapse:
                            "collapse",
                    }}
                >
                    <tbody>
                        <tr>
                            <td>עסקאות</td>
                            <td>{report.transactionCount}</td>
                        </tr>

                        <tr>
                            <td>מכירות</td>
                            <td>{report.saleCount}</td>
                        </tr>

                        <tr>
                            <td>החזרות</td>
                            <td>{report.returnCount}</td>
                        </tr>

                        <tr>
                            <td>החלפות</td>
                            <td>{report.exchangeCount}</td>
                        </tr>

                        <tr>
                            <td>מכירות</td>
                            <td>{money(report.grossSales)}</td>
                        </tr>

                        <tr>
                            <td>החזרות / זיכויים</td>
                            <td>{money(report.returnsTotal)}</td>
                        </tr>

                        <tr>
                            <td>מחזור נטו</td>
                            <td>
                                <strong>
                                    {money(report.netSales)}
                                </strong>
                            </td>
                        </tr>

                        <tr>
                            <td>הנחות</td>
                            <td>{money(report.discountTotal)}</td>
                        </tr>

                        <tr>
                            <td>יתרת פתיחה</td>
                            <td>{money(report.openingCash)}</td>
                        </tr>

                        <tr>
                            <td>תקבולי מזומן</td>
                            <td>{money(report.cashPayments)}</td>
                        </tr>

                        <tr>
                            <td>מזומן צפוי בקופה</td>
                            <td>
                                <strong>
                                    {money(report.expectedCash)}
                                </strong>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <h3
                    style={{
                        marginTop:
                            "26px",
                    }}
                >
                    אמצעי תשלום
                </h3>

                <table
                    style={{
                        width:
                            "100%",
                        borderCollapse:
                            "collapse",
                    }}
                >
                    <thead>
                        <tr>
                            <th>אמצעי תשלום</th>
                            <th>מספר עסקאות</th>
                            <th>סכום</th>
                        </tr>
                    </thead>

                    <tbody>
                        {report.paymentTotals.map(
                            (payment) => (
                                <tr
                                    key={
                                        payment.method
                                    }
                                >
                                    <td>
                                        {
                                            paymentName(
                                                payment.method,
                                            )
                                        }
                                    </td>

                                    <td>
                                        {
                                            payment.paymentCount
                                        }
                                    </td>

                                    <td>
                                        {
                                            money(
                                                payment.amount,
                                            )
                                        }
                                    </td>
                                </tr>
                            ),
                        )}
                    </tbody>
                </table>

                <div
                    style={{
                        display:
                            "flex",
                        gap:
                            "8px",
                        marginTop:
                            "24px",
                    }}
                >
                    <button
                        type="button"
                        onClick={() =>
                            window.print()
                        }
                    >
                        הדפס
                    </button>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                    >
                        סגור
                    </button>
                </div>
            </section>
        </div>
    );
}

export default ShiftXReportDialog;