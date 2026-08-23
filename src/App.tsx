import {
    useState,
} from "react";

import WelcomeScreen from "./components/welcome/WelcomeScreen";
import AppShell from "./layouts/AppShell";

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

    return <AppShell />;
}

export default App;