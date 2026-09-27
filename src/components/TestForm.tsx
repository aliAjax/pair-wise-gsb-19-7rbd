import { useMemo, useState } from "react";
import type { Anomaly, Tank } from "../types";
import { METRICS, inRange, rangeText } from "../domain";
import { fmtValue, inputToIso, metricLabel, nowLocalInput } from "../format";

export interface TestFormData {
  at: string;
  operator: string;
  measured: Record<string, number>;
  note: string;
}

interface TestFormProps {
  tank: Tank;
  defaultOperator: string;
  onClose: () => void;
  onSubmit: (data: TestFormData) => { opened: Anomaly[]; closed: Anomaly[] };
}

export function TestForm({ tank, defaultOperator, onClose, onSubmit }: TestFormProps) {
  const [at, setAt] = useState(nowLocalInput());
  const [operator, setOperator] = useState(defaultOperator);
  const [note, setNote] = useState("");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ opened: Anomaly[]; closed: Anomaly[] } | null>(null);

  const measured = useMemo(() => {
    const out: Record<string, number> = {};
    for (const m of METRICS) {
      const raw = inputs[m.id];
      if (raw === undefined || raw.trim() === "") continue;
      const value = Number(raw);
      if (!Number.isNaN(value)) out[m.id] = value;
    }
    return out;
  }, [inputs]);

  const filled = Object.keys(measured).length > 0;
  const timeValid = !Number.isNaN(new Date(at).getTime());

  function submit() {
    if (!filled || !timeValid) return;
    setResult(onSubmit({ at: inputToIso(at), operator: operator.trim(), measured, note: note.trim() }));
  }

  if (result) {
    const nothing = result.opened.length === 0 && result.closed.length === 0;
    return (
      <Modal title={`检测已登记 · ${tank.name}`} onClose={onClose}>
        <div className="result-panel">
          {nothing && <p className="result-ok">本次检测的项目都在安全范围内，无新增异常。</p>}
          {result.opened.length > 0 && (
            <div className="result-block">
              <p className="result-title result-bad">新增待处理提醒（{result.opened.length} 项）</p>
              <ul>
                {result.opened.map((a) => (
                  <li key={a.id}>
                    <strong>{metricLabel(a.metric)}</strong> {fmtValue(a.metric, a.openedValue)}
                    {a.openedDirection === "high" ? " 超出上限" : " 低于下限"}，已挂起等待复测
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.closed.length > 0 && (
            <div className="result-block">
              <p className="result-title result-good">本次解除提醒（{result.closed.length} 项）</p>
              <ul>
                {result.closed.map((a) => (
                  <li key={a.id}>
                    <strong>{metricLabel(a.metric)}</strong> 已从{" "}
                    {fmtValue(a.metric, a.openedValue)} 回到 {a.closedValue !== undefined ? fmtValue(a.metric, a.closedValue) : "安全范围"}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="result-note">
            提醒按单项指标跟踪：只有该指标复测回到安全范围才会解除，其他仍越界的项目继续挂着。
          </p>
        </div>
        <div className="modal-footer">
          <button className="primary-action" onClick={onClose}>
            完成
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`登记水质检测 · ${tank.name}`} onClose={onClose}>
      <div className="form-row">
        <label>
          <span>检测时间</span>
          <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
        </label>
        <label>
          <span>登记人</span>
          <input
            placeholder="换班同事的名字"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
          />
        </label>
      </div>

      <p className="form-hint">
        安全范围按本缸设置；留空表示本次未检测，该项目的异常提醒会继续保留。
      </p>

      <div className="test-fields">
        {METRICS.map((m) => {
          const raw = inputs[m.id];
          const value = raw !== undefined && raw.trim() !== "" ? Number(raw) : undefined;
          const verdict =
            value === undefined || Number.isNaN(value)
              ? ""
              : inRange(value, tank.ranges[m.id])
                ? "field-ok"
                : "field-bad";
          return (
            <label key={m.id} className={`test-field ${verdict}`}>
              <span>
                {m.label}
                <em>
                  安全 {rangeText(tank.ranges[m.id])}
                  {m.unit ? ` ${m.unit}` : ""}
                </em>
              </span>
              <input
                type="number"
                step={m.step}
                inputMode="decimal"
                placeholder={`填写${m.label}（可留空）`}
                value={raw ?? ""}
                onChange={(e) => setInputs((prev) => ({ ...prev, [m.id]: e.target.value }))}
              />
            </label>
          );
        })}
      </div>

      <label className="note-field">
        <span>备注（停喂、处理措施等，可留空）</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：亚硝酸盐升高，停止投喂" />
      </label>

      <div className="modal-footer">
        <button onClick={onClose}>取消</button>
        <button className="primary-action" disabled={!filled || !timeValid} onClick={submit}>
          保存检测
        </button>
      </div>
    </Modal>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={`modal-card ${wide ? "modal-wide" : ""}`} onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
