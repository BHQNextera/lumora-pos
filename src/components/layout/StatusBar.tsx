import { invoke } from "@tauri-apps/api/core";
import { LastNexteraSyncStatus } from "./LastNexteraSyncStatus";
import {
  useEffect,
  useState,
} from "react";

import {
  getActiveRegisterProfile,
} from "../../config/ActiveBusinessConfiguration";

import {
  getRegisterLocalSettings,
  subscribeRegisterLocalSettings,
} from "../../config/RegisterLocalSettings";

import {
  getRegisterPrinterConfig,
  subscribeRegisterPrinterConfig,
} from "../../config/RegisterPrinterConfig";

import {
  isRuntimeInitialized,
} from "../../runtime/RuntimeBootstrap";

import type {
  RegisterShift,
} from "../../models/shift/RegisterShift";

import type {
  Employee,
} from "../../models/employee/Employee";

type SystemStatusTone =
  | "ready"
  | "warning"
  | "unavailable";

type SystemStatus = {
  id: string;
  label: string;
  detail: string;
  icon: string;
  tone: SystemStatusTone;
  title: string;
};

// INTERNET_REACHABILITY_V1
async function probeInternetReachability():
Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    navigator.onLine === false
  ) {
    return false;
  }

  try {
    return await invoke<boolean>(
      "check_internet_reachability",
    );
  }
  catch {
    // Browser-only development fallback.
    return typeof navigator === "undefined"
      ? false
      : navigator.onLine;
  }
}
type StatusBarProps = {
  activeShift?: RegisterShift;
  currentOperator?: Employee | null;
};

