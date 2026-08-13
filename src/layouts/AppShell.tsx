import {
  useEffect,
  useRef,
  useState,
} from "react";

import Sidebar from "../components/layout/Sidebar";
import StatusBar from "../components/layout/StatusBar";
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
  | "gift-cards";

type ScannedTransaction = {
  sale: Sale;
  scanId: number;
};

function AppShell() {
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

  return (
    <div className="pos-app-shell">
      <Sidebar
        activeView={
          activeView
        }
        onNavigate={
          setActiveView
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
        </main>

        <StatusBar />
      </div>
    </div>
  );
}

export default AppShell;