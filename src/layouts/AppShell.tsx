import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import StatusBar from "../components/layout/StatusBar";
import SalePage from "../pages/sale/SalePage";

function AppShell() {
  return (
    <div className="pos-app-shell">
      <Sidebar />

      <div className="pos-app-shell__main" dir="rtl">
        <Header />

        <main className="pos-app-shell__workspace">
          <SalePage />
        </main>

        <StatusBar />
      </div>
    </div>
  );
}

export default AppShell;
