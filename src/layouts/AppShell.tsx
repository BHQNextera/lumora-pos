import {
  useState,
} from "react";

import Sidebar from "../components/layout/Sidebar";
import StatusBar from "../components/layout/StatusBar";
import type {
  CartLine,
} from "../models/sale/CartLine";
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
