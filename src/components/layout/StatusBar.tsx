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

function StatusBar() {
  return (
    <footer className="pos-status-bar" aria-label="מצב מערכת">
      <div className="pos-status-bar__operations">
        <div className="pos-status-bar__operation"><span>קופה</span><strong>02</strong></div>
        <span className="pos-status-bar__separator" aria-hidden="true" />
        <div className="pos-status-bar__operation"><span>משמרת</span><strong>בוקר</strong></div>
        <span className="pos-status-bar__separator" aria-hidden="true" />
        <div className="pos-status-bar__operation"><span>קופאי</span><strong>שי בל</strong></div>
        <span className="pos-status-bar__separator" aria-hidden="true" />
        <div className="pos-status-bar__operation"><span>שעה</span><strong>20:31</strong></div>
        <span className="pos-status-bar__date">06.08.2026</span>
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
