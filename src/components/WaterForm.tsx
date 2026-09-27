import { FormEvent, useState } from "react";
import { toLocalInputValue } from "../ledger";
import { Tank, WaterChange } from "../types";

interface Props {
  tanks: Tank[];
  tankId: string;
  onTankChange: (id: string) => void;
  onSubmit: (record: WaterChange) => void;
}

export default function WaterForm({ tanks, tankId, onTankChange, onSubmit }: Props) {
  const [time, setTime] = useState(() => toLocalInputValue(new Date()));
  const [amount, setAmount] = useState("");
  const [percent, setPercent] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const tank = tanks.find((t) => t.id === tankId) ?? tanks[0];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const liters = Number(amount);
    if (!tank) {
      setError("请先在“鱼缸与范围”里添加鱼缸");
      return;
    }
    if (!Number.isFinite(liters) || liters <= 0) {
      setError("请填写正确的换水量（升）");
      return;
    }
    const pct = percent.trim() === "" ? null : Number(percent);
    if (pct !== null && (!Number.isFinite(pct) || pct <= 0 || pct > 100)) {
      setError("换水比例需在 1~100% 之间，或留空");
      return;
    }
    setError("");
    onSubmit({
      id: `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      tankId: tank.id,
      time: new Date(time).toISOString(),
      amountLiters: liters,
      percent: pct,
      note: note.trim(),
    });
    setAmount("");
    setPercent("");
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
          <span>换水时间</span>
          <input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} required />
        </label>
      </div>
      <div className="form-row">
        <label>
          <span>换水量（升）</span>
          <input
            type="number"
            min="0"
            step="0.5"
            value={amount}
            placeholder="如 60"
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label>
          <span>换水比例（%，可留空）</span>
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            value={percent}
            placeholder="如 30"
            onChange={(e) => setPercent(e.target.value)}
          />
        </label>
      </div>
      <label>
        <span>备注</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="如：亚硝酸盐异常，大比例换水" />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="primary-action">保存换水记录</button>
        <span className="form-hint">换水本身不会解除提醒，需复测确认水质回到范围内。</span>
      </div>
    </form>
  );
}
