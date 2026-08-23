import {
  useEffect,
  useRef,
  useState,
} from "react";

import Sidebar from "../components/layout/Sidebar";
import WelcomeScreen from "../components/welcome/WelcomeScreen";
import AttendancePanel from "../components/attendance/AttendancePanel";
import CashMovementDialog from "../components/cash/CashMovementDialog";
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
  clockOutEmployee,
  getPresentAttendance,
} from "../models/attendance/AttendanceRepository";

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
import ProductManagementPage from "../pages/products/ProductManagementPage";
import PromotionManagementPage from "../pages/promotions/PromotionManagementPage";
import SalePage from "../pages/sale/SalePage";
import ReportsPage from "../pages/reports/ReportsPage";
import GiftCardManagementPage from "../pages/stored-value/GiftCardManagementPage";
import StoredValueManagementPage from "../pages/stored-value/StoredValueManagementPage";
import TransactionsPage from "../pages/transactions/TransactionsPage";

export type AppView =
  | "sale"
  | "transactions"
  | "products"
  | "customers"
  | "promotions"
  | "credits"
  | "gift-cards"
  | "reports";

type ScannedTransaction = {
  sale: Sale;
  scanId: number;
};

function AppShell() {
  const [
    activeShift,
    setActiveShift,
  ] =
    useState<RegisterShift | undefined>(
      () =>
        getActiveRegisterShift(),
    );

  const [
    showOpenShiftDialog,
    setShowOpenShiftDialog,
  ] =
    useState(true);

  const [
    activeView,
    setActiveView,
  ] =
    useState<AppView>(
      "sale",
    );
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
          setActiveView(view);
          setShowNavigation(false);
        }}
        activeShift={
          activeShift
        }
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
        onOpenCashMovement={() =>
          setShowCashMovement(
            true,
          )
        }
        onOpenXReport={() =>
          setShowXReport(
            true,
          )
        }
        onCloseRegisterShift={() => {
          requestCashDrawerOpen(
            "closing_count",
          );

          setShowCloseShift(
            true,
          );
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
            />
          )}

          {activeView ===
            "customers" && (
            <CustomerManagementPage />
          )}

          {activeView ===
            "products" && (
            <ProductManagementPage />
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
            <ReportsPage />
          )}
        </main>

        <StatusBar
          activeShift={
            activeShift
          }
        />
      </div>

      {showCloseShift && activeShift && (
        <CloseRegisterShiftDialog
          shift={
            activeShift
          }
          onClose={() =>
            setShowCloseShift(
              false,
            )
          }
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
                  activeShift.openedBy.employeeId,

                employeeName:
                  activeShift.openedBy.employeeName,

                closingCash:
                  closingCashDeclaration.total,

                closingCashDeclaration,
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
                clockOutEmployee(
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
          }}
        />
      )}

      {showCashMovement && activeShift && (
        <CashMovementDialog
          shift={
            activeShift
          }
          onClose={() =>
            setShowCashMovement(
              false,
            )
          }
          onCompleted={() => {
            setShowCashMovement(
              false,
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

      {showOpenShiftDialog && !completedZReport && (
        <OpenRegisterShiftDialog
          onEnter={(shift) => {
            setActiveShift(
              shift,
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