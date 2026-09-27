import { useState } from "react";
import type { Anomaly, Tank, WaterChange, WaterTest } from "../types";
import {
  METRICS,
  changePercent,
  inRange,
  rangeText,
} from "../domain";
import { fmtDateTime, fmtValue, metricLabel } from "../format";
import { Modal } from "./TestForm";

interface LedgerViewProps {
  tank: Tank;
  tests: WaterTest[];
  changes: WaterChange[];
  anomalies: Anomaly[];
  onClose: () => void;
  onRecordTest: () => void;
  onRecordChange: () => void;
}

type Tab = "all" | "test" | "change" | "alert";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "test", label: "检测记录" },
  { id: "change", label: "换水记录" },
  { id: "alert", label: "异常提醒" },
];

export function LedgerView({
  tank,
  tests,
  changes,
  anomalies,
  onClose,
  onRecordTest,
  onRecordChange,
}: LedgerViewProps) {
  const [tab, setTab] = useState<Tab>("all");

  const tankTests = tests
    .filter((t) => t.tankId === tank.id)
    .sort((a, b) => b.at.localeCompare(a.at));
  const tankChanges = changes
    .filter((c) => c.tankId === tank.id)
    .sort((a, b) => b.at.localeCompare(a.at));
  const tankAnomalies = anomalies
    .filter((a) => a.tankId === tank.id)
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));

  const openedByTest = new Map<string, Anomaly[]>();
  const closedByTest = new Map<string, Anomaly[]>();
  for (const a of tankAnomalies) {
    const o = openedByTest.get(a.openedBy) ?? [];
    o.push(a);
    openedByTest.set(a.openedBy, o);
    if (a.closedBy) {
      const c = closedByTest.get(a.closedBy) ?? [];
      c.push(a);
      closedByTest.set(a.closedBy, c);
    }
  }

  return (
    <Modal title={`养护台账 · ${tank.name}`} onClose={onClose} wide>
      <div className="ledger-meta">
        <p>
          {tank.category} · 容积 {tank.volumeLiters}L{tank.note ? ` · ${tank.note}` : ""}
        </p>
        <div className="range-chips">
          {METRICS.map((m) => (
            <span key={m.id} className="range-chip">
              {m.label} {rangeText(tank.ranges[m.id])}
              {m.unit ? ` ${m.unit}` : ""}
            </span>
          ))}
        </div>
      </div>

      <div className="ledger-toolbar">
        <div className="tab-row">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "tab active" : "tab"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === "alert" && tankAnomalies.some((a) => !a.closedAt) && (
                <i className="tab-dot" />
              )}
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          <button onClick={onRecordTest}>登记检测</button>
          <button onClick={onRecordChange}>登记换水</button>
        </div>
      </div>

      {(tab === "all" || tab === "test") && tankTests.length === 0 && (
        <p className="empty-hint">还没有检测记录。</p>
      )}
      {(tab === "all" || tab === "change") && tankChanges.length === 0 && tab === "change" && (
        <p className="empty-hint">还没有换水记录。</p>
      )}

      <div className="ledger-list">
        {(tab === "all" || tab === "test") &&
          tankTests.map((test) => {
            const opened = openedByTest.get(test.id) ?? [];
            const closed = closedByTest.get(test.id) ?? [];
            return (
              <article key={test.id} className="ledger-item">
                <div className="ledger-icon icon-test">检</div>
                <div className="ledger-body">
                  <header>
                    <strong>水质检测</strong>
                    <time>{fmtDateTime(test.at)}</time>
                    {test.operator && <span className="operator">{test.operator}</span>}
                  </header>
                  <div className="metric-cells">
                    {METRICS.map((m) => {
                      const value = test.measured[m.id];
                      if (value === undefined) return null;
                      const safe = inRange(value, tank.ranges[m.id]);
                      return (
                        <span key={m.id} className={`mini-cell ${safe ? "cell-ok" : "cell-bad"}`}>
                          {m.label} <em>{fmtValue(m.id, value)}</em>
                        </span>
                      );
                    })}
                  </div>
                  {test.note && <p className="ledger-note">{test.note}</p>}
                  {opened.map((a) => (
                    <p key={"o" + a.id} className="event-line event-open">
                      ⚠ {metricLabel(a.metric)} 越界（{fmtValue(a.metric, a.openedValue)}
                      {a.openedDirection === "high" ? "，高于上限" : "，低于下限"}）→ 已生成待处理提醒
                    </p>
                  ))}
                  {closed.map((a) => (
                    <p key={"c" + a.id} className="event-line event-close">
                      ✓ {metricLabel(a.metric)} 复测 {a.closedValue !== undefined ? fmtValue(a.metric, a.closedValue) : ""}
                      回到安全范围 → 提醒解除
                    </p>
                  ))}
                </div>
              </article>
            );
          })}

        {(tab === "all" || tab === "change") &&
          tankChanges.map((change) => (
            <article key={change.id} className="ledger-item">
              <div className="ledger-icon icon-change">水</div>
              <div className="ledger-body">
                <header>
                  <strong>换水 {change.liters}L</strong>
                  <time>{fmtDateTime(change.at)}</time>
                  {change.operator && <span className="operator">{change.operator}</span>}
                </header>
                <p className="ledger-note">
                  约占缸体容积 {changePercent(tank, change.liters)}%{change.note ? ` · ${change.note}` : ""}
                </p>
              </div>
            </article>
          ))}

        {tab === "alert" &&
          (tankAnomalies.length === 0 ? (
            <p className="empty-hint">这只缸从未出现过越界。</p>
          ) : (
            tankAnomalies.map((a) => (
              <article key={a.id} className={`ledger-item anomaly-card ${a.closedAt ? "resolved" : "open"}`}>
                <div className={`ledger-icon ${a.closedAt ? "icon-resolved" : "icon-alert"}`}>
                  {a.closedAt ? "✓" : "!"}
                </div>
                <div className="ledger-body">
                  <header>
                    <strong>{metricLabel(a.metric)} 越界</strong>
                    <span className={`status-pill ${a.closedAt ? "pill-ok" : "pill-danger"}`}>
                      {a.closedAt ? "已解除" : "待处理"}
                    </span>
                  </header>
                  <p className="ledger-note">
                    {fmtDateTime(a.openedAt)} 检测值 {fmtValue(a.metric, a.openedValue)}
                    {a.openedDirection === "high" ? " 超出上限" : " 低于下限"}（安全 {rangeText(tank.ranges[a.metric])}）
                  </p>
                  {a.closedAt && (
                    <p className="event-line event-close">
                      {fmtDateTime(a.closedAt)} 复测{" "}
                      {a.closedValue !== undefined ? fmtValue(a.metric, a.closedValue) : ""}
                      回到安全范围，提醒解除
                    </p>
                  )}
                </div>
              </article>
            ))
          ))}
      </div>
    </Modal>
  );
}
