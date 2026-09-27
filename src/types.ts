export type ParamKey = "ph" | "ammonia" | "nitrite" | "nitrate" | "temperature";

export interface ParamDef {
  key: ParamKey;
  label: string;
  unit: string;
  step: string;
}

export const PARAMS: ParamDef[] = [
  { key: "ph", label: "pH", unit: "", step: "0.1" },
  { key: "ammonia", label: "氨氮", unit: "mg/L", step: "0.01" },
  { key: "nitrite", label: "亚硝酸盐", unit: "mg/L", step: "0.01" },
  { key: "nitrate", label: "硝酸盐", unit: "mg/L", step: "0.5" },
  { key: "temperature", label: "温度", unit: "℃", step: "0.1" },
];

export const PARAM_MAP = Object.fromEntries(PARAMS.map((p) => [p.key, p])) as Record<ParamKey, ParamDef>;

export interface Range {
  min: number;
  max: number;
}

export type Ranges = Record<ParamKey, Range>;

export interface Tank {
  id: string;
  name: string;
  kind: string;
  note: string;
  ranges: Ranges;
  createdAt: string;
}

export interface TestRecord {
  id: string;
  tankId: string;
  time: string; // ISO
  values: Partial<Record<ParamKey, number>>;
  note: string;
}

export interface WaterChange {
  id: string;
  tankId: string;
  time: string; // ISO
  amountLiters: number;
  percent: number | null;
  note: string;
}

/** 台账持久化的事实数据：鱼缸、检测、换水。提醒由检测记录推导，不单独存储。 */
export interface Ledger {
  tanks: Tank[];
  tests: TestRecord[];
  waterChanges: WaterChange[];
}

export interface AlertItem {
  since: string; // 首次越界时间
  lastValue: number;
  lastTime: string;
}

/** 一段“待处理提醒”生命周期：从首次越界开始，到全部越界项回到范围内结束。 */
export interface AlertEpisode {
  id: string;
  tankId: string;
  openedAt: string;
  resolvedAt: string | null;
  items: Partial<Record<ParamKey, AlertItem>>;
}

export const TANK_KINDS = ["草缸", "海缸", "三湖缸", "繁殖缸", "其他"];
