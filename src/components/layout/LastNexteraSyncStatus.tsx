import { useEffect, useState } from "react";

import {
  getLastSuccessfulNexteraSyncAt,
  subscribeLastSuccessfulNexteraSync,
} from "../../integrations/nextera/NexteraSyncStatus";

const REPLICATOR_FRESH_MS = 15_000;

export function LastNexteraSyncStatus() {
  const [lastSync, setLastSync] = useState<string | null>(
    getLastSuccessfulNexteraSyncAt(),
  );

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const unsubscribe =
      subscribeLastSuccessfulNexteraSync((value) => {
        setLastSync(value);
        setNow(Date.now());
      });

    const intervalId = window.setInterval(
      () => setNow(Date.now()),
      1000,
    );

    return () => {
      unsubscribe();
      window.clearInterval(intervalId);
    };
  }, []);

  const lastSyncMs = lastSync ? Date.parse(lastSync) : Number.NaN;

  const replicatorReady =
    Number.isFinite(lastSyncMs) &&
    now - lastSyncMs <= REPLICATOR_FRESH_MS;

  const replicatorDetail =
    !lastSync
      ? "ממתין"
      : replicatorReady
        ? "מסונכרן"
        : "לא זמין";

  const replicatorTone =
    replicatorReady ? "ready" : "warning";

  const detail = lastSync
    ? new Date(lastSync).toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "טרם סונכרן";

  const syncTone = lastSync ? "ready" : "warning";

  return (
    <>
      <div
        className="pos-status-bar__item"
        data-tone={replicatorTone}
        title={replicatorReady
          ? "Nextera זמין והסנכרון פעיל."
          : "לא התקבל סנכרון מוצלח עדכני מ-Nextera."}
      >
        <span
          className={`pos-status-bar__indicator pos-status-bar__indicator--${replicatorTone}`}
        />
        <span className="pos-status-bar__icon">⇄</span>
        <span>Nextera</span>
        <strong className="pos-status-bar__detail">{replicatorDetail}</strong>
      </div>

      <div
        className="pos-status-bar__item"
        data-tone={syncTone}
        title={lastSync
          ? `סנכרון מוצלח אחרון מול Nextera: ${detail}`
          : "טרם בוצע סנכרון מוצלח מול Nextera."}
      >
        <span
          className={`pos-status-bar__indicator pos-status-bar__indicator--${syncTone}`}
        />
        <span className="pos-status-bar__icon">↻</span>
        <span>סנכרון אחרון</span>
        <strong className="pos-status-bar__detail">{detail}</strong>
      </div>
    </>
  );
}
