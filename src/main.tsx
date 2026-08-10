import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import PricingProvider from "./context/PricingProvider";
import CatalogProvider from "./context/CatalogProvider";

import "./theme/global.css";

createRoot(
  document.getElementById("root")!,
).render(
  <StrictMode>
    <CatalogProvider>
      <PricingProvider>
      <App />
    </PricingProvider>
    </CatalogProvider>
  </StrictMode>,
);