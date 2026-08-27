/* LUMORA NUMERIC INPUT SAFETY V1.2 FIELD GUARDS */
import {
    useState,
} from "react";

import WelcomeScreen from "./components/welcome/WelcomeScreen";
import AppShell from "./layouts/AppShell";
import NumericInputShield from "./components/system/NumericInputShield";

function App() {
    const [
        welcomeOpen,
        setWelcomeOpen,
    ] =
        useState(true);

    if (welcomeOpen) {
        return (
            <WelcomeScreen
                onContinue={() =>
                    setWelcomeOpen(false)
                }
            />
        );
    }

    return (
    <>
      <NumericInputShield />
      <AppShell />
    </>
  );
}

export default App;