import {
  useEffect,
  useRef,
  useState,
} from "react";

import Sidebar from "../components/layout/Sidebar";
import AttendancePanel from "../components/attendance/AttendancePanel";
import ShiftXReportDialog from "../components/shift/ShiftXReportDialog";
import CloseRegisterShiftDialog from "../components/shift/CloseRegisterShiftDialog";
import OpenRegisterShiftDialog from "../components/shift/OpenRegisterShiftDialog";
import StatusBar from "../components/layout/StatusBar";
import {
  getActiveRegisterShift,
  closeRegisterShift,
} from "../models/shift/RegisterShiftRepository";
import type {
  RegisterShift,
} from "../models/shift/RegisterShift";
import {
  clockOutEmployee,
  getPresentAttendance,
} from "../models/attendance/AttendanceRepository";
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
    showXReport,
    setShowXReport,
  ] =
    useState(false);

  const [
    showCloseShift,
    setShowCloseShift,
  ] =
    useState(false);

  return (
    <div className="pos-app-shell">
      <Sidebar
        activeView={
          activeView
        }
        onNavigate={
          setActiveView
        }
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
        onOpenXReport={() =>
          setShowXReport(
            true,
          )
        }
        onCloseRegisterShift={() =>
          setShowCloseShift(
            true,
          )
        }
      />

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
          onConfirm={(closingCashDeclaration) => {
            const present =
              getPresentAttendance();

            present.forEach(
              (entry) => {
                clockOutEmployee(
                  entry.employeeId,
                );
              },
            );

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

            void closed;

            setShowCloseShift(
              false,
            );

            setActiveShift(
              undefined,
            );

            setShowOpenShiftDialog(
              true,
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

      {showOpenShiftDialog && (
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
      )}    </div>
  );
}

export default AppShell;