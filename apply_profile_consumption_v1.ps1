$ErrorActionPreference = "Stop"

Set-Location "C:\PROJECT\lumora-pos"

$utf8 = New-Object System.Text.UTF8Encoding($false)

# ============================================================
# 1. FULL REPLACE Sidebar.tsx
# ============================================================

$path = ".\src\components\layout\Sidebar.tsx"

$content = @'
import {
  getActiveBusinessOperatingProfile,
} from "../../config/ActiveBusinessConfiguration";
import type {
  AppView,
} from "../../layouts/AppShell";

type SidebarProps = {
  activeView: AppView;
  onNavigate: (
    view: AppView,
  ) => void;
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
      isVisible: true,
    },
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
        part
          .charAt(0)
          .toUpperCase(),
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
          (
            item,
          ) => {
            const isActive =
              item.view ===
              activeView;

            return (
              <button
                key={
                  item.id
                }
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
                disabled={
                  !item.view
                }
                onClick={() => {
                  if (
                    item.view
                  ) {
                    onNavigate(
                      item.view,
                    );
                  }
                }}
              >
                <span
                  className="pos-sidebar__item-icon"
                  aria-hidden="true"
                >
                  {
                    item.icon
                  }
                </span>

                <span>
                  {
                    item.label
                  }
                </span>
              </button>
            );
          },
        )}
      </nav>

      <div className="pos-sidebar__footer">
        <button
          type="button"
          className="pos-sidebar__drawer-button"
        >
          <span
            aria-hidden="true"
          >
            ▱
          </span>
          פתיחת מגירה
        </button>

        <div className="pos-sidebar__shift-status">
          <span
            aria-hidden="true"
          />
          משמרת פתוחה
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
'@

[IO.File]::WriteAllText(
    $path,
    $content,
    $utf8
)

Write-Host "REPLACED $path"

# ============================================================
# 2. PATCH SalePage.tsx TO CONSUME ACTIVE PROFILE
# ============================================================

$path = ".\src\pages\sale\SalePage.tsx"
$text = Get-Content $path -Raw -Encoding UTF8

$oldImport = 'import { posCapabilities } from "../../config/posCapabilities";'
$newImport = @'
import {
    getActiveBusinessOperatingProfile,
} from "../../config/ActiveBusinessConfiguration";
'@

if (-not $text.Contains($oldImport)) {
    throw "SalePage posCapabilities import anchor not found"
}

$text = $text.Replace(
    $oldImport,
    $newImport
)

$componentAnchor = @'
function SalePage({
    incomingReturnLines = [],
    onReturnLinesConsumed,
}: SalePageProps) {
    const { products } = useCatalog();
'@

$componentReplacement = @'
function SalePage({
    incomingReturnLines = [],
    onReturnLinesConsumed,
}: SalePageProps) {
    const activeProfile =
        getActiveBusinessOperatingProfile();

    const posCapabilities =
        activeProfile.pos;

    const { products } = useCatalog();
'@

if (-not $text.Contains($componentAnchor)) {
    throw "SalePage component anchor not found"
}

$text = $text.Replace(
    $componentAnchor,
    $componentReplacement
)

[IO.File]::WriteAllText(
    $path,
    $text,
    $utf8
)

Write-Host "UPDATED $path"

# ============================================================
# 3. VERIFY
# ============================================================

Write-Host "`n=== PROFILE CONSUMPTION CHECK ==="

$sidebarCheck =
    Get-Content `
        ".\src\components\layout\Sidebar.tsx" `
        -Raw `
        -Encoding UTF8

$saleCheck =
    Get-Content `
        ".\src\pages\sale\SalePage.tsx" `
        -Raw `
        -Encoding UTF8

if ($sidebarCheck -match '>Coffee Time<') {
    throw "Sidebar still contains hard-coded Coffee Time"
}

if ($sidebarCheck -match '>סניף רחובות<') {
    throw "Sidebar still contains hard-coded branch"
}

if ($saleCheck -match 'from "../../config/posCapabilities"') {
    throw "SalePage still imports global posCapabilities"
}

if ($saleCheck -notmatch 'getActiveBusinessOperatingProfile') {
    throw "SalePage active profile connection missing"
}

Write-Host "SIDEBAR IS PROFILE-DRIVEN"
Write-Host "SALE PAGE CAPABILITIES ARE PROFILE-DRIVEN"

# ============================================================
# 4. TYPECHECK + BUILD
# ============================================================

Write-Host "`n=== TYPECHECK ==="

npx tsc -b --pretty false

if ($LASTEXITCODE -ne 0) {
    throw "TYPECHECK FAILED"
}

Write-Host "`n=== BUILD ==="

npm run build

if ($LASTEXITCODE -ne 0) {
    throw "BUILD FAILED"
}

Write-Host "`nPROFILE CONSUMPTION V1 CONNECTED"
