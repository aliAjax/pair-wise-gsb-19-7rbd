import type { LedgerState, Tank, WaterChange, WaterTest } from "./types";
import { recomputeAnomalies } from "./domain";

// 示例数据沿用店里现有的三张水质卡，异常由检测记录按规则推导，保证和真实使用一致

const tanks: Tank[] = [
  {
    id: "tank-a",
    name: "草缸A",
    category: "草缸",
    volumeLiters: 200,
    ranges: {
      ph: { min: 6.5, max: 7.5 },
      ammonia: { min: 0, max: 0.02 },
      nitrite: { min: 0, max: 0.1 },
      nitrate: { min: 0, max: 40 },
      hardness: { min: 4, max: 12 },
      temp: { min: 22, max: 28 },
    },
    note: "门口展示缸，周末例行换水",
    createdAt: "2026-09-20T09:00:00+08:00",
  },
  {
    id: "tank-b",
    name: "海缸B",
    category: "海缸",
    volumeLiters: 300,
    ranges: {
      ph: { min: 7.8, max: 8.5 },
      ammonia: { min: 0, max: 0.02 },
      nitrite: { min: 0, max: 0.1 },
      nitrate: { min: 0, max: 10 },
      hardness: { min: 8, max: 12 },
      temp: { min: 24, max: 27 },
    },
    note: "钙硬度偏低需复测",
    createdAt: "2026-09-20T09:00:00+08:00",
  },
  {
    id: "tank-c",
    name: "繁殖缸C",
    category: "繁殖缸",
    volumeLiters: 60,
    ranges: {
      ph: { min: 6.8, max: 7.4 },
      ammonia: { min: 0, max: 0.02 },
      nitrite: { min: 0, max: 0.05 },
      nitrate: { min: 0, max: 20 },
      hardness: { min: 4, max: 8 },
      temp: { min: 25, max: 28 },
    },
    note: "鱼苗期，指标容忍度低",
    createdAt: "2026-09-20T09:00:00+08:00",
  },
];

const tests: WaterTest[] = [
  {
    id: "test-a1",
    tankId: "tank-a",
    at: "2026-09-25T09:30:00+08:00",
    measured: { ph: 6.8, ammonia: 0.01, nitrite: 0.02, nitrate: 18, hardness: 6, temp: 25 },
    operator: "阿杰",
    note: "例行晨检，计划周末换水",
  },
  {
    id: "test-b1",
    tankId: "tank-b",
    at: "2026-09-23T10:00:00+08:00",
    measured: { ph: 8.1, ammonia: 0.01, nitrite: 0.02, nitrate: 16, hardness: 9, temp: 25.5 },
    operator: "小林",
    note: "硝酸盐偏高，安排换水",
  },
  {
    id: "test-b2",
    tankId: "tank-b",
    at: "2026-09-24T10:00:00+08:00",
    measured: { ph: 8.2, ammonia: 0.01, nitrite: 0.02, nitrate: 8, hardness: 9, temp: 25.5 },
    operator: "阿杰",
    note: "换水后复测，硝酸盐回到范围",
  },
  {
    id: "test-c1",
    tankId: "tank-c",
    at: "2026-09-26T08:40:00+08:00",
    measured: { ph: 7.2, ammonia: 0.01, nitrite: 0.02, nitrate: 12, hardness: 5, temp: 26 },
    operator: "店长",
    note: "例行晨检",
  },
  {
    id: "test-c2",
    tankId: "tank-c",
    at: "2026-09-27T08:50:00+08:00",
    measured: { ph: 7.1, ammonia: 0.02, nitrite: 0.18, nitrate: 14, hardness: 5, temp: 26 },
    operator: "店长",
    note: "亚硝酸盐升高，停止投喂",
  },
];

const changes: WaterChange[] = [
  {
    id: "change-a1",
    tankId: "tank-a",
    at: "2026-09-25T09:45:00+08:00",
    liters: 60,
    operator: "阿杰",
    note: "例行换水 30%",
  },
  {
    id: "change-b1",
    tankId: "tank-b",
    at: "2026-09-23T10:20:00+08:00",
    liters: 90,
    operator: "小林",
    note: "硝酸盐偏高，针对性换水",
  },
  {
    id: "change-c1",
    tankId: "tank-c",
    at: "2026-09-27T09:05:00+08:00",
    liters: 20,
    operator: "店长",
    note: "亚硝酸盐升高，紧急换水并停喂",
  },
];

export function buildSeedState(): LedgerState {
  return {
    version: 1,
    tanks,
    tests,
    changes,
    anomalies: recomputeAnomalies({ tanks, tests }),
  };
}
