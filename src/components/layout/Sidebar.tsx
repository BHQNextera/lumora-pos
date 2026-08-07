type SidebarItem = {
  id: string;
  label: string;
  icon: string;
};

const navigationItems: SidebarItem[] = [
  { id: "sale", label: "מכירה", icon: "▦" },
  { id: "payments", label: "תשלומים", icon: "▣" },
  { id: "transactions", label: "עסקאות", icon: "≡" },
  { id: "customers", label: "לקוחות", icon: "♙" },
  { id: "inventory", label: "מלאי", icon: "◇" },
  { id: "reports", label: "דוחות", icon: "▥" },
  { id: "settings", label: "הגדרות", icon: "⚙" },
];

function Sidebar() {
  return (
    <aside className="pos-sidebar" dir="rtl" aria-label="ניווט ראשי">
      <div className="pos-sidebar__business">
        <div className="pos-sidebar__logo" aria-hidden="true">
          CT
        </div>

        <div className="pos-sidebar__business-details">
          <strong>Coffee Time</strong>
          <span>סניף רחובות</span>
        </div>
      </div>

      <nav className="pos-sidebar__navigation">
        {navigationItems.map((item) => {
          const isActive = item.id === "sale";

          return (
            <button
              key={item.id}
              type="button"
              className={`pos-sidebar__item ${
                isActive ? "pos-sidebar__item--active" : ""
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="pos-sidebar__item-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pos-sidebar__footer">
        <button type="button" className="pos-sidebar__drawer-button">
          <span aria-hidden="true">▱</span>
          פתיחת מגירה
        </button>

        <div className="pos-sidebar__shift-status">
          <span aria-hidden="true" />
          משמרת פתוחה
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
