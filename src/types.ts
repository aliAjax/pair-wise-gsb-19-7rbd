// 台账领域模型：长期保存在浏览器 localStorage 中

export interface MetricRange {
  min: number;
  max: number;
}

export interface Tank {
  id: string;
  name: string;
  category: string;
  /** 各检测指标的安全范围，键为 MetricDef.id */
  ranges: Record<string, MetricRange>;
  /** 缸体容积，单位升，用于换算换水百分比 */
  volumeLiters: number;
  note?: string;
  createdAt: string;
}

/** 一次水质检测。measured 中没有的指标视为本次未检测，不参与异常解除 */
export interface WaterTest {
  id: string;
  tankId: string;
  at: string; // ISO 时间
  measured: Record<string, number>;
  operator: string;
  note?: string;
}

export interface WaterChange {
  id: string;
  tankId: string;
  at: string; // ISO 时间
  liters: number;
  operator: string;
  note?: string;
}

/**
 * 待处理提醒：按「缸 + 单项指标」逐条跟踪。
 * openedBy / closedBy 分别是触发与解除它的检测记录，
 * 因此某项单独恢复只会关闭自己的异常，清不掉同缸其他异常。
 */
export interface Anomaly {
  id: string; // `${openedBy}:${metric}`
  tankId: string;
  metric: string;
  openedAt: string;
  openedBy: string;
  openedValue: number;
  openedDirection: "low" | "high";
  closedAt?: string;
  closedBy?: string;
  closedValue?: number;
}

export interface LedgerState {
  version: 1;
  tanks: Tank[];
  tests: WaterTest[];
  changes: WaterChange[];
  anomalies: Anomaly[];
}
