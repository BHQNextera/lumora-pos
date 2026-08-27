import {
  StrictMode,
} from "react";

import {
  createRoot,
} from "react-dom/client";

import App from "./App";

import LocaleProvider from "./i18n/LocaleProvider";

import PricingProvider from "./context/PricingProvider";
import CatalogProvider from "./context/CatalogProvider";

import {
  initializeRuntime,
} from "./runtime/RuntimeBootstrap";

import {
  registerRuntimeHydrators,
} from "./runtime/registerRuntimeHydrators";

import "./theme/global.css";

async function bootstrap() {
  /*
   * Registration happens before runtime initialization.
   * No POS UI is rendered until hydration completes.
   */
  registerRuntimeHydrators();

  await initializeRuntime();

  createRoot(
    document.getElementById("root")!,
  ).render(
    <StrictMode>
      <LocaleProvider>
        <CatalogProvider>
          <PricingProvider>
            <App />
          </PricingProvider>
        </CatalogProvider>
      </LocaleProvider>
    </StrictMode>,
  );
}

bootstrap().catch(
  (error) => {
    console.error(
      "LUMORA_RUNTIME_BOOT_FAILED",
      error,
    );

    const root =
      document.getElementById(
        "root",
      );

    if (root) {
      root.innerHTML = `
        <div
          dir="rtl"
          style="
            font-family: Arial, sans-serif;
            padding: 32px;
          "
        >
          <h2>
            Lumora לא הצליחה לעלות
          </h2>
          <p>
            אירעה שגיאה באתחול סביבת הקופה.
          </p>
          <p>
            יש להפעיל מחדש את האפליקציה.
          </p>
        </div>
      `;
    }
  },
);