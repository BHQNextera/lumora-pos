/* LUMORA NUMERIC INPUT SAFETY V1.2 */

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  NUMERIC_INPUT_BLOCKED_EVENT,
  isBarcodeLikeNumericInput,
} from "../../utils/numericInputSafety";

import "./numeric-input-shield.css";

const SCANNER_MAX_INTERVAL_MS = 80;
const SCANNER_MIN_DIGITS = 8;
const SCANNER_BLOCK_RELEASE_MS = 450;
const NOTICE_DURATION_MS = 3600;

type BurstState = {
  input: HTMLInputElement | null;
  baseline: string;
  buffer: string;
  lastAt: number;
  blockedUntil: number;
};

type BlockedDetail = {
  message?: string;
};

function isProtectedNumericInput(
  target: EventTarget | null,
): target is HTMLInputElement {
  if (!(target instanceof HTMLInputElement)) {
    return false;
  }

  if (
    target.dataset.lumoraNumericScan ===
    "allow"
  ) {
    return false;
  }

  return (
    target.type === "number" ||
    Boolean(
      target.dataset.lumoraNumericSafe,
    )
  );
}

function restoreInputValue(
  input: HTMLInputElement,
  value: string,
) {
  const descriptor =
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    );

  if (descriptor?.set) {
    descriptor.set.call(
      input,
      value,
    );
  } else {
    input.value = value;
  }

  input.dispatchEvent(
    new Event("input", {
      bubbles: true,
    }),
  );

  window.requestAnimationFrame(() => {
    try {
      input.focus();

      if (
        input.type === "text" ||
        input.type === "search" ||
        input.type === "tel" ||
        input.type === "url" ||
        input.type === "password"
      ) {
        input.select();
      }
    } catch {
      // No-op.
    }
  });
}

