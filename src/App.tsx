import { useMemo, useState } from "react";
import "./styles.css";
import type { Anomaly, LedgerState, MetricRange, Tank } from "./types";
import {
  applyTestToAnomalies,
  openAnomalies,
} from "./domain";
import { exportState, loadOperator, loadState, saveOperator, saveState } from "./storage";
import { fmtDateTime, fmtValue, metricLabel, uid } from "./format";
import { Dashboard } from "./components/Dashboard";
import { TestForm, type TestFormData } from "./components/TestForm";
import { ChangeForm, type ChangeFormData } from "./components/ChangeForm";
import { LedgerView } from "./components/LedgerView";
import { TankSettings, type TankDraft } from "./components/TankSettings";

type Modal =
  | { type: "test"; tankId: string; returnTo?: "ledger" }
  | { type: "change"; tankId: string; returnTo?: "ledger" }
  | { type: "ledger"; tankId: string }
  | { type: "settings" };

function App() {
  const [state, setState] = useState<LedgerState>(() => loadState());
  const [modal, setModal] = useState<Modal | null>(null);
  const [operator, setOperator] = useState(() => loadOperator());

  const tankMap = useMemo(() => new Map(state.tanks.map((t) => [t.id, t])), [state.tanks]);
  const allOpen = useMemo(() => openAnomalies(state.anomalies), [state.anomalies]);
  const openByTank = useMemo(() => {
    const map = new Map<string, Anomaly[]>();
    for (const a of allOpen) {
      const list = map.get(a.tankId) ?? [];
      list.push(a);
      map.set(a.tankId, list);
    }
    return map;
  }, [allOpen]);

  function commit(next: LedgerState) {
    setState(next);
    saveState(next);
  }

  function rememberOperator(name: string) {
    const trimmed = name.trim();
    if (trimmed && trimmed !== operator) {
      setOperator(trimmed);
      saveOperator(trimmed);
    }
  }

  function handleAddTest(tankId: string, data: TestFormData) {
    const tank = tankMap.get(tankId);
    if (!tank) return { opened: [], closed: [] };
    rememberOperator(data.operator);

    const test = {
      id: uid("test"),
      tankId,
      at: data.at,
      measured: data.measured,
      operator: data.operator.trim(),
      note: data.note || undefined,
    };
    const { opened, closed } = applyTestToAnomalies(state.anomalies, test, tank);

    let anomalies = state.anomalies;
    if (closed.length) {
      const closedMap = new Map(closed.map((a) => [a.id, a]));
      anomalies = anomalies.map((a) => closedMap.get(a.id) ?? a);
    }
    anomalies = anomalies.concat(opened);

    commit({ ...state, tests: state.tests.concat(test), anomalies });
    return { opened, closed };
  }

  function handleAddChange(tankId: string, data: ChangeFormData) {
    rememberOperator(data.operator);
    const change = {
      id: uid("change"),
      tankId,
      at: data.at,
      liters: data.liters,
      operator: data.operator.trim(),
      note: data.note || undefined,
    };
    commit({ ...state, changes: state.changes.concat(change) });
    if (modal?.type === "change") {
      setModal(modal.returnTo === "ledger" ? { type: "ledger", tankId } : null);
    }
  }

  function handleCreateTank(draft: TankDraft) {
    const tank: Tank = {
      id: uid("tank"),
      name: draft.name,
      category: draft.category,
      volumeLiters: draft.volumeLiters,
      ranges: draft.ranges,
      note: draft.note || undefined,
      createdAt: new Date().toISOString(),
    };
    commit({ ...state, tanks: state.tanks.concat(tank) });
  }

  function handleUpdateRanges(tankId: string, ranges: Record<string, MetricRange>) {
    commit({
      ...state,
      tanks: state.tanks.map((t) => (t.id === tankId ? { ...t, ranges } : t)),
    });
  }

  const modalTank =
    modal && (modal.type === "test" || modal.type === "change" || modal.type === "ledger")
      ? tankMap.get(modal.tankId)
      : undefined;

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-05 · 换班可追溯的水质养护台账</p>
          <h1>水族箱水质监测台账</h1>
          <p className="subtitle">
            每只鱼缸独立安全范围，检测越界自动挂起待处理提醒；换水逐次登记水量与时间；
            只有同一指标复测回到范围，对应提醒才解除。看板显示最新状态，全部历史长期保存、随时可查。
          </p>
        </div>
        <div className="stack-card">
          <label className="operator-field">
            <span>当班登记人</span>
            <input
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              onBlur={() => saveOperator(operator.trim())}
              placeholder="填写姓名，换班时更新"
            />
          </label>
          <div className="hero-actions">
            <button onClick={() => setModal({ type: "settings" })}>鱼缸与安全范围</button>
            <button onClick={() => exportState(state)}>导出备份</button>
          </div>
        </div>
      </section>

      {allOpen.length > 0 && (
        <section className="alert-banner" onClick={() => setModal({ type: "ledger", tankId: allOpen[0].tankId })}>
          <strong>
            {openByTank.size} 只缸、{allOpen.length} 项异常待处理
          </strong>
          <ul>
            {allOpen.map((a) => (
              <li key={a.id}>
                {tankMap.get(a.tankId)?.name} · {metricLabel(a.metric)}{" "}
                {fmtValue(a.metric, a.openedValue)}
                {a.openedDirection === "high" ? " 超上限" : " 低于下限"} · 自 {fmtDateTime(a.openedAt)} 起
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="board-head">
        <h2>鱼缸看板</h2>
        <p>状态取每只缸最新一次检测；点击「台账记录」可查全部历史检测、换水与异常处置。</p>
      </section>

      <Dashboard
        tanks={state.tanks}
        tests={state.tests}
        changes={state.changes}
        anomalies={state.anomalies}
        onRecordTest={(tankId) => setModal({ type: "test", tankId })}
        onRecordChange={(tankId) => setModal({ type: "change", tankId })}
        onViewLedger={(tankId) => setModal({ type: "ledger", tankId })}
      />

      {modal?.type === "test" && modalTank && (
        <TestForm
          tank={modalTank}
          defaultOperator={operator}
          onClose={() =>
            setModal(modal.returnTo === "ledger" ? { type: "ledger", tankId: modal.tankId } : null)
          }
          onSubmit={(data) => handleAddTest(modal.tankId, data)}
        />
      )}

      {modal?.type === "change" && modalTank && (
        <ChangeForm
          tank={modalTank}
          defaultOperator={operator}
          onClose={() =>
            setModal(modal.returnTo === "ledger" ? { type: "ledger", tankId: modal.tankId } : null)
          }
          onSubmit={(data) => handleAddChange(modal.tankId, data)}
        />
      )}

      {modal?.type === "ledger" && modalTank && (
        <LedgerView
          tank={modalTank}
          tests={state.tests}
          changes={state.changes}
          anomalies={state.anomalies}
          onClose={() => setModal(null)}
          onRecordTest={() => setModal({ type: "test", tankId: modalTank.id, returnTo: "ledger" })}
          onRecordChange={() => setModal({ type: "change", tankId: modalTank.id, returnTo: "ledger" })}
        />
      )}

      {modal?.type === "settings" && (
        <TankSettings
          tanks={state.tanks}
          onClose={() => setModal(null)}
          onCreateTank={handleCreateTank}
          onUpdateRanges={handleUpdateRanges}
        />
      )}
    </main>
  );
}

export default App;
