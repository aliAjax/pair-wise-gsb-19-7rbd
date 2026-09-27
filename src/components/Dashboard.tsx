import type { Anomaly, Tank, WaterChange, WaterTest } from "../types";
import {
  METRICS,
  changePercent,
  inRange,
  latestChange,
  latestTest,
  openAnomalies,
  rangeText,
} from "../domain";
import { fmtDateTime, fmtValue, metricLabel } from "../format";

interface DashboardProps {
  tanks: Tank[];
  tests: WaterTest[];
  changes: WaterChange[];
  anomalies: Anomaly[];
  onRecordTest: (tankId: string) => void;
  onRecordChange: (tankId: string) => void;
  onViewLedger: (tankId: string) => void;
}

function statusOf(open: Anomaly[], test: WaterTest | undefined) {
  if (open.length > 0) return { cls: "danger", text: `异常 ${open.length} 项` };
  if (!test) return { cls: "none", text: "暂无检测" };
  return { cls: "ok", text: "正常" };
}

export function Dashboard({
  tanks,
  tests,
  changes,
  anomalies,
  onRecordTest,
  onRecordChange,
  onViewLedger,
}: DashboardProps) {
  return (
    <div className="board-grid">
      {tanks.map((tank) => {
        const test = latestTest(tests, tank.id);
        const change = latestChange(changes, tank.id);
        const open = openAnomalies(anomalies, tank.id);
        const status = statusOf(open, test);

        return (
          <article key={tank.id} className={`tank-card status-${status.cls}`}>
            <header className="tank-head">
              <div>
                <h3>{tank.name}</h3>
                <p className="tank-meta">
                  {tank.category} · {tank.volumeLiters}L
                </p>
              </div>
              <span className={`status-pill pill-${status.cls}`}>{status.text}</span>
            </header>

            {open.length > 0 && (
              <div className="alert-box">
                <p className="alert-title">待处理提醒</p>
                <ul>
                  {open.map((a) => (
                    <li key={a.id}>
                      <strong>{metricLabel(a.metric)}</strong>{" "}
                      {fmtValue(a.metric, a.openedValue)}
                      {a.openedDirection === "high" ? " 超出上限" : " 低于下限"}
                      <span className="alert-since">
                        {fmtDateTime(a.openedAt)} 起，等待复测回范围
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {test ? (
              <div className="latest-test">
                <p className="latest-title">
                  最新检测 · {fmtDateTime(test.at)}
                  {test.operator ? ` · ${test.operator}` : ""}
                </p>
                <div className="metric-cells">
                  {METRICS.map((m) => {
                    const value = test.measured[m.id];
                    if (value === undefined) {
                      return (
                        <div key={m.id} className="metric-cell cell-none">
                          <span>{m.label}</span>
                          <em>未测</em>
                        </div>
                      );
                    }
                    const safe = inRange(value, tank.ranges[m.id]);
                    return (
                      <div
                        key={m.id}
                        className={`metric-cell ${safe ? "cell-ok" : "cell-bad"}`}
                        title={`安全范围 ${rangeText(tank.ranges[m.id])} ${m.unit}`}
                      >
                        <span>{m.label}</span>
                        <em>{fmtValue(m.id, value)}</em>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="empty-hint">还没有检测记录，先登记一次检测。</p>
            )}

            <p className="change-line">
              {change
                ? `最近换水 ${fmtDateTime(change.at)} · ${change.liters}L（约${changePercent(tank, change.liters)}%）`
                : "暂无换水记录"}
            </p>

            <footer className="tank-actions">
              <button className="primary-action" onClick={() => onRecordTest(tank.id)}>
                登记检测
              </button>
              <button onClick={() => onRecordChange(tank.id)}>登记换水</button>
              <button className="link-btn" onClick={() => onViewLedger(tank.id)}>
                台账记录
              </button>
            </footer>
          </article>
        );
      })}
    </div>
  );
}
