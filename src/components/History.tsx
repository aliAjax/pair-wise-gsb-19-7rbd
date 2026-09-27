import { useMemo, useState } from "react";
import { fmtRange, fmtTime, fmtValue, isOutOfRange, measuredKeys } from "../ledger";
import { AlertEpisode, Ledger, PARAM_MAP, Tank } from "../types";

interface Props {
  ledger: Ledger;
  alerts: AlertEpisode[];
  tankFilter: string;
  onTankFilter: (id: string) => void;
}

type Row =
  | { kind: "test"; time: string; tank: Tank; record: Ledger["tests"][number] }
  | { kind: "water"; time: string; tank: Tank; record: Ledger["waterChanges"][number] }
  | { kind: "alert"; time: string; tank: Tank; episode: AlertEpisode };

const TYPE_LABEL = { test: "检测", water: "换水", alert: "提醒" } as const;

export default function History({ ledger, alerts, tankFilter, onTankFilter }: Props) {
  const [typeFilter, setTypeFilter] = useState<"all" | "test" | "water" | "alert">("all");

  const tankById = useMemo(() => new Map(ledger.tanks.map((t) => [t.id, t])), [ledger.tanks]);

  const rows = useMemo(() => {
    const list: Row[] = [];
    for (const t of ledger.tests) {
      const tank = tankById.get(t.tankId);
      if (tank) list.push({ kind: "test", time: t.time, tank, record: t });
    }
    for (const w of ledger.waterChanges) {
      const tank = tankById.get(w.tankId);
      if (tank) list.push({ kind: "water", time: w.time, tank, record: w });
    }
    for (const ep of alerts) {
      const tank = tankById.get(ep.tankId);
      if (tank) list.push({ kind: "alert", time: ep.openedAt, tank, episode: ep });
    }
    return list
      .filter((r) => tankFilter === "all" || r.tank.id === tankFilter)
      .filter((r) => typeFilter === "all" || r.kind === typeFilter)
      .sort((a, b) => b.time.localeCompare(a.time));
  }, [ledger, alerts, tankById, tankFilter, typeFilter]);

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>历史台账</h2>
          <p className="tank-note">全部检测、换水与提醒记录，长期保存可查。</p>
        </div>
        <div className="history-filters">
          <select value={tankFilter} onChange={(e) => onTankFilter(e.target.value)}>
            <option value="all">全部鱼缸</option>
            {ledger.tanks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}>
            <option value="all">全部类型</option>
            <option value="test">检测</option>
            <option value="water">换水</option>
            <option value="alert">提醒</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="empty-hint">没有符合条件的记录。</p>
      ) : (
        <div className="history-list">
          {rows.map((row) => (
            <article key={`${row.kind}-${row.kind === "alert" ? row.episode.id : row.record.id}`} className={`history-row row-${row.kind}`}>
              <span className={`row-tag tag-${row.kind}`}>{TYPE_LABEL[row.kind]}</span>
              <div className="row-body">
                <header>
                  <strong>{row.tank.name}</strong>
                  <time>{fmtTime(row.time)}</time>
                </header>
                {row.kind === "test" && (
                  <div className="row-detail">
                    <div className="value-chips">
                      {measuredKeys(row.record.values).map((k) => {
                        const v = row.record.values[k] as number;
                        const out = isOutOfRange(v, row.tank.ranges[k]);
                        return (
                          <span key={k} className={`value-chip${out ? " chip-out" : ""}`} title={`安全范围 ${fmtRange(row.tank.ranges[k], k)}`}>
                            {PARAM_MAP[k].label} {fmtValue(k, v)}
                          </span>
                        );
                      })}
                    </div>
                    {row.record.note && <p className="row-note">{row.record.note}</p>}
                  </div>
                )}
                {row.kind === "water" && (
                  <div className="row-detail">
                    <p>
                      换水 {row.record.amountLiters} L
                      {row.record.percent !== null ? `（约 ${row.record.percent}%）` : ""}
                    </p>
                    {row.record.note && <p className="row-note">{row.record.note}</p>}
                  </div>
                )}
                {row.kind === "alert" && (
                  <div className="row-detail">
                    <p>
                      {row.episode.resolvedAt
                        ? `已解除 · ${fmtTime(row.episode.resolvedAt)} 全部项目回到范围内`
                        : "待处理中 · 仍有项目越界"}
                    </p>
                    <div className="value-chips">
                      {Object.entries(row.episode.items).map(([key, item]) => (
                        <span key={key} className="value-chip chip-out">
                          {PARAM_MAP[key as keyof typeof PARAM_MAP].label} {fmtValue(key as keyof typeof PARAM_MAP, item.lastValue)}
                        </span>
                      ))}
                      {row.episode.resolvedAt && Object.keys(row.episode.items).length === 0 && (
                        <span className="value-chip">解除时全部正常</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
