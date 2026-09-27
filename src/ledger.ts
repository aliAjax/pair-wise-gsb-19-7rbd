import {
  AlertEpisode,
  Ledger,
  PARAM_MAP,
  PARAMS,
  ParamKey,
  Range,
  Ranges,
  Tank,
  TestRecord,
  WaterChange,
} from "./types";

const STORAGE_KEY = "hxwl05-ledger-v1";

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isOutOfRange(value: number, range: Range): boolean {
  return value < range.min || value > range.max;
}

export function measuredKeys(values: Partial<Record<ParamKey, number>>): ParamKey[] {
  return PARAMS.map((p) => p.key).filter((k) => values[k] !== undefined && Number.isFinite(values[k] as number));
}

export function outOfRangeKeys(tank: Tank, values: Partial<Record<ParamKey, number>>): ParamKey[] {
  return measuredKeys(values).filter((k) => isOutOfRange(values[k] as number, tank.ranges[k]));
}

/**
 * 把一只缸的全部检测按时间重放，推导出提醒生命周期：
 * - 某次检测出现越界项 → 开启一段待处理提醒（或并入进行中的提醒）；
 * - 之后的检测中，某项回到范围内 → 只把这一项从提醒里移除，其余异常保留；
 * - 未复测的项目维持原状态；
 * - 所有越界项都回到范围内 → 这段提醒才算解除。
 */
export function buildAlertEpisodes(tank: Tank, tests: TestRecord[]): AlertEpisode[] {
  const sorted = tests
    .filter((t) => t.tankId === tank.id)
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));

  const episodes: AlertEpisode[] = [];
  let active: AlertEpisode | null = null;

  for (const rec of sorted) {
    const measured = measuredKeys(rec.values);
    const out = measured.filter((k) => isOutOfRange(rec.values[k] as number, tank.ranges[k]));

    if (!active && out.length > 0) {
      active = { id: `al-${rec.id}`, tankId: tank.id, openedAt: rec.time, resolvedAt: null, items: {} };
      episodes.push(active);
    }
    if (!active) continue;

    for (const k of measured) {
      if (out.includes(k)) {
        const prev = active.items[k];
        active.items[k] = {
          since: prev ? prev.since : rec.time,
          lastValue: rec.values[k] as number,
          lastTime: rec.time,
        };
      } else {
        delete active.items[k];
      }
    }

    if (Object.keys(active.items).length === 0) {
      active.resolvedAt = rec.time;
      active = null;
    }
  }

  return episodes;
}

export function buildAllAlerts(ledger: Ledger): AlertEpisode[] {
  return ledger.tanks.flatMap((tank) => buildAlertEpisodes(tank, ledger.tests));
}

export function activeAlertFor(alerts: AlertEpisode[], tankId: string): AlertEpisode | null {
  return alerts.find((a) => a.tankId === tankId && a.resolvedAt === null) ?? null;
}

export function latestTest(ledger: Ledger, tankId: string): TestRecord | null {
  const list = ledger.tests.filter((t) => t.tankId === tankId);
  if (list.length === 0) return null;
  return list.reduce((a, b) => (a.time >= b.time ? a : b));
}

export function lastWaterChange(ledger: Ledger, tankId: string): WaterChange | null {
  const list = ledger.waterChanges.filter((w) => w.tankId === tankId);
  if (list.length === 0) return null;
  return list.reduce((a, b) => (a.time >= b.time ? a : b));
}

// ---------- 展示格式化 ----------

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtValue(key: ParamKey, value: number): string {
  const unit = PARAM_MAP[key].unit;
  return `${value}${unit ? " " + unit : ""}`;
}

export function fmtRange(range: Range, key: ParamKey): string {
  const unit = PARAM_MAP[key].unit;
  return `${range.min} ~ ${range.max}${unit ? " " + unit : ""}`;
}

export function daysAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "今天";
  if (days === 1) return "昨天";
  return `${days} 天前`;
}

export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------- 持久化 ----------

export function loadLedger(): Ledger {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedLedger();
    const parsed = JSON.parse(raw) as Ledger;
    if (!Array.isArray(parsed.tanks) || !Array.isArray(parsed.tests) || !Array.isArray(parsed.waterChanges)) {
      return seedLedger();
    }
    return parsed;
  } catch {
    return seedLedger();
  }
}

export function saveLedger(ledger: Ledger): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
}

export function exportLedgerJson(ledger: Ledger): void {
  const blob = new Blob([JSON.stringify(ledger, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `水族台账-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- 示例数据 ----------

function isoDaysAgo(days: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function defaultRanges(): Ranges {
  return {
    ph: { min: 6.5, max: 7.5 },
    ammonia: { min: 0, max: 0.02 },
    nitrite: { min: 0, max: 0.1 },
    nitrate: { min: 0, max: 20 },
    temperature: { min: 22, max: 28 },
  };
}

export function seedLedger(): Ledger {
  const tanks: Tank[] = [
    {
      id: "tank-a",
      name: "草缸A",
      kind: "草缸",
      note: "进门左侧 120cm 草缸",
      ranges: {
        ph: { min: 6.4, max: 7.4 },
        ammonia: { min: 0, max: 0.02 },
        nitrite: { min: 0, max: 0.1 },
        nitrate: { min: 0, max: 20 },
        temperature: { min: 22, max: 26 },
      },
      createdAt: isoDaysAgo(30, 10),
    },
    {
      id: "tank-b",
      name: "海缸B",
      kind: "海缸",
      note: "珊瑚混养缸",
      ranges: {
        ph: { min: 8.0, max: 8.4 },
        ammonia: { min: 0, max: 0.01 },
        nitrite: { min: 0, max: 0.05 },
        nitrate: { min: 0, max: 10 },
        temperature: { min: 24, max: 27 },
      },
      createdAt: isoDaysAgo(30, 10),
    },
    {
      id: "tank-c",
      name: "繁殖缸C",
      kind: "繁殖缸",
      note: "后场繁殖区，幼鱼对亚硝酸盐敏感",
      ranges: {
        ph: { min: 6.8, max: 7.6 },
        ammonia: { min: 0, max: 0.02 },
        nitrite: { min: 0, max: 0.05 },
        nitrate: { min: 0, max: 15 },
        temperature: { min: 24, max: 28 },
      },
      createdAt: isoDaysAgo(30, 10),
    },
  ];

  const tests: TestRecord[] = [
    // 草缸A：一直正常
    {
      id: "t-a-1",
      tankId: "tank-a",
      time: isoDaysAgo(3, 9, 30),
      values: { ph: 6.8, ammonia: 0, nitrite: 0, nitrate: 18, temperature: 24.5 },
      note: "硝酸盐接近上限，计划周末换水30%",
    },
    {
      id: "t-a-2",
      tankId: "tank-a",
      time: isoDaysAgo(0, 9, 15),
      values: { ph: 6.9, ammonia: 0, nitrite: 0, nitrate: 9, temperature: 24.2 },
      note: "换水后复测，正常",
    },
    // 海缸B：硝酸盐越界，待处理中
    {
      id: "t-b-1",
      tankId: "tank-b",
      time: isoDaysAgo(2, 17, 40),
      values: { ph: 8.1, ammonia: 0, nitrite: 0, nitrate: 12, temperature: 25.8 },
      note: "硝酸盐偏高，需复测",
    },
    // 繁殖缸C：先有一段已解除的亚硝酸盐异常；新一轮异常中氨氮已恢复、亚硝酸盐仍越界
    {
      id: "t-c-1",
      tankId: "tank-c",
      time: isoDaysAgo(6, 10, 5),
      values: { ph: 7.2, ammonia: 0.01, nitrite: 0.3, nitrate: 8, temperature: 26 },
      note: "亚硝酸盐升高，停止投喂",
    },
    {
      id: "t-c-2",
      tankId: "tank-c",
      time: isoDaysAgo(4, 18, 20),
      values: { ph: 7.2, ammonia: 0, nitrite: 0.02, nitrate: 6, temperature: 25.6 },
      note: "换水40%后复测，已回范围",
    },
    {
      id: "t-c-3",
      tankId: "tank-c",
      time: isoDaysAgo(1, 9, 50),
      values: { ph: 7.3, ammonia: 0.05, nitrite: 0.4, nitrate: 10, temperature: 26.4 },
      note: "晨检：氨氮、亚硝酸盐同时越界",
    },
    {
      id: "t-c-4",
      tankId: "tank-c",
      time: isoDaysAgo(0, 8, 10),
      values: { ph: 7.2, ammonia: 0.01, nitrite: 0.35, nitrate: 9, temperature: 26.1 },
      note: "氨氮已恢复，亚硝酸盐仍高，继续停食观察",
    },
  ];

  const waterChanges: WaterChange[] = [
    { id: "w-a-1", tankId: "tank-a", time: isoDaysAgo(1, 16, 30), amountLiters: 60, percent: 30, note: "例行周末换水" },
    { id: "w-b-1", tankId: "tank-b", time: isoDaysAgo(4, 15, 0), amountLiters: 80, percent: 20, note: "" },
    { id: "w-c-1", tankId: "tank-c", time: isoDaysAgo(5, 11, 0), amountLiters: 20, percent: 40, note: "亚硝酸盐异常，大比例换水" },
  ];

  return { tanks, tests, waterChanges };
}
