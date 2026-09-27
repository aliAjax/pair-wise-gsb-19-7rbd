import { METRIC_MAP } from "./domain";

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO 时间 → 展示用 "MM-DD HH:mm" */
export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO 时间 → 分组用 "YYYY-MM-DD" */
export function fmtDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 现在时间 → datetime-local 输入框默认值 */
export function nowLocalInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local 输入值 → ISO */
export function inputToIso(value: string): string {
  return new Date(value).toISOString();
}

/** 按指标精度格式化检测值，并带上单位 */
export function fmtValue(metricId: string, value: number): string {
  const def = METRIC_MAP[metricId];
  const text = def ? value.toFixed(def.precision) : String(value);
  return def && def.unit ? `${text} ${def.unit}` : text;
}

export function metricLabel(metricId: string): string {
  return METRIC_MAP[metricId]?.label ?? metricId;
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
