import {
  useEffect,
  useRef,
  useState,
} from "react";

import Sidebar from "../components/layout/Sidebar";
import WelcomeScreen from "../components/welcome/WelcomeScreen";
import AttendancePanel from "../components/attendance/AttendancePanel";
import CashMovementDialog from "../components/cash/CashMovementDialog";
import PosManagerApprovalDialog from "../components/system/PosManagerApprovalDialog";

import type {
  PosManagerApproval,
} from "../models/employee/PosManagerApprovalService";
import ShiftXReportDialog from "../components/shift/ShiftXReportDialog";
import ShiftZReportDialog from "../components/shift/ShiftZReportDialog";
import CloseRegisterShiftDialog from "../components/shift/CloseRegisterShiftDialog";
import OpenRegisterShiftDialog from "../components/shift/OpenRegisterShiftDialog";
import StatusBar from "../components/layout/StatusBar";
import {
  getActiveRegisterShift,
  closeRegisterShift,
  flushRegisterShiftPersistence,
} from "../models/shift/RegisterShiftRepository";
import type {
  RegisterShift,
} from "../models/shift/RegisterShift";
import {
  clockOutEmployeeAutomatically,
  getPresentAttendance,
} from "../models/attendance/AttendanceRepository";
import {
  hydrateEmployees,
} from "../models/employee/EmployeeRepository";

import type {
  Employee,
} from "../models/employee/Employee";

import {
  employeeRolesHavePermission,
} from "../models/employee/EmployeeRoleCatalog";
import {
  hydrateRegisterPrinterConfig,
} from "../config/RegisterPrinterConfig";
import {
  hydrateDocumentSettings,
} from "../config/DocumentSettings";
import {
  hydrateDocumentFooterSettings,
} from "../config/DocumentFooterSettings";
import {
  hydratePaymentMethodConfiguration,
} from "../models/PaymentMethod";
import {
  hydrateTaxPolicy,
} from "../models/tax/TaxPolicy";
import {
  hydrateReturnPolicy,
} from "../config/ReturnPolicy";
import {
  hydrateCustomerCreditPolicy,
} from "../config/CustomerCreditPolicy";
import {
  hydrateBusinessIdentitySettings,
} from "../config/BusinessIdentitySettings";
import {
  hydrateRegisterLocalSettings,
} from "../config/RegisterLocalSettings";

import {
  createShiftZReport,
  flushShiftZReportPersistence,
} from "../models/shift/ShiftZReportRepository";

import {
  flushCashMovementPersistence,
} from "../models/cash-movement/CashMovementRepository";

import {
  flushTransactionPersistence,
} from "../models/transaction/TransactionRepository";

import {
  requestCashDrawerOpen,
} from "../models/drawer/CashDrawerService";

import type {
  ShiftZReport,
} from "../models/shift/ShiftZReport";
import {
  findByDocumentNumber,
} from "../models/document/DocumentLookupService";
import type {
  CartLine,
} from "../models/sale/CartLine";
import type {
  Sale,
} from "../models/sale/Sale";
import CustomerManagementPage from "../pages/customers/CustomerManagementPage";
import InventoryWorkspacePage from "../pages/inventory/InventoryWorkspacePage";
import PromotionManagementPage from "../pages/promotions/PromotionManagementPage";
import SalePage from "../pages/sale/SalePage";
import ReportsPage from "../pages/reports/ReportsPage";
import GiftCardManagementPage from "../pages/stored-value/GiftCardManagementPage";
import StoredValueManagementPage from "../pages/stored-value/StoredValueManagementPage";
import TransactionsPage from "../pages/transactions/TransactionsPage";
import SettingsPage from "../pages/settings/SettingsPage";

export type AppView =
  | "sale"
  | "transactions"
  | "products"
  | "customers"
  | "promotions"
  | "credits"
  | "gift-cards"
  | "reports"
  | "settings";

type ScannedTransaction = {
  sale: Sale;
  scanId: number;
};

