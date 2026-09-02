import {
  useState,
} from "react";

import {
  requestManualNexteraSync,
} from "../../integrations/nextera/NexteraSyncCoordinator";

type SyncState =
  | "idle"
  | "syncing"
  | "success"
  | "error";

export function ManualNexteraSyncAction() {
  const [
    state,
    setState,
  ] = useState<SyncState>(
    "idle",
  );

  async function handleSync() {
    if (state === "syncing") {
      return;
    }

    setState("syncing");

    try {
      await requestManualNexteraSync();
      setState("success");
    }
    catch (error) {
      console.error(
        "Manual Nextera sync failed:",
        error,
      );

      setState("error");
    }
  }

  return (
    <button
      type="button"
      className="sale-page__more-actions-card"
      disabled={state === "syncing"}
      onClick={() =>
        void handleSync()
      }
    >
      <strong>
        {state === "syncing"
          ? "מסנכרן..."
          : state === "success"
            ? "הסנכרון הושלם ✓"
            : "סנכרן עכשיו"}
      </strong>

      <span>
        {state === "error"
          ? "הסנכרון נכשל. הקופה ממשיכה לעבוד מקומית."
          : "משוך עכשיו עדכונים מ־Nextera"}
      </span>
    </button>
  );
}