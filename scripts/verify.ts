import assert from "node:assert";
import type { Tank, WaterTest } from "../src/types";
import { applyTestToAnomalies, recomputeAnomalies } from "../src/domain";
import { buildSeedState } from "../src/seed";

const tank: Tank = {
  id: "t1",
  name: "测试缸",
  category: "其他",
  volumeLiters: 100,
  ranges: {
    ph: { min: 6.5, max: 7.5 },
    ammonia: { min: 0, max: 0.02 },
    nitrite: { min: 0, max: 0.1 },
  },
  createdAt: "2026-09-01T00:00:00Z",
};

function test(id: string, at: string, measured: Record<string, number>): WaterTest {
  return { id, tankId: "t1", at, measured, operator: "t" };
}

// 1) 一次检测两项越界 → 开出两条提醒
let anomalies: ReturnType<typeof applyTestToAnomalies>["opened"] = [];
let r = applyTestToAnomalies([], test("w1", "2026-09-27T08:00:00Z", { ph: 6.0, ammonia: 0.1 }), tank);
assert.strictEqual(r.opened.length, 2, "应新开 2 条异常");
assert.strictEqual(r.closed.length, 0);
anomalies = r.opened;

// 2) 换水登记本身不解除任何异常（语义层：换水不经过 applyTest，这里只确认重复越界不会重复开单）
r = applyTestToAnomalies(anomalies, test("w2", "2026-09-27T10:00:00Z", { ph: 6.1, ammonia: 0.1 }), tank);
assert.strictEqual(r.opened.length, 0, "仍越界的指标不能重复开提醒");
assert.strictEqual(r.closed.length, 0, "仍越界的指标不能解除");

// 3) 只有 pH 回到范围，氨氮不测 → 只解除 pH，氨氮继续挂着
r = applyTestToAnomalies(anomalies, test("w3", "2026-09-27T12:00:00Z", { ph: 7.0 }), tank);
assert.strictEqual(r.closed.length, 1, "只应解除 1 条");
assert.strictEqual(r.closed[0].metric, "ph");
assert.strictEqual(r.closed[0].closedBy, "w3");
assert.strictEqual(r.closed[0].closedValue, 7.0);

const stillOpen = anomalies.filter((a) => !r.closed.some((c) => c.id === a.id));
assert.strictEqual(stillOpen.length, 1);
assert.strictEqual(stillOpen[0].metric, "ammonia", "氨氮未复测，必须继续挂起");

// 4) 氨氮复测仍越界 → 不解除
r = applyTestToAnomalies(stillOpen, test("w4", "2026-09-27T14:00:00Z", { ammonia: 0.05 }), tank);
assert.strictEqual(r.closed.length, 0);

// 5) 氨氮复测回范围 → 解除
r = applyTestToAnomalies(stillOpen, test("w5", "2026-09-27T16:00:00Z", { ammonia: 0.01 }), tank);
assert.strictEqual(r.closed.length, 1);
assert.strictEqual(r.closed[0].metric, "ammonia");

// 6) 下限方向也能识别
r = applyTestToAnomalies([], test("w6", "2026-09-27T18:00:00Z", { ph: 5.0 }), tank);
assert.strictEqual(r.opened[0].openedDirection, "low");

// 7) 种子数据推导：海缸B 硝酸盐先开后关（已解除）；繁殖缸C 亚硝酸盐当前挂起
const seed = buildSeedState();
const derived = recomputeAnomalies({ tanks: seed.tanks, tests: seed.tests });
const open = derived.filter((a) => !a.closedAt);
assert.strictEqual(open.length, 1, "种子数据当前应只有 1 条未解除异常");
assert.strictEqual(open[0].tankId, "tank-c");
assert.strictEqual(open[0].metric, "nitrite");
assert.strictEqual(open[0].openedValue, 0.18);

const closed = derived.filter((a) => a.closedAt);
assert.strictEqual(closed.length, 1);
assert.strictEqual(closed[0].tankId, "tank-b");
assert.strictEqual(closed[0].metric, "nitrate");
assert.strictEqual(closed[0].openedBy, "test-b1");
assert.strictEqual(closed[0].closedBy, "test-b2");

// 种子自带 anomalies 与重算结果一致
assert.deepStrictEqual(
  seed.anomalies.map((a) => [a.id, a.closedBy ?? null]).sort(),
  derived.map((a) => [a.id, a.closedBy ?? null]).sort(),
);

console.log("全部业务规则校验通过 ✓");
