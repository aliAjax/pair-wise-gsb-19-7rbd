import type { LedgerState } from "./types";
import { buildSeedState } from "./seed";

const STORAGE_KEY = "hxwl-05-ledger-v1";
const OPERATOR_KEY = "hxwl-05-operator";

function isValidState(raw: unknown): raw is LedgerState {
  if (!raw || typeof raw !== "object") return false;
  const s = raw as Partial<LedgerState>;
  return (
    Array.isArray(s.tanks) &&
    Array.isArray(s.tests) &&
    Array.isArray(s.changes) &&
    Array.isArray(s.anomalies)
  );
}

/** 首次进入时写入示例数据，之后一律从本地台账读取 */
export function loadState(): LedgerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isValidState(parsed)) return parsed;
    }
  } catch {
    // 数据损坏时回退到示例数据
  }
  const seed = buildSeedState();
  saveState(seed);
  return seed;
}

export function saveState(state: LedgerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadOperator(): string {
  return localStorage.getItem(OPERATOR_KEY) ?? "";
}

export function saveOperator(name: string): void {
  localStorage.setItem(OPERATOR_KEY, name);
}

export function exportState(state: LedgerState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `水质台账备份-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
