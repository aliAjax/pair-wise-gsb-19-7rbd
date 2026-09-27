import type {
  Anomaly,
  MetricRange,
  Tank,
  WaterChange,
  WaterTest,
} from "./types";

export interface MetricDef {
  id: string;
  label: string;
  unit: string;
  step: string; // 输入框步长
  precision: number; // 展示保留小数位
}

// 店里日常检测的指标
export const METRICS: MetricDef[] = [
  { id: "ph", label: "pH", unit: "", step: "0.1", precision: 1 },
  { id: "ammonia", label: "氨氮", unit: "ppm", step: "0.01", precision: 2 },
  { id: "nitrite", label: "亚硝酸盐", unit: "ppm", step: "0.01", precision: 2 },
  { id: "nitrate", label: "硝酸盐", unit: "ppm", step: "1", precision: 0 },
  { id: "hardness", label: "硬度", unit: "dGH", step: "0.5", precision: 1 },
  { id: "temp", label: "温度", unit: "°C", step: "0.5", precision: 1 },
];

export const METRIC_MAP: Record<string, MetricDef> = Object.fromEntries(
  METRICS.map((m) => [m.id, m]),
);

export const TANK_CATEGORIES = ["草缸", "海缸", "三湖缸", "繁殖缸", "其他"];

// 新缸默认安全范围（淡水常见值）
export const DEFAULT_RANGES: Record<string, MetricRange> = {
  ph: { min: 6.5, max: 7.5 },
  ammonia: { min: 0, max: 0.02 },
  nitrite: { min: 0, max: 0.1 },
  nitrate: { min: 0, max: 40 },
  hardness: { min: 4, max: 12 },
  temp: { min: 22, max: 28 },
};

export function inRange(value: number, range: MetricRange | undefined): boolean {
  if (!range) return true;
  return value >= range.min && value <= range.max;
}

export function rangeText(range: MetricRange | undefined): string {
  if (!range) return "未设置";
  const fmt = (n: number) =>
    Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
  return `${fmt(range.min)} – ${fmt(range.max)}`;
}

/** 检测效果：本次检测产生了哪些新异常、解除了哪些旧异常 */
export interface TestEffect {
  opened: Anomaly[];
  closed: Anomaly[];
}

/**
 * 把一次新检测应用到某只缸当前的未处理提醒上。
 * 规则：
 * - 指标本次未检测（measured 中没有）→ 不动，任何旧异常继续挂着
 * - 越界且该指标没有待处理异常 → 新开一条提醒
 * - 回到范围且该指标有待处理异常 → 只解除这一条；同缸其他指标的异常不受影响
 */
export function applyTestToAnomalies(
  previous: Anomaly[],
  test: WaterTest,
  tank: Tank,
): TestEffect {
  const openFor = (metric: string) =>
    previous.find((a) => a.tankId === test.tankId && a.metric === metric && !a.closedAt);

  const opened: Anomaly[] = [];
  const closed: Anomaly[] = [];

  for (const metric of Object.keys(test.measured)) {
    const value = test.measured[metric];
    const range = tank.ranges[metric];
    if (!range || typeof value !== "number" || Number.isNaN(value)) continue;

    const open = openFor(metric);
    const safe = inRange(value, range);

    if (!safe && !open) {
      opened.push({
        id: `${test.id}:${metric}`,
        tankId: test.tankId,
        metric,
        openedAt: test.at,
        openedBy: test.id,
        openedValue: value,
        openedDirection: value < range.min ? "low" : "high",
      });
    } else if (safe && open) {
      closed.push({ ...open, closedAt: test.at, closedBy: test.id, closedValue: value });
    }
  }

  return { opened, closed };
}

/** 从全部检测记录重新推导异常（初始化种子数据 / 重置时使用） */
export function recomputeAnomalies(state: {
  tanks: Tank[];
  tests: WaterTest[];
}): Anomaly[] {
  const tankMap = new Map(state.tanks.map((t) => [t.id, t]));
  const byTank = new Map<string, WaterTest[]>();
  for (const test of state.tests) {
    const list = byTank.get(test.tankId) ?? [];
    list.push(test);
    byTank.set(test.tankId, list);
  }

  let anomalies: Anomaly[] = [];
  for (const [tankId, tests] of byTank) {
    const tank = tankMap.get(tankId);
    if (!tank) continue;
    let current: Anomaly[] = [];
    for (const test of [...tests].sort((a, b) => a.at.localeCompare(b.at))) {
      const { opened, closed } = applyTestToAnomalies(current, test, tank);
      if (closed.length) {
        const closedIds = new Set(closed.map((a) => a.id));
        current = current
          .filter((a) => !closedIds.has(a.id))
          .concat(closed.map((a) => ({ ...a })));
      }
      current = current.concat(opened);
    }
    anomalies = anomalies.concat(current);
  }
  return anomalies;
}

export function latestTest(tests: WaterTest[], tankId: string): WaterTest | undefined {
  return tests
    .filter((t) => t.tankId === tankId)
    .sort((a, b) => b.at.localeCompare(a.at))[0];
}

export function latestChange(
  changes: WaterChange[],
  tankId: string,
): WaterChange | undefined {
  return changes
    .filter((c) => c.tankId === tankId)
    .sort((a, b) => b.at.localeCompare(a.at))[0];
}

export function openAnomalies(
  anomalies: Anomaly[],
  tankId?: string,
): Anomaly[] {
  return anomalies
    .filter((a) => !a.closedAt && (tankId === undefined || a.tankId === tankId))
    .sort((a, b) => a.openedAt.localeCompare(b.openedAt));
}

/** 换水量占缸体容积的百分比 */
export function changePercent(tank: Tank, liters: number): number {
  if (!tank.volumeLiters) return 0;
  return Math.round((liters / tank.volumeLiters) * 100);
}