function StatusBar({
  activeShift,
  currentOperator,
}: StatusBarProps) {
  const [
    isOnline,
    setIsOnline,
  ] = useState(
    typeof navigator === "undefined"
      ? true
      : navigator.onLine,
  );

  const [
    configurationRevision,
    setConfigurationRevision,
  ] = useState(0);

  useEffect(() => {
    const updateOnlineStatus = () => {
      void probeInternetReachability()
        .then(setIsOnline);
    };

    window.addEventListener(
      "online",
      updateOnlineStatus,
    );

    window.addEventListener(
      "offline",
      updateOnlineStatus,
    );

    void updateOnlineStatus();

    const internetProbeIntervalId =
      window.setInterval(
        updateOnlineStatus,
        10000,
      );

    const unsubscribePrinter =
      subscribeRegisterPrinterConfig(
        () => {
          setConfigurationRevision(
            (current) =>
              current + 1,
          );
        },
      );

    const unsubscribeLocal =
      subscribeRegisterLocalSettings(
        () => {
          setConfigurationRevision(
            (current) =>
              current + 1,
          );
        },
      );

    return () => {
      window.removeEventListener(
        "online",
        updateOnlineStatus,
      );

      window.removeEventListener(
        "offline",
        updateOnlineStatus,
      );

      window.clearInterval(
        internetProbeIntervalId,
      );

      unsubscribePrinter();
      unsubscribeLocal();
    };
  }, []);

  void configurationRevision;

  const offlineReady =
    isRuntimeInitialized();

  const printerConfig =
    getRegisterPrinterConfig();

  const registerSettings =
    getRegisterLocalSettings(
      getActiveRegisterProfile(),
    );

  const printerPaperLabel =
    printerConfig.paperFormat ===
      "thermal57"
      ? "57 מ״מ"
      : "80 מ״מ";

  const statuses:
    SystemStatus[] = [
    {
      id: "network",
      label: "אינטרנט",
      detail:
        isOnline
          ? "מחובר"
          : "מנותק",
      icon: "◉",
      tone:
        isOnline
          ? "ready"
          : "warning",
      title:
        isOnline
          ? "חיבור האינטרנט זמין."
          : "אין חיבור לאינטרנט; הקופה ממשיכה לעבוד מקומית.",
    },
    {
      id: "offline",
      label: "Offline",
      detail:
        offlineReady
          ? "מוכן"
          : "לא מוכן",
      icon: "◆",
      tone:
        offlineReady
          ? "ready"
          : "unavailable",
      title:
        offlineReady
          ? "נתוני הקופה המקומיים נטענו והקופה מוכנה לעבודה ללא אינטרנט."
          : "טעינת נתוני הקופה המקומיים טרם הושלמה.",
    },
    {
      id: "printer",
      label: "מדפסת",
      detail:
        printerPaperLabel,
      icon: "▣",
      tone: "ready",
      title:
        `הוגדרה מדפסת ${printerPaperLabel}; החיווי מציג תצורה ולא בדיקת תקשורת פיזית.`,
    },
    {
      id: "terminal",
      label: "מסופון",
      detail:
        registerSettings
          .paymentTerminalEnabled
          ? "פעיל"
          : "כבוי",
      icon: "▤",
      tone:
        registerSettings
          .paymentTerminalEnabled
          ? "ready"
          : "warning",
      title:
        registerSettings
          .paymentTerminalEnabled
          ? "המסופון הוגדר כפעיל; החיווי אינו בדיקת תקשורת פיזית."
          : "המסופון אינו פעיל בהגדרות הקופה.",
    },
    {
      id: "drawer",
      label: "מגירה",
      detail: "הדמיה",
      icon: "▱",
      tone: "warning",
      title:
        "המגירה פועלת כרגע דרך מתאם הדמיה, ללא חיבור לחומרה.",
    },
  ];

  return (
    <footer
      className="pos-status-bar"
      aria-label="מצב מערכת"
    >
      <div className="pos-status-bar__operations">
        <div className="pos-status-bar__operation">
          <span>קופה</span>

          <strong>
            {
              registerSettings
                .registerCode ||
              activeShift
                ?.registerCode ||
              "—"
            }
          </strong>
        </div>

        <span
          className="pos-status-bar__separator"
          aria-hidden="true"
        />

        <div className="pos-status-bar__operation">
          <span>סניף</span>

          <strong>
            {
              registerSettings
                .branchCode ||
              activeShift
                ?.storeCode ||
              "—"
            }
          </strong>
        </div>

        <span
          className="pos-status-bar__separator"
          aria-hidden="true"
        />

        <div className="pos-status-bar__operation">
          <span>משמרת</span>

          <strong>
            {
              activeShift
                ? "פתוחה"
                : "סגורה"
            }
          </strong>
        </div>

        <span
          className="pos-status-bar__separator"
          aria-hidden="true"
        />

        <div className="pos-status-bar__operation">
          <span>קופאי</span>

          <strong>
            {
              currentOperator?.name ??
              "—"
            }
          </strong>
        </div>

        {activeShift && (
          <>
            <span
              className="pos-status-bar__separator"
              aria-hidden="true"
            />

            <div className="pos-status-bar__operation">
              <span>נפתחה</span>

              <strong>
                {
                  new Date(
                    activeShift
                      .openedAt,
                  ).toLocaleTimeString(
                    "he-IL",
                    {
                      hour:
                        "2-digit",
                      minute:
                        "2-digit",
                    },
                  )
                }
              </strong>
            </div>
          </>
        )}
      </div>

      <div className="pos-status-bar__right">
        <div className="pos-status-bar__items">
          <LastNexteraSyncStatus />
          {statuses.map(
            (status) => (
              <div
                className="pos-status-bar__item"
                key={status.id}
                title={status.title}
                data-tone={status.tone}
              >
                <span
                  className={`pos-status-bar__indicator pos-status-bar__indicator--${status.tone}`}
                  aria-hidden="true"
                />

                <span
                  className="pos-status-bar__icon"
                  aria-hidden="true"
                >
                  {status.icon}
                </span>

                <span>
                  {status.label}
                </span>

                <strong className="pos-status-bar__detail">
                  {status.detail}
                </strong>
              </div>
            ),
          )}
        </div>
      </div>
    </footer>
  );
}

export default StatusBar;
