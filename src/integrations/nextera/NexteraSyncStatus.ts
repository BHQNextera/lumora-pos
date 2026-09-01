const STORAGE_KEY = "lumora.nextera.last-successful-sync.v1";
const EVENT_NAME = "lumora:nextera-sync-success";

export function getLastSuccessfulNexteraSyncAt(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value && !Number.isNaN(Date.parse(value)) ? value : null;
}

export function markSuccessfulNexteraSync(): void {
  if (typeof window === "undefined") return;
  const value = new Date().toISOString();
  window.localStorage.setItem(STORAGE_KEY, value);
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function subscribeLastSuccessfulNexteraSync(
  listener: (value: string | null) => void,
): () => void {
  const handler = () => listener(getLastSuccessfulNexteraSyncAt());
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
