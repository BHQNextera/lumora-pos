import type {
  RegisterShift,
} from "../../models/shift/RegisterShift";
type ConnectionStatus = {
  id: string;
  label: string;
  icon: string;
  connected: boolean;
};

const statuses: ConnectionStatus[] = [
  { id: "network", label: "מחובר", icon: "◉", connected: true },
  { id: "printer", label: "מדפסת", icon: "▣", connected: true },
  { id: "terminal", label: "מסופון", icon: "▤", connected: true },
  { id: "drawer", label: "מגירה", icon: "▱", connected: true },
];

type StatusBarProps = {
  activeShift?: RegisterShift;
};

function StatusBar({
  activeShift,
}: StatusBarProps) {
  return (
    <footer className="pos-status-bar" aria-label="מצב מערכת">
      <div className="pos-status-bar__operations">
        <div className="pos-status-bar__operation">
          <span>קופה</span>
          <strong>
            {
              activeShift?.registerCode ??
              "—"
            }
          </strong>
        </div>

        <span className="pos-status-bar__separator" aria-hidden="true" />

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

        <span className="pos-status-bar__separator" aria-hidden="true" />

        <div className="pos-status-bar__operation">
          <span>קופאי</span>
          <strong>
            {
              activeShift
                ?.openedBy
                .employeeName ??
              "—"
            }
          </strong>
        </div>

        {activeShift && (
          <>
            <span className="pos-status-bar__separator" aria-hidden="true" />

            <div className="pos-status-bar__operation">
              <span>נפתחה</span>
              <strong>
                {
                  new Date(
                    activeShift.openedAt,
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
          {statuses.map((status) => (
            <div className="pos-status-bar__item" key={status.id}>
              <span className={`pos-status-bar__indicator ${status.connected ? "pos-status-bar__indicator--connected" : "pos-status-bar__indicator--disconnected"}`} />
              <span className="pos-status-bar__icon" aria-hidden="true">{status.icon}</span>
              <span>{status.label}</span>
            </div>
          ))}
        </div>

        <button type="button" className="pos-status-bar__lock">נעילת קופה</button>
      </div>
    </footer>
  );
}

export default StatusBar;