function NumericInputShield() {
  const [notice, setNotice] =
    useState<string | null>(null);

  const noticeTimerRef =
    useRef<number | null>(null);

  const baselineRef =
    useRef(
      new WeakMap<
        HTMLInputElement,
        string
      >(),
    );

  const pasteCandidateRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const burstRef =
    useRef<BurstState>({
      input: null,
      baseline: "",
      buffer: "",
      lastAt: 0,
      blockedUntil: 0,
    });

  useEffect(() => {
    const showNotice = (
      message =
        "זוהתה סריקת ברקוד בשדה מספרי. הערך לא שונה.",
    ) => {
      setNotice(message);

      if (
        noticeTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          noticeTimerRef.current,
        );
      }

      noticeTimerRef.current =
        window.setTimeout(() => {
          setNotice(null);
          noticeTimerRef.current = null;
        }, NOTICE_DURATION_MS);
    };

    const onExternalBlocked = (
      event: Event,
    ) => {
      const detail =
        (
          event as CustomEvent<
            BlockedDetail
          >
        ).detail;

      showNotice(
        detail?.message,
      );
    };

    const resetBurst = () => {
      burstRef.current = {
        input: null,
        baseline: "",
        buffer: "",
        lastAt: 0,
        blockedUntil: 0,
      };
    };

    const blockEvent = (
      event: KeyboardEvent,
    ) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const onFocusIn = (
      event: FocusEvent,
    ) => {
      if (
        !isProtectedNumericInput(
          event.target,
        )
      ) {
        return;
      }

      baselineRef.current.set(
        event.target,
        event.target.value,
      );
    };

    const onBeforeInput = (
      event: InputEvent,
    ) => {
      if (
        !isProtectedNumericInput(
          event.target,
        )
      ) {
        return;
      }

      const input =
        event.target;

      baselineRef.current.set(
        input,
        input.value,
      );

      if (
        event.inputType ===
        "insertFromPaste"
      ) {
        pasteCandidateRef.current =
          input;

        if (
          event.data &&
          isBarcodeLikeNumericInput(
            event.data,
          )
        ) {
          event.preventDefault();
          event.stopPropagation();
          pasteCandidateRef.current =
            null;
          showNotice();
        }
      }
    };

    const onInput = (
      event: Event,
    ) => {
      if (
        !isProtectedNumericInput(
          event.target,
        )
      ) {
        return;
      }

      const input =
        event.target;

      if (
        pasteCandidateRef.current ===
          input &&
        isBarcodeLikeNumericInput(
          input.value,
        )
      ) {
        const baseline =
          baselineRef.current.get(
            input,
          ) ?? "";

        pasteCandidateRef.current =
          null;

        restoreInputValue(
          input,
          baseline,
        );
        showNotice();
        return;
      }

      pasteCandidateRef.current =
        null;

      baselineRef.current.set(
        input,
        input.value,
      );
    };

    const onKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        !isProtectedNumericInput(
          event.target,
        )
      ) {
        resetBurst();
        return;
      }

      const input = event.target;
      const now = Date.now();
      const state = burstRef.current;

      if (
        state.input === input &&
        state.blockedUntil > now
      ) {
        if (
          /^\d$/.test(event.key) ||
          event.key === "Enter" ||
          event.key === "Tab"
        ) {
          blockEvent(event);
          return;
        }

        resetBurst();
        return;
      }

      if (!/^\d$/.test(event.key)) {
        if (
          event.key === "Enter" ||
          event.key === "Tab" ||
          event.key === "Escape"
        ) {
          resetBurst();
        }
        return;
      }

      const sameBurst =
        state.input === input &&
        now - state.lastAt <=
          SCANNER_MAX_INTERVAL_MS;

      const baseline =
        sameBurst
          ? state.baseline
          : input.value;

      const buffer =
        sameBurst
          ? state.buffer + event.key
          : event.key;

      burstRef.current = {
        input,
        baseline,
        buffer,
        lastAt: now,
        blockedUntil: 0,
      };

      if (
        buffer.length <
        SCANNER_MIN_DIGITS
      ) {
        return;
      }

      blockEvent(event);

      burstRef.current = {
        input,
        baseline,
        buffer,
        lastAt: now,
        blockedUntil:
          now +
          SCANNER_BLOCK_RELEASE_MS,
      };

      restoreInputValue(
        input,
        baseline,
      );
      showNotice();
    };

    const onPaste = (
      event: ClipboardEvent,
    ) => {
      if (
        !isProtectedNumericInput(
          event.target,
        )
      ) {
        return;
      }

      const input =
        event.target;

      baselineRef.current.set(
        input,
        input.value,
      );

      const pasted =
        event.clipboardData
          ?.getData("text") ?? "";

      if (
        pasted &&
        isBarcodeLikeNumericInput(
          pasted,
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
        pasteCandidateRef.current =
          null;
        showNotice();
        return;
      }

      pasteCandidateRef.current =
        input;
    };

    window.addEventListener(
      NUMERIC_INPUT_BLOCKED_EVENT,
      onExternalBlocked as EventListener,
    );

    document.addEventListener(
      "focusin",
      onFocusIn,
      true,
    );
    document.addEventListener(
      "beforeinput",
      onBeforeInput as EventListener,
      true,
    );
    document.addEventListener(
      "input",
      onInput,
      true,
    );
    document.addEventListener(
      "keydown",
      onKeyDown,
      true,
    );
    document.addEventListener(
      "paste",
      onPaste,
      true,
    );

    return () => {
      window.removeEventListener(
        NUMERIC_INPUT_BLOCKED_EVENT,
        onExternalBlocked as EventListener,
      );

      document.removeEventListener(
        "focusin",
        onFocusIn,
        true,
      );
      document.removeEventListener(
        "beforeinput",
        onBeforeInput as EventListener,
        true,
      );
      document.removeEventListener(
        "input",
        onInput,
        true,
      );
      document.removeEventListener(
        "keydown",
        onKeyDown,
        true,
      );
      document.removeEventListener(
        "paste",
        onPaste,
        true,
      );

      if (
        noticeTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          noticeTimerRef.current,
        );
      }
    };
  }, []);

  if (!notice) {
    return null;
  }

  return (
    <div
      className="lumora-numeric-input-shield"
      role="status"
      aria-live="assertive"
    >
      <span
        className="lumora-numeric-input-shield__mark"
        aria-hidden="true"
      >
        !
      </span>

      <span>{notice}</span>
    </div>
  );
}

export default NumericInputShield;
