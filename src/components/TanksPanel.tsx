import { FormEvent, useState } from "react";
import { defaultRanges } from "../ledger";
import { PARAMS, ParamKey, Ranges, Tank, TANK_KINDS } from "../types";

interface Props {
  tanks: Tank[];
  onAddTank: (tank: Tank) => void;
  onUpdateRanges: (tankId: string, ranges: Ranges) => void;
}

type RangeInputs = Record<ParamKey, { min: string; max: string }>;

function toInputs(ranges: Ranges): RangeInputs {
  const out = {} as RangeInputs;
  for (const p of PARAMS) {
    out[p.key] = { min: String(ranges[p.key].min), max: String(ranges[p.key].max) };
  }
  return out;
}

function RangeEditor({ tank, onUpdateRanges }: { tank: Tank; onUpdateRanges: Props["onUpdateRanges"] }) {
  const [inputs, setInputs] = useState<RangeInputs>(() => toInputs(tank.ranges));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function handleSave() {
    const next = {} as Ranges;
    for (const p of PARAMS) {
      const min = Number(inputs[p.key].min);
      const max = Number(inputs[p.key].max);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
        setError(`「${p.label}」范围不正确：下限必须小于上限`);
        setSaved(false);
        return;
      }
      next[p.key] = { min, max };
    }
    setError("");
    onUpdateRanges(tank.id, next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="range-editor">
      <div className="range-grid">
        {PARAMS.map((p) => (
          <div key={p.key} className="range-row">
            <span className="range-label">{p.label}{p.unit ? `（${p.unit}）` : ""}</span>
            <input
              type="number"
              step={p.step}
              value={inputs[p.key].min}
              onChange={(e) => setInputs((prev) => ({ ...prev, [p.key]: { ...prev[p.key], min: e.target.value } }))}
            />
            <span className="range-tilde">~</span>
            <input
              type="number"
              step={p.step}
              value={inputs[p.key].max}
              onChange={(e) => setInputs((prev) => ({ ...prev, [p.key]: { ...prev[p.key], max: e.target.value } }))}
            />
          </div>
        ))}
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button onClick={handleSave}>保存范围</button>
        {saved && <span className="save-ok">已保存，之后按新范围判定</span>}
      </div>
    </div>
  );
}

export default function TanksPanel({ tanks, onAddTank, onUpdateRanges }: Props) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState(TANK_KINDS[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (name.trim() === "") {
      setError("请填写鱼缸名称");
      return;
    }
    setError("");
    onAddTank({
      id: `tank-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      kind,
      note: note.trim(),
      ranges: defaultRanges(),
      createdAt: new Date().toISOString(),
    });
    setName("");
    setNote("");
  }

  return (
    <div className="tanks-panel">
      <section className="panel">
        <h2>新增鱼缸</h2>
        <form className="entry-form" onSubmit={handleAdd}>
          <div className="form-row">
            <label>
              <span>名称</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：三湖缸D" />
            </label>
            <label>
              <span>类型</span>
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                {TANK_KINDS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            <span>备注</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="位置、养殖对象等" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="primary-action">添加鱼缸</button>
            <span className="form-hint">新缸先套用通用安全范围，保存后可在下方逐项调整。</span>
          </div>
        </form>
      </section>

      {tanks.map((tank) => (
        <section key={tank.id} className="panel">
          <div className="section-heading">
            <div>
              <h2>{tank.name} <span className="kind-chip">{tank.kind}</span></h2>
              {tank.note && <p className="tank-note">{tank.note}</p>}
            </div>
          </div>
          <RangeEditor tank={tank} onUpdateRanges={onUpdateRanges} />
        </section>
      ))}
    </div>
  );
}