function AppShell() {
  const [
    employeesHydrated,
    setEmployeesHydrated,
  ] =
    useState(false);

  useEffect(() => {
    let isMounted =
      true;

    void Promise.all([
      hydrateEmployees(),
      hydrateRegisterPrinterConfig(),
      hydrateDocumentSettings(),
      hydrateDocumentFooterSettings(),
      hydratePaymentMethodConfiguration(),
      hydrateTaxPolicy(),
      hydrateReturnPolicy(),
      hydrateCustomerCreditPolicy(),
      hydrateBusinessIdentitySettings(),
      hydrateRegisterLocalSettings(),
    ]).finally(() => {
      if (isMounted) {
        setEmployeesHydrated(
          true,
        );
      }
    });

    return () => {
      isMounted =
        false;
    };
  }, []);

  const [
    activeShift,
    setActiveShift,
  ] =
    useState<RegisterShift | undefined>(
      () =>
        getActiveRegisterShift(),
    );

  const [
    currentOperator,
    setCurrentOperator,
  ] =
    useState<Employee | null>(
      null,
    );

  const [
    showOpenShiftDialog,
    setShowOpenShiftDialog,
  ] =
    useState(true);

  useEffect(() => {
    if (
      !activeShift ||
      showOpenShiftDialog
    ) {
      setCurrentOperator(
        null,
      );
    }
  }, [
    activeShift,
    showOpenShiftDialog,
  ]);

  const [
    showCashMovementApproval,
    setShowCashMovementApproval,
  ] =
    useState(false);

  const [
    cashMovementApproval,
    setCashMovementApproval,
  ] =
    useState<PosManagerApproval | null>(
      null,
    );

  const canCurrentOperatorOpenCashMovement =
    currentOperator !== null &&
    employeeRolesHavePermission(
      currentOperator.roles,
      "pos.cash_movement",
    );

  const [
    activeView,
    setActiveView,
  ] =
    useState<AppView>(
      "sale",
    );

  /* LUMORA CUSTOMER DRILLDOWN V1.2 */
  const [
    customerTransactionFilter,
    setCustomerTransactionFilter,
  ] =
    useState<{
      id: string;
      name: string;
    } | null>(null);

const [
    showIdleWelcome,
    setShowIdleWelcome,
  ] =
    useState(false);

  useEffect(() => {
    if (
      !activeShift ||
      showOpenShiftDialog ||
      showIdleWelcome
    ) {
      return;
    }

    let timer =
      window.setTimeout(
        () => {
          setShowIdleWelcome(
            true,
          );
        },
        60_000,
      );

    const resetIdleTimer = () => {
      window.clearTimeout(
        timer,
      );

      timer =
        window.setTimeout(
          () => {
            setShowIdleWelcome(
              true,
            );
          },
          60_000,
        );
    };

    window.addEventListener(
      "pointerdown",
      resetIdleTimer,
    );

    window.addEventListener(
      "keydown",
      resetIdleTimer,
    );

    return () => {
      window.clearTimeout(
        timer,
      );

      window.removeEventListener(
        "pointerdown",
        resetIdleTimer,
      );

      window.removeEventListener(
        "keydown",
        resetIdleTimer,
      );
    };
  }, [
    activeShift,
    showOpenShiftDialog,
    showIdleWelcome,
  ]);

  const [
    pendingReturnLines,
    setPendingReturnLines,
  ] =
    useState<CartLine[]>(
      [],
    );

  const [
    scannedTransaction,
    setScannedTransaction,
  ] =
    useState<ScannedTransaction | null>(
      null,
    );

  const scanBufferRef =
    useRef("");

  const scanResetTimerRef =
    useRef<number | null>(
      null,
    );

  useEffect(() => {
    const resetBuffer = () => {
      scanBufferRef.current =
        "";

      if (
        scanResetTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          scanResetTimerRef.current,
        );

        scanResetTimerRef.current =
          null;
      }
    };

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      const target =
        event.target as
          | HTMLElement
          | null;

      if (
        target instanceof
          HTMLInputElement ||
        target instanceof
          HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (
        event.key ===
        "Enter"
      ) {
        const scannedValue =
          scanBufferRef.current;

        resetBuffer();

        if (!scannedValue) {
          return;
        }

        const result =
          findByDocumentNumber(
            scannedValue,
          );

        if (!result) {
          console.warn(
            "Document barcode not found:",
            scannedValue,
          );

          return;
        }

        setScannedTransaction({
          sale:
            result.sale,

          scanId:
            Date.now(),
        });

        setActiveView(
          "transactions",
        );

        return;
      }

      if (
        /^[0-9]$/.test(
          event.key,
        )
      ) {
        scanBufferRef.current +=
          event.key;

        if (
          scanResetTimerRef.current !==
          null
        ) {
          window.clearTimeout(
            scanResetTimerRef.current,
          );
        }

        scanResetTimerRef.current =
          window.setTimeout(
            resetBuffer,
            10000,
          );
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      if (
        scanResetTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          scanResetTimerRef.current,
        );
      }
    };
  }, []);

  const handleReturnToSale = (
    lines: CartLine[],
  ) => {
    setPendingReturnLines(
      lines,
    );

    setActiveView(
      "sale",
    );
  };

  const [
    showAttendance,
    setShowAttendance,
  ] =
    useState(false);

  const [
    showCashMovement,
    setShowCashMovement,
  ] =
    useState(false);

  const [
    showXReport,
    setShowXReport,
  ] =
    useState(false);

  const [
    showCloseShift,
    setShowCloseShift,
  ] =
    useState(false);

  const [
    showCloseShiftApproval,
    setShowCloseShiftApproval,
  ] = useState(false);

  const [
    closeShiftApproval,
    setCloseShiftApproval,
  ] = useState<PosManagerApproval | null>(
    null,
  );

  const [
    completedZReport,
    setCompletedZReport,
  ] =
    useState<ShiftZReport | null>(
      null,
    );

  const [
    showNavigation,
    setShowNavigation,
  ] = useState(false);

  const [
    sidebarCollapsed,
    setSidebarCollapsed,
  ] = useState(false);

  return (
    <div
      className={`pos-app-shell ${
        activeView === "sale"
          ? "pos-app-shell--sale"
          : ""
      }`}
    >
      {activeView === "sale" && (
        <button
          type="button"
          className="pos-app-shell__nav-trigger"
          aria-label="פתח תפריט Lumora"
          aria-expanded={showNavigation}
          onClick={() =>
            setShowNavigation(
              (current) => !current,
            )
          }
        >
          <span
            className="pos-app-shell__nav-trigger-mark"
            aria-hidden="true"
          >
            ✦
          </span>

          <span>
            LUMORA
          </span>
        </button>
      )}

      {activeView === "sale" &&
        showNavigation && (
          <button
            type="button"
            className="pos-app-shell__nav-backdrop"
            aria-label="סגור תפריט"
            onClick={() =>
              setShowNavigation(false)
            }
          />
        )}

      <div
        className={`pos-app-shell__sidebar-host ${
          activeView === "sale" &&
          showNavigation
            ? "pos-app-shell__sidebar-host--open"
            : ""
        }`}
      >
      <Sidebar
        activeView={
          activeView
        }
        collapsed={
          activeView === "sale" &&
          sidebarCollapsed
        }
        onToggleCollapsed={
          activeView === "sale"
            ? () =>
                setSidebarCollapsed(
                  (current) => !current,
                )
            : undefined
        }
        onNavigate={(view) => {
          if (view !== "transactions") {
            setCustomerTransactionFilter(
              null,
            );
          }

          setActiveView(view);
          setShowNavigation(false);
        }}
        activeShift={
          activeShift
        }
        canOpenCashMovement={currentOperator !== null}
        onOpenRegisterShift={() =>
          setShowOpenShiftDialog(
            true,
          )
        }
        onOpenAttendance={() =>
          setShowAttendance(
            true,
          )
        }
        onOpenCashMovement={() => {
          if (!currentOperator) {
            return;
          }

          if (
            canCurrentOperatorOpenCashMovement
          ) {
            setCashMovementApproval(
              null,
            );

            setShowCashMovement(
              true,
            );

            return;
          }

          setCashMovementApproval(
            null,
          );

          setShowCashMovementApproval(
            true,
          );
        }}
        onSwitchCashier={() => {
          setCurrentOperator(null);

          setShowOpenShiftDialog(
            true,
          );
        }}
        onCloseRegisterShift={() => {
          if (!currentOperator) {
            return;
          }

          if (
            employeeRolesHavePermission(
              currentOperator.roles,
              "pos.register.close",
            )
          ) {
            setCloseShiftApproval(null);

            requestCashDrawerOpen(
              "closing_count",
            );

            setShowCloseShift(true);

            return;
          }

          setCloseShiftApproval(null);
          setShowCloseShiftApproval(true);
        }}
      />


      </div>

      <div
        className="pos-app-shell__main"
        dir="rtl"
      >
        <main className="pos-app-shell__workspace">
          {activeView ===
            "sale" && (
            <SalePage
              currentOperator={currentOperator}
              incomingReturnLines={
                pendingReturnLines
              }
              onReturnLinesConsumed={() =>
                setPendingReturnLines(
                  [],
                )
              }
            />
          )}

          {activeView ===
            "transactions" && (
            <TransactionsPage
              onReturnToSale={
                handleReturnToSale
              }
              scannedSale={
                scannedTransaction
                  ?.sale
              }
              scanId={
                scannedTransaction
                  ?.scanId
              }

              customerFilter={
                customerTransactionFilter
              }
              onClearCustomerFilter={() =>
                setCustomerTransactionFilter(
                  null,
                )
              }
/>
          )}

          {activeView ===
            "customers" && (
            <CustomerManagementPage
              onOpenTransactions={(
                customerId,
                customerName,
              ) => {
                setActiveView(
                  "transactions",
                );

                setCustomerTransactionFilter({
                  id: customerId,
                  name: customerName,
                });
              }}
            />
          )}

          {activeView ===
            "products" && (
            <InventoryWorkspacePage />
          )}

          {activeView ===
            "promotions" && (
            <PromotionManagementPage />
          )}

          {activeView ===
            "credits" && (
            <StoredValueManagementPage />
          )}

          {activeView ===
            "gift-cards" && (
            <GiftCardManagementPage />
          )}
          {activeView === "reports" && (
            <ReportsPage
              onOpenXReport={() =>
                setShowXReport(
                  true,
                )
              }
            />
          )}
          {activeView === "settings" && (
            <SettingsPage />
          )}
        </main>

        <StatusBar
          activeShift={
            activeShift
          }
          currentOperator={
            currentOperator
          }
        />
      </div>

      {showCloseShift && activeShift && currentOperator && (
        <CloseRegisterShiftDialog
          shift={
            activeShift
          }
          onClose={() => {
            setShowCloseShift(false);
            setCloseShiftApproval(null);
          }}
          onConfirm={async (closingCashDeclaration) => {
            /*
             * Make sure all trading activity already queued for
             * persistence is durable before closing the shift.
             */
            await Promise.all([
              flushTransactionPersistence(),
              flushCashMovementPersistence(),
            ]);

            const closed =
              closeRegisterShift({
                employeeId:
                  currentOperator.id,

                employeeName:
                  currentOperator.name,

                closingCash:
                  closingCashDeclaration.total,

                closingCashDeclaration,


                closingAuthorization: {
                  actionPermissionKey:
                    "pos.register.close",

                  actor: {
                    employeeId:
                      currentOperator.id,

                    employeeName:
                      currentOperator.name,
                  },

                  approver:
                    closeShiftApproval
                      ? {
                          approvalId:
                            closeShiftApproval.approvalId,

                          employeeId:
                            closeShiftApproval.approver.employeeId,

                          employeeName:
                            closeShiftApproval.approver.employeeName,

                          approvedAt:
                            closeShiftApproval.approvedAt,
                        }
                      : undefined,

                  authorizedAt:
                    closeShiftApproval?.approvedAt ??
                    new Date().toISOString(),
                },
              });

            const zReport =
              createShiftZReport(
                closed,
              );

            /*
             * A completed close is not exposed to the operator
             * until the closed shift and immutable Z snapshot
             * are durable.
             */
            await Promise.all([
              flushRegisterShiftPersistence(),
              flushShiftZReportPersistence(),
            ]);

            const present =
              getPresentAttendance();

            present.forEach(
              (entry) => {
                clockOutEmployeeAutomatically(
                  entry.employeeId,
                );
              },
            );

            setCompletedZReport(
              zReport,
            );

            setShowCloseShift(
              false,
            );

            setActiveShift(
              undefined,
            );

            setCloseShiftApproval(null);
          }}
        />
      )}

      {showCloseShiftApproval &&
        currentOperator && (
        <PosManagerApprovalDialog
          actor={currentOperator}
          actionPermissionKey="pos.register.close"
          actionLabel="סגירת קופה"
          onApproved={(approval) => {
            setCloseShiftApproval(approval);
            setShowCloseShiftApproval(false);

            requestCashDrawerOpen(
              "closing_count",
            );

            setShowCloseShift(true);
          }}
          onCancel={() => {
            setShowCloseShiftApproval(false);
            setCloseShiftApproval(null);
          }}
        />
      )}

      {showCashMovementApproval &&
        currentOperator && (
        <PosManagerApprovalDialog
          actor={currentOperator}
          actionPermissionKey="pos.cash_movement"
          actionLabel="הפקדה / משיכה"
          onApproved={(approval) => {
            setCashMovementApproval(
              approval,
            );

            setShowCashMovementApproval(
              false,
            );

            setShowCashMovement(
              true,
            );
          }}
          onCancel={() => {
            setShowCashMovementApproval(
              false,
            );

            setCashMovementApproval(
              null,
            );
          }}
        />
      )}

      {showCashMovement &&
        activeShift &&
        currentOperator && (
        <CashMovementDialog
          shift={
            activeShift
          }
          currentOperator={
            currentOperator
          }
          approval={
            cashMovementApproval
          }
          onClose={() => {
            setShowCashMovement(
              false,
            );

            setCashMovementApproval(
              null,
            );
          }}
          onCompleted={() => {
            setShowCashMovement(
              false,
            );

            setCashMovementApproval(
              null,
            );
          }}
        />
      )}

      {showXReport && activeShift && (
        <ShiftXReportDialog
          shift={
            activeShift
          }
          onClose={() =>
            setShowXReport(
              false,
            )
          }
        />
      )}

      {showAttendance && (
        <AttendancePanel
          onClose={() =>
            setShowAttendance(
              false,
            )
          }
        />
      )}

      {completedZReport && (
        <ShiftZReportDialog
          report={
            completedZReport
          }
          onClose={() => {
            setCompletedZReport(
              null,
            );

            setShowOpenShiftDialog(
              true,
            );
          }}
        />
      )}

      {employeesHydrated &&
        showOpenShiftDialog &&
        !completedZReport && (
        <OpenRegisterShiftDialog
          onEnter={(shift, operator) => {
            setActiveShift(
              shift,
            );

            setCurrentOperator(
              operator,
            );

            setShowOpenShiftDialog(
              false,
            );
          }}
        />
      )}
      {showIdleWelcome && (
        <WelcomeScreen
          mode="idle"
          onContinue={() => {
            setShowIdleWelcome(
              false,
            );

            setActiveView(
              "sale",
            );

            setShowNavigation(
              false,
            );

            setShowAttendance(
              false,
            );

            setShowCashMovement(
              false,
            );

            setShowXReport(
              false,
            );

            setShowCloseShift(
              false,
            );
          }}
        />
      )}    </div>
  );
}

export default AppShell;
