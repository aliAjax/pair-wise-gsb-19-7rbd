import { useState } from "react";
import type { Tank } from "../types";
import { changePercent } from "../domain";
import { inputToIso, nowLocalInput } from "../format";
import { Modal } from "./TestForm";

export interface ChangeFormData {
  at: string;
  liters: number;
  operator: string;
  note: string;
}

interface ChangeFormProps {
  tank: Tank;
  defaultOperator: string;
  onClose: () => void;
  onSubmit: (data: ChangeFormData) => void;
}

export function ChangeForm({ tank, defaultOperator, onClose, onSubmit }: ChangeFormProps) {
  const [at, setAt] = useState(nowLocalInput());
  const [liters, setLiters] = useState("");
  const [operator, setOperator] = useState(defaultOperator);
  const [note, setNote] = useState("");

  const litersNum = Number(liters);
  const valid = liters.trim() !== "" && !Number.isNaN(litersNum) && litersNum > 0 && litersNum <= tank.volumeLiters;
  const timeValid = !Number.isNaN(new Date(at).getTime());
  const percent = valid ? changePercent(tank, litersNum) : 0;

  function submit() {
    if (!valid || !timeValid) return;
    onSubmit({ at: inputToIso(at), liters: litersNum, operator: operator.trim(), note: note.trim() });
  }

  return (
    <Modal title={`登记换水 · ${tank.name}`} onClose={onClose}>
      <div className="form-row">
        <label>
          <span>换水时间</span>
          <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
        </label>
        <label>
          <span>登记人</span>
          <input placeholder="换班同事的名字" value={operator} onChange={(e) => setOperator(e.target.value)} />
        </label>
      </div>

      <div className="form-row">
        <label className={liters.trim() !== "" && !valid ? "field-bad-text" : ""}>
          <span>换水量（升，缸体 {tank.volumeLiters}L）</span>
          <input
            type="number"
            min="0"
            max={tank.volumeLiters}
            step="1"
            inputMode="decimal"
            placeholder="实际换走的水量"
            value={liters}
            onChange={(e) => setLiters(e.target.value)}
          />
        </label>
        <div className="percent-readout">
          {valid ? (
            <>
              <span>占缸体容积</span>
              <strong>{percent}%</strong>
            </>
          ) : (
            <span className="muted">填写 1 – {tank.volumeLiters} 升之间的实际换水量</span>
          )}
        </div>
      </div>

      <label className="note-field">
        <span>备注（可留空）</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：例行换水 / 针对硝酸盐偏高换水" />
      </label>

      <p className="form-hint">
        换水只登记操作，不会自动解除异常；需要换水后再做一次检测，越界项目回到安全范围才会解除提醒。
      </p>

      <div className="modal-footer">
        <button onClick={onClose}>取消</button>
        <button className="primary-action" disabled={!valid || !timeValid} onClick={submit}>
          保存换水
        </button>
      </div>
    </Modal>
  );
}
