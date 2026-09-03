import {
  pullAndApplyNexteraCatalog,
  type NexteraCatalogSyncResult,
} from "./NexteraCatalogSync";

import {
  getEmployees,
} from "../../models/employee/EmployeeRepository";

import {
  syncLumoraEmployeeIdentitySnapshot,
} from "./EmployeeNexteraSync";

import {
  pullAndApplyNexteraCustomers,
} from "./CustomerNexteraSync";

import {
  flushLumoraNexteraOutboxToNexteraStrict,
} from "./LumoraNexteraSender";

export const NEXTERA_SYNC_APPLIED_EVENT =
  "lumora:nextera-sync-applied";

let inFlight:
  Promise<NexteraCatalogSyncResult> | null =
    null;

export async function requestManualNexteraSync():
Promise<NexteraCatalogSyncResult> {
  const employees =
    getEmployees();

  await syncLumoraEmployeeIdentitySnapshot(
    employees.map(
      (employee) => ({
        id: employee.id,
        name: employee.name,
        code: employee.code,
        isActive: employee.isActive,
        canSell:
          employee.roles.includes(
            "seller",
          ),
        roles: [
          ...employee.roles,
        ],
      }),
    ),
  );

  /*
   * Manual sync must perform a fresh pull after the employee
   * push. Reusing an older periodic in-flight pull can return
   * stale seller scopes even though the manual action reports
   * success.
   */
  const previousSync =
    inFlight;

  if (previousSync) {
    try {
      await previousSync;
    }
    catch {
      /*
       * A manual sync is also an explicit retry. Continue with
       * a fresh pull even when the older background pull failed.
       */
    }

    if (inFlight === previousSync) {
      inFlight = null;
    }
  }

  const result =
    await requestNexteraSync();

  /*
   * Dependency order matters:
   * 1. employee identities were pushed above,
   * 2. customer outbox/pull ran inside requestNexteraSync,
   * 3. only now flush commercial transactions.
   *
   * This gives seller/customer canonical identities the best
   * chance to exist before the sale reaches Nextera.
   */
  await flushLumoraNexteraOutboxToNexteraStrict();

  return result;
}

export function requestNexteraSync():
Promise<NexteraCatalogSyncResult> {
  if (inFlight) {
    return inFlight;
  }

  const current =
    (async () => {
      await pullAndApplyNexteraCustomers();

      return pullAndApplyNexteraCatalog();
    })();

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