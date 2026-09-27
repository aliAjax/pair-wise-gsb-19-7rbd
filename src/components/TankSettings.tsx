import { useState } from "react";
import type { MetricRange, Tank } from "../types";
import {
  DEFAULT_RANGES,
  METRICS,
  TANK_CATEGORIES,
  rangeText,
} from "../domain";
import { Modal } from "./TestForm";

export interface TankDraft {
  name: string;
  category: string;
  volumeLiters: number;
  note: string;
  ranges: Record<string, MetricRange>;
}

interface TankSettingsProps {
  tanks: Tank[];
  onClose: () => void;
  onCreateTank: (draft: TankDraft) => void;
  onUpdateRanges: (tankId: string, ranges: Record<string, MetricRange>) => void;
}

export function TankSettings({ tanks, onClose, onCreateTank, onUpdateRanges }: TankSettingsProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(TANK_CATEGORIES[0]);
  const [volume, setVolume] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function create() {
    const volumeLiters = Number(volume);
    if (!name.trim()) {
      setError("请填写缸的名称");
      return;
    }
    if (!Number.isFinite(volumeLiters) || volumeLiters <= 0) {
      setError("请填写有效的缸体容积（升）");
      return;
    }
    onCreateTank({
      name: name.trim(),
      category,
      volumeLiters,
      note: note.trim(),
      ranges: JSON.parse(JSON.stringify(DEFAULT_RANGES)),
    });
    setName("");
    setVolume("");
    setNote("");
    setError("");
  }

  return (
    <Modal title="鱼缸与安全范围" onClose={onClose} wide>
      <div className="settings-list">
        {tanks.map((tank) => (
          <RangeEditor key={tank.id} tank={tank} onSave={(ranges) => onUpdateRanges(tank.id, ranges)} />
        ))}
      </div>

      <div className="new-tank">
        <h3>新增鱼缸</h3>
        <div className="form-row">
          <label>
            <span>名称</span>
            <input placeholder="例如：草缸D" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span>类型</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {TANK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>容积（升）</span>
            <input
              type="number"
              min="1"
              placeholder="例如：120"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
            />
          </label>
        </div>
        <label className="note-field">
          <span>备注（可留空）</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：海水混养缸" />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-footer">
          <button className="primary-action" onClick={create}>
            添加鱼缸
          </button>
        </div>
        <p className="form-hint">
          新缸使用通用默认安全范围，添加后可在上方逐项调整。历史异常按记录时刻的范围判定，改范围不会改写旧台账。
        </p>
      </div>
    </Modal>
  );
}

function RangeEditor({
  tank,
  onSave,
}: {
  tank: Tank;
  onSave: (ranges: Record<string, MetricRange>) => void;
}) {
  const [draft, setDraft] = useState<Record<string, MetricRange>>(
    JSON.parse(JSON.stringify(tank.ranges)),
  );
  const [saved, setSaved] = useState(false);

  const changed = JSON.stringify(draft) !== JSON.stringify(tank.ranges);

  function set(id: string, edge: "min" | "max", raw: string) {
    const value = raw === "" ? NaN : Number(raw);
    setDraft((prev) => ({
      ...prev,
      [id]: { ...prev[id], [edge]: value },
    }));
    setSaved(false);
  }

  function save() {
    const cleaned: Record<string, MetricRange> = {};
    for (const m of METRICS) {
      const r = draft[m.id];
      if (!r || Number.isNaN(r.min) || Number.isNaN(r.max) || r.min > r.max) continue;
      cleaned[m.id] = { min: r.min, max: r.max };
    }
    onSave(cleaned);
    setSaved(true);
  }

  return (
    <details className="range-editor">
      <summary>
        <strong>{tank.name}</strong>
        <span>
          {tank.category} · {tank.volumeLiters}L · 当前范围{" "}
          {METRICS.map((m) => `${m.label} ${rangeText(tank.ranges[m.id])}`).join("，")}
        </span>
      </summary>
      <div className="range-grid">
        {METRICS.map((m) => {
          const r = draft[m.id] ?? { min: NaN, max: NaN };
          const invalid = r.min > r.max;
          return (
            <div key={m.id} className={`range-field ${invalid ? "field-bad-text" : ""}`}>
              <span>
                {m.label}
                {m.unit ? `（${m.unit}）` : ""}
              </span>
              <div className="range-inputs">
                <input
                  type="number"
                  step={m.step}
                  value={Number.isNaN(r.min) ? "" : r.min}
                  onChange={(e) => set(m.id, "min", e.target.value)}
                  placeholder="下限"
                />
                <i>–</i>
                <input
                  type="number"
                  step={m.step}
                  value={Number.isNaN(r.max) ? "" : r.max}
                  onChange={(e) => set(m.id, "max", e.target.value)}
                  placeholder="上限"
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="range-actions">
        <button className="primary-action" disabled={!changed} onClick={save}>
          {saved ? "已保存" : "保存范围"}
        </button>
      </div>
    </details>
  );
}
