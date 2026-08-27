/* LUMORA NUMERIC INPUT SAFETY V1.2 */

export const NUMERIC_INPUT_BLOCKED_EVENT =
  "lumora:numeric-input-blocked";

const BARCODE_MIN_DIGITS = 8;

export function isBarcodeLikeNumericInput(
  raw: string,
): boolean {
  const compact =
    raw.replace(/[\s,-]/g, "").trim();

  return new RegExp(
    `^\\d{${BARCODE_MIN_DIGITS},}$`,
  ).test(compact);
}

export function notifyNumericInputBlocked(
  message = "זוהתה סריקת ברקוד בשדה מספרי. הערך לא שונה.",
) {
  window.dispatchEvent(
    new CustomEvent(
      NUMERIC_INPUT_BLOCKED_EVENT,
      {
        detail: {
          message,
        },
      },
    ),
  );
}

export function rejectBarcodeLikeNumericInput(
  raw: string,
  message?: string,
): boolean {
  if (!isBarcodeLikeNumericInput(raw)) {
    return false;
  }

  notifyNumericInputBlocked(message);
  return true;
}
