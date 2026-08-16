import {
  getActiveBusinessOperatingProfile,
} from "../../config/ActiveBusinessConfiguration";

import {
  requestCashDrawerOpen,
} from "../../models/drawer/CashDrawerService";
import type {
  AppView,
} from "../../layouts/AppShell";
import type {
  RegisterShift,
} from "../../models/shift/RegisterShift";

type SidebarProps = {
  activeView: AppView;

  onNavigate: (
    view: AppView,
  ) => void;

  activeShift?: RegisterShift;

  onOpenRegisterShift: () => void;
  onOpenAttendance: () => void;
  onOpenXReport: () => void;
  onCloseRegisterShift: () => void;
};

type SidebarItem = {
  id: string;
  label: string;
  icon: string;
  view?: AppView;
  isVisible?: boolean;
};

function Sidebar({
  activeView,
  onNavigate,
  activeShift,
  onOpenRegisterShift,
  onOpenAttendance,
  onOpenXReport,
  onCloseRegisterShift,
}: SidebarProps) {
  const profile =
    getActiveBusinessOperatingProfile();

  const businessName =
    profile.identity.tradingName ??
    profile.identity.businessName;

  const branchName =
    profile.identity.branchName;

  const navigationItems: SidebarItem[] = [
    {
      id: "sale",
      label: "מכירה",
      icon: "▦",
      view: "sale",
      isVisible: true,
    },
    {
      id: "payments",
      label: "תשלומים",
      icon: "▣",
      isVisible: true,
    },
    {
      id: "transactions",
      label: "עסקאות",
      icon: "≡",
      view: "transactions",
      isVisible: true,
    },
    {
      id: "customers",
      label: "לקוחות",
      icon: "♙",
      view: "customers",
      isVisible:
        profile.features.customerClub ||
        profile.dataOwnership.customers !== "local",
    },
    {
      id: "inventory",
      label: "מלאי",
      icon: "◇",
      view: "products",
      isVisible:
        profile.features.catalog,
    },
    {
      id: "credits",
      label: "זיכויים",
      icon: "₪",
      view: "credits",
      isVisible:
        profile.features.creditVouchers,
    },
    {
      id: "gift-cards",
      label: "Gift Cards",
      icon: "G",
      view: "gift-cards",
      isVisible:
        profile.features.giftCards,
    },
    {
      id: "reports",
      label: "דוחות",
      icon: "▥",
      view: "reports",},
    {
      id: "settings",
      label: "הגדרות",
      icon: "⚙",
      view: "promotions",
      isVisible:
        profile.features.promotions,
    },
  ];

  const visibleNavigationItems =
    navigationItems.filter(
      (item) =>
        item.isVisible !== false,
    );

  const logoText =
    businessName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase(),
      )
      .join("") || "L";

  return (
    <aside
      className="pos-sidebar"
      dir="rtl"
      aria-label="ניווט ראשי"
    >
      <div className="pos-sidebar__business">
        <div
          className="pos-sidebar__logo"
          aria-hidden="true"
        >
          {logoText}
        </div>

        <div className="pos-sidebar__business-details">
          <strong>
            {businessName}
          </strong>

          {branchName && (
            <span>
              {branchName}
            </span>
          )}
        </div>
      </div>

      <nav className="pos-sidebar__navigation">
        {visibleNavigationItems.map(
          (item) => {
            const isActive =
              item.view === activeView;

            return (
              <button
                key={item.id}
                type="button"
                className={`pos-sidebar__item ${
                  isActive
                    ? "pos-sidebar__item--active"
                    : ""
                }`}
                aria-current={
                  isActive
                    ? "page"
                    : undefined
                }
                disabled={!item.view}
                onClick={() => {
                  if (item.view) {
                    onNavigate(item.view);
                  }
                }}
              >
                <span
                  className="pos-sidebar__item-icon"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>

                <span>
                  {item.label}
                </span>
              </button>
            );
          },
        )}
      </nav>

      <div className="pos-sidebar__footer">
        {activeShift && (
          <>
            <button
              type="button"
              className="pos-sidebar__drawer-button"
              onClick={onOpenAttendance}
            >
              <span aria-hidden="true">
                ♙
              </span>
              נוכחות עובדים
            </button>

            <button
              type="button"
              className="pos-sidebar__drawer-button"
              onClick={onOpenXReport}
            >
              <span aria-hidden="true">
                X
              </span>
              דוח X
            </button>

            <button
              type="button"
              className="pos-sidebar__drawer-button"
              onClick={onCloseRegisterShift}
            >
              <span aria-hidden="true">
                Z
              </span>
              סגירת קופה
            </button>
          </>
        )}
        <button
          type="button"
          className="pos-sidebar__drawer-button"
          onClick={() => {
            requestCashDrawerOpen(
              "manual",
            );
          }}
        >
          <span aria-hidden="true">
            ▱
          </span>
          פתיחת מגירה
        </button>

        {activeShift ? (
          <div className="pos-sidebar__shift-status">
            <span aria-hidden="true" />
            משמרת פתוחה · {
              activeShift.openedBy.employeeName
            }
          </div>
        ) : (
          <button
            type="button"
            className="pos-sidebar__shift-status"
            onClick={
              onOpenRegisterShift
            }
          >
            <span aria-hidden="true" />
            פתיחת קופה
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;