import {
  pullAndApplyNexteraCatalog,
  type NexteraCatalogSyncResult,
} from "./NexteraCatalogSync";

export const NEXTERA_SYNC_APPLIED_EVENT =
  "lumora:nextera-sync-applied";

let inFlight:
  Promise<NexteraCatalogSyncResult> | null =
    null;

export function requestNexteraSync():
Promise<NexteraCatalogSyncResult> {
  if (inFlight) {
    return inFlight;
  }

  const current =
    pullAndApplyNexteraCatalog();

  inFlight =
    current;

  void current
    .then(
      () => {
        if (
          typeof window !== "undefined"
        ) {
          window.dispatchEvent(
            new Event(
              NEXTERA_SYNC_APPLIED_EVENT,
            ),
          );
        }
      },
      () => undefined,
    )
    .finally(
      () => {
        if (inFlight === current) {
          inFlight = null;
        }
      },
    );

  return current;
}