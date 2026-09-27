import {
  activeAlertFor,
  daysAgo,
  fmtRange,
  fmtTime,
  fmtValue,
  isOutOfRange,
  lastWaterChange,
  latestTest,
  measuredKeys,
} from "../ledger";
import { AlertEpisode, Ledger, PARAM_MAP, Tank } from "../types";

interface Props {
  ledger: Ledger;
  alerts: AlertEpisode[];
  onNewTest: (tankId: string) => void;
  onNewWater: (tankId: string) => void;
  onShowHistory: (tankId: string) => void;
}

function TankCard({ ledger, tank, alert, onNewTest, onNewWater, onShowHistory }: {
  ledger: Ledger;
  tank: Tank;
  alert: AlertEpisode | null;
  onNewTest: (tankId: string) => void;
  onNewWater: (tankId: string) => void;
  onShowHistory: (tankId: string) => void;
}) {
  const latest = latestTest(ledger, tank.id);
  const lastWater = lastWaterChange(ledger, tank.id);
  const alertItems = alert ? Object.entries(alert.items) : [];

  const status = alert ? "danger" : latest ? "ok" : "none";
  const statusText = alert ? `待处理 ${alertItems.length} 项` : latest ? "正常" : "暂无检测";

  return (
    <article className={`tank-card status-border-${status}`}>
      <header className="tank-card-head">
        <div>
          <h3>{tank.name}</h3>
          <span className="kind-chip">{tank.kind}</span>
        </div>
        <span className={`status-pill status-pill-${status}`}>{statusText}</span>
      </header>

      {latest ? (
        <div className="tank-section">
          <p className="section-label">最新检测 · {fmtTime(latest.time)}（{daysAgo(latest.time)}）</p>
          <div className="value-chips">
            {measuredKeys(latest.values).map((k) => {
              const v = latest.values[k] as number;
              const out = isOutOfRange(v, tank.ranges[k]);
              return (
                <span key={k} className={`value-chip${out ? " chip-out" : ""}`} title={`安全范围 ${fmtRange(tank.ranges[k], k)}`}>
                  {PARAM_MAP[k].label} {fmtValue(k, v)}
                </span>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="empty-hint">还没有检测记录，先登记一次检测。</p>
      )}

      {alert && (
        <div className="alert-box">
          <p className="alert-title">待处理提醒 · 始于 {fmtTime(alert.openedAt)}</p>
          <ul>
            {alertItems.map(([key, item]) => (
              <li key={key}>
                <strong>{PARAM_MAP[key as keyof typeof PARAM_MAP].label}</strong>
                <span>
                  最近 {fmtValue(key as keyof typeof PARAM_MAP, item.lastValue)}
                  （范围 {fmtRange(tank.ranges[key as keyof typeof PARAM_MAP], key as keyof typeof PARAM_MAP)}）
                </span>
                <em>自 {fmtTime(item.since)} 越界</em>
              </li>
            ))}
          </ul>
          <p className="alert-note">全部项目复测回范围后，提醒自动解除。</p>
        </div>
      )}

      <div className="tank-section water-line">
        <p className="section-label">上次换水</p>
        {lastWater ? (
          <p className="water-text">
            {fmtTime(lastWater.time)}（{daysAgo(lastWater.time)}） · {lastWater.amountLiters} L
            {lastWater.percent !== null ? `（约 ${lastWater.percent}%）` : ""}
          </p>
        ) : (
          <p className="empty-hint">暂无换水记录</p>
        )}
      </div>

      <footer className="tank-actions">
        <button className="primary-action" onClick={() => onNewTest(tank.id)}>登记检测</button>
        <button onClick={() => onNewWater(tank.id)}>登记换水</button>
        <button onClick={() => onShowHistory(tank.id)}>查看台账</button>
      </footer>
    </article>
  );
}

export default function Dashboard({ ledger, alerts, onNewTest, onNewWater, onShowHistory }: Props) {
  const activeCount = alerts.filter((a) => a.resolvedAt === null).length;
  return (
    <section>
      <div className="board-summary">
        <p>
          共 {ledger.tanks.length} 只鱼缸 ·
          {activeCount > 0 ? ` ${activeCount} 只有待处理异常` : " 全部正常"}
        </p>
      </div>
      <div className="tank-grid">
        {ledger.tanks.map((tank) => (
          <TankCard
            key={tank.id}
            ledger={ledger}
            tank={tank}
            alert={activeAlertFor(alerts, tank.id)}
            onNewTest={onNewTest}
            onNewWater={onNewWater}
            onShowHistory={onShowHistory}
          />
        ))}
      </div>
    </section>
  );
}
