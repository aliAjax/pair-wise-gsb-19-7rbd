import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import Dashboard from "./components/Dashboard";
import History from "./components/History";
import TanksPanel from "./components/TanksPanel";
import TestForm from "./components/TestForm";
import WaterForm from "./components/WaterForm";
import {
  activeAlertFor,
  buildAllAlerts,
  exportLedgerJson,
  loadLedger,
  outOfRangeKeys,
  saveLedger,
} from "./ledger";
import { Ledger, PARAM_MAP, Ranges, Tank, TestRecord, WaterChange } from "./types";

type Tab = "board" | "test" | "water" | "tanks" | "history";

const TABS: { key: Tab; label: string }[] = [
  { key: "board", label: "看板" },
  { key: "test", label: "检测登记" },
  { key: "water", label: "换水登记" },
  { key: "tanks", label: "鱼缸与范围" },
  { key: "history", label: "历史台账" },
];

function App() {
  const [ledger, setLedger] = useState<Ledger>(loadLedger);
  const [tab, setTab] = useState<Tab>("board");
  const [testTankId, setTestTankId] = useState("");
  const [waterTankId, setWaterTankId] = useState("");
  const [historyTank, setHistoryTank] = useState("all");
  const [toast, setToast] = useState("");

  useEffect(() => saveLedger(ledger), [ledger]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const alerts = useMemo(() => buildAllAlerts(ledger), [ledger]);
  const pendingCount = alerts.filter((a) => a.resolvedAt === null).length;

  function tankName(id: string): string {
    return ledger.tanks.find((t) => t.id === id)?.name ?? "";
  }

  function addTest(record: TestRecord) {
    const tank = ledger.tanks.find((t) => t.id === record.tankId);
    if (!tank) return;
    const next: Ledger = { ...ledger, tests: [...ledger.tests, record] };
    setLedger(next);

    const out = outOfRangeKeys(tank, record.values);
    const active = activeAlertFor(buildAllAlerts(next), tank.id);
    const remaining = active ? Object.keys(active.items) : [];

    if (out.length > 0) {
      setToast(
        `已保存 ${tank.name} 检测：${out.map((k) => PARAM_MAP[k].label).join("、")} 越界，待处理提醒 ${
          remaining.length > out.length ? "已更新" : "已生成"
        }（当前待处理 ${remaining.length} 项）。`
      );
    } else if (remaining.length === 0) {
      setToast(`已保存 ${tank.name} 检测：全部项目回到范围内，该缸提醒已解除。`);
    } else {
      setToast(
        `已保存 ${tank.name} 检测：本次所测均在范围内，但 ${remaining
          .map((k) => PARAM_MAP[k as keyof typeof PARAM_MAP].label)
          .join("、")} 仍未复测或仍越界，提醒保留。`
      );
    }
    setTab("board");
  }

  function addWater(record: WaterChange) {
    setLedger((prev) => ({ ...prev, waterChanges: [...prev.waterChanges, record] }));
    setToast(`已保存 ${tankName(record.tankId)} 换水：${record.amountLiters} L。复测确认水质后提醒才会解除。`);
    setTab("board");
  }

  function addTank(tank: Tank) {
    setLedger((prev) => ({ ...prev, tanks: [...prev.tanks, tank] }));
    setToast(`已添加 ${tank.name}，可在下方调整它的安全范围。`);
  }

  function updateRanges(tankId: string, ranges: Ranges) {
    setLedger((prev) => ({
      ...prev,
      tanks: prev.tanks.map((t) => (t.id === tankId ? { ...t, ranges } : t)),
    }));
  }

  function gotoTest(tankId: string) {
    setTestTankId(tankId);
    setTab("test");
  }

  function gotoWater(tankId: string) {
    setWaterTankId(tankId);
    setTab("water");
  }

  function gotoHistory(tankId: string) {
    setHistoryTank(tankId);
    setTab("history");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">hxwl-05 · 水族养护台账</p>
          <h1>鱼缸水质维护台账</h1>
          <p className="subtitle">
            每只鱼缸独立安全范围；检测越界自动生成待处理提醒，全部项目复测回范围后解除；换水、检测记录长期保存可查。
          </p>
        </div>
        <div className="topbar-side">
          {pendingCount > 0 && <span className="pending-badge">{pendingCount} 只缸待处理</span>}
          <button onClick={() => exportLedgerJson(ledger)}>导出台账 JSON</button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "tab active" : "tab"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === "board" && pendingCount > 0 && <i className="dot" />}
          </button>
        ))}
      </nav>

      {toast && <div className="toast">{toast}</div>}

      {tab === "board" && (
        <Dashboard ledger={ledger} alerts={alerts} onNewTest={gotoTest} onNewWater={gotoWater} onShowHistory={gotoHistory} />
      )}
      {tab === "test" && (
        <section className="panel">
          <h2>检测登记</h2>
          <TestForm tanks={ledger.tanks} tankId={testTankId} onTankChange={setTestTankId} onSubmit={addTest} />
        </section>
      )}
      {tab === "water" && (
        <section className="panel">
          <h2>换水登记</h2>
          <WaterForm tanks={ledger.tanks} tankId={waterTankId} onTankChange={setWaterTankId} onSubmit={addWater} />
        </section>
      )}
      {tab === "tanks" && <TanksPanel tanks={ledger.tanks} onAddTank={addTank} onUpdateRanges={updateRanges} />}
      {tab === "history" && (
        <History ledger={ledger} alerts={alerts} tankFilter={historyTank} onTankFilter={setHistoryTank} />
      )}
    </main>
  );
}

export default App;
