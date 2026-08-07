import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import PricingProvider from "./context/PricingProvider";

import "./theme/global.css";

createRoot(
  document.getElementById("root")!,
).render(
  <StrictMode>
    <PricingProvider>
      <App />
    </PricingProvider>
  </StrictMode>,
);