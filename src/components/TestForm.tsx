import { FormEvent, useMemo, useState } from "react";
import { fmtRange, isOutOfRange, toLocalInputValue } from "../ledger";
import { PARAMS, ParamKey, Tank, TestRecord } from "../types";

interface Props {
  tanks: Tank[];
  tankId: string;
  onTankChange: (id: string) => void;
  onSubmit: (record: TestRecord) => void;
}

export default function TestForm({ tanks, tankId, onTankChange, onSubmit }: Props) {
  const [time, setTime] = useState(() => toLocalInputValue(new Date()));
  const [inputs, setInputs] = useState<Record<ParamKey, string>>({
    ph: "",
    ammonia: "",
    nitrite: "",
    nitrate: "",
    temperature: "",
  });
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const tank = tanks.find((t) => t.id === tankId) ?? tanks[0];

  const parsed = useMemo(() => {
    const values: Partial<Record<ParamKey, number>> = {};
    for (const p of PARAMS) {
      const raw = inputs[p.key].trim();
      if (raw === "") continue;
      const num = Number(raw);
      if (Number.isFinite(num)) values[p.key] = num;
    }
    return values;
  }, [inputs]);

  const filledCount = Object.keys(parsed).length;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tank) {
      setError("请先在“鱼缸与范围”里添加鱼缸");
      return;
    }
    if (filledCount === 0) {
      setError("至少填写一项检测值，未测的项目留空即可");
      return;
    }
    setError("");
    onSubmit({
      id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      tankId: tank.id,
      time: new Date(time).toISOString(),
      values: parsed,
      note: note.trim(),
    });
    setInputs({ ph: "", ammonia: "", nitrite: "", nitrate: "", temperature: "" });
    setNote("");
    setTime(toLocalInputValue(new Date()));
  }

  if (tanks.length === 0) {
    return <p className="empty-hint">还没有鱼缸，请先在“鱼缸与范围”页签添加。</p>;
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>
          <span>鱼缸</span>
          <select value={tank?.id ?? ""} onChange={(e) => onTankChange(e.target.value)}>
            {tanks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}（{t.kind}）</option>
            ))}
          </select>
        </label>
        <label>
          <span>检测时间</span>
          <input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} required />
        </label>
      </div>

      <div className="param-grid">
        {PARAMS.map((p) => {
          const raw = inputs[p.key];
          const num = raw.trim() === "" ? null : Number(raw);
          const out = tank && num !== null && Number.isFinite(num) ? isOutOfRange(num, tank.ranges[p.key]) : false;
          return (
            <label key={p.key} className={out ? "field-out" : ""}>
              <span>
                {p.label}{p.unit ? `（${p.unit}）` : ""}
                {tank && <em className="range-hint">安全范围 {fmtRange(tank.ranges[p.key], p.key)}</em>}
              </span>
              <input
                type="number"
                step={p.step}
                value={raw}
                placeholder="未测留空"
                onChange={(e) => setInputs((prev) => ({ ...prev, [p.key]: e.target.value }))}
              />
              {out && <b className="out-flag">越界，将记入待处理提醒</b>}
            </label>
          );
        })}
      </div>

      <label>
        <span>备注</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="如：换水后复测、停食观察…" />
      </label>

      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="primary-action">保存检测记录</button>
        <span className="form-hint">只填本次实际测过的项目；未测的项目维持原提醒状态。</span>
      </div>
    </form>
  );
}
