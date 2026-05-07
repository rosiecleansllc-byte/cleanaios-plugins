const { useState, useEffect, useRef } = React;

if (typeof document !== "undefined") {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Instrument+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap";
  document.head.appendChild(link);
}

const SAMPLE = {
  payType: "percent", laborPct: 40, flatPay: 0, hourlyRate: 0,
  totalRevenue: 18500, oneTimeRevenue: 2200, totalJobs: 74, recurringJobsCount: 62,
  clientCount: 31, freqType: "biweekly", jobHours: 3,
  suppliesPerJob: 10, driveTimeCost: 8, insurancePerJob: 6,
  platformFeePct: 0, cancellationRate: 5,
  targetAcv: 0, goalRevenue: 25000,
};

const DARK = {
  bg: "#0f172a",
  surface: "#1e293b",
  border: "#334155",
  text: "#f1f5f9",
  muted: "#94a3b8",
  green: "#75D3DF",   // CleanAIOS teal as primary accent in dark
  blue: "#60a5fa",
  purple: "#a78bfa",
  amber: "#fbbf24",
  red: "#f87171",
};
const LIGHT = {
  bg: "#F5F5F5",       // --cream
  surface: "#ffffff",
  border: "#E0E0E0",   // --border
  text: "#111111",     // --ink
  muted: "#555555",    // --muted
  green: "#2aabb9",    // teal darkened for light bg readability
  blue: "#2563eb",
  purple: "#7c3aed",
  amber: "#d97706",
  red: "#dc2626",
  teal: "#75D3DF",     // CleanAIOS primary accent
};

function calc(inp) {
  const {
    payType,
    laborPct,
    flatPay,
    hourlyRate,
    totalRevenue,
    oneTimeRevenue,
    totalJobs,
    recurringJobsCount,
    clientCount,
    freqType,
    jobHours,
    targetMargin,
    targetAcv,
    goalRevenue,
    suppliesPerJob = 10,
    driveTimeCost = 8,
    insurancePerJob = 6,
    platformFeePct = 0,
    cancellationRate = 5,
  } = inp;

  const freqDiv =
    freqType === "weekly" ? 4 : freqType === "biweekly" ? 2 : freqType === "triweekly" ? 4 / 3 : 1;

  const recRevenue = totalRevenue - oneTimeRevenue;
  const recJobs = recurringJobsCount > 0 ? recurringJobsCount : totalJobs;
  const otJobs = Math.max(totalJobs - recJobs, 0);
  const recAvgCharge = recJobs > 0 ? recRevenue / recJobs : 0;
  const otAvgCharge = otJobs > 0 ? oneTimeRevenue / otJobs : 0;

  let workerPayout = 0;
  if (payType === "percent") workerPayout = (laborPct / 100) * recAvgCharge;
  else if (payType === "flat") workerPayout = flatPay;
  else if (payType === "hourly") workerPayout = hourlyRate * jobHours;

  const effectiveLaborPct = recAvgCharge > 0 ? (workerPayout / recAvgCharge) * 100 : 0;
  const grossMargin = 100 - effectiveLaborPct;

  const overheadPerJob = (suppliesPerJob || 0) + (driveTimeCost || 0) + (insurancePerJob || 0);
  const platformFeePerJob =
    recAvgCharge > 0
      ? recAvgCharge * ((platformFeePct || 0) / 100)
      : workerPayout * ((platformFeePct || 0) / 100);
  const cancellationAdj =
    (cancellationRate || 0) > 0 ? 1 / (1 - (cancellationRate || 0) / 100) : 1;
  const totalCostPerJob =
    (workerPayout + overheadPerJob + platformFeePerJob) * cancellationAdj;

  const tm = targetMargin > 0 ? targetMargin : 100 - laborPct;
  const jobHoursUsed = jobHours > 0 ? jobHours : 3;
  const priceFloor =
    tm < 100 && totalCostPerJob > 0 ? totalCostPerJob / (1 - tm / 100) : 0;
  const hourlyFloor =
    jobHoursUsed > 0 && tm < 100 && workerPayout > 0
      ? workerPayout / jobHoursUsed / (1 - tm / 100)
      : 0;
  const recommendedNewClientRate =
    priceFloor > 0 ? Math.ceil((priceFloor * 1.15) / 5) * 5 : 0;

  const leakagePerJob = recAvgCharge - priceFloor;
  const leakagePerClient = leakagePerJob * freqDiv;
  const totalLeakage = leakagePerClient * clientCount;

  const currentAcv = clientCount > 0 ? recRevenue / clientCount : 0;
  const currentMrr = currentAcv * clientCount;
  const gap = goalRevenue - currentMrr;
  const acvNeeded = clientCount > 0 ? goalRevenue / clientCount : 0;
  const legacyRevenue = currentAcv * clientCount;
  const needFromNew = Math.max(goalRevenue - legacyRevenue, 0);

  const baseHours = jobHoursUsed;
  const hourlyFloorGrid = [baseHours - 0.5, baseHours, baseHours + 0.5]
    .filter((h) => h > 0)
    .map((h) => ({
      hours: h,
      floor:
        tm < 100 && workerPayout > 0 ? workerPayout / h / (1 - tm / 100) : 0,
    }));

  const monthlyGrowthNumber =
    currentAcv > 0 && gap > 0 ? Math.ceil(gap / currentAcv) : 0;

  const stageNum =
    totalRevenue < 10000 ? 1 :
    totalRevenue < 20000 ? 2 :
    totalRevenue < 35000 ? 3 :
    totalRevenue < 50000 ? 4 :
    totalRevenue < 75000 ? 5 :
    totalRevenue < 100000 ? 6 : 7;
  const stageNames = ["", "Validation", "Stability", "Systems", "Leadership", "Ownership", "Scale", "Enterprise"];
  const stageFocus = ["",
    "Price at floor or above — build recurring base",
    "Stop doing everything yourself — document, delegate, build reserves",
    "Route optimization, raise prices 5–8%, build manager layer",
    "Tiered pricing, retention systems, develop team leads",
    "Target 55–65% gross margin, systems run without you",
    "Multiple revenue streams, brand authority, operational infrastructure",
    "Think in ACV + lifetime value — this is a portfolio, not a job",
  ];
  const stage = { n: stageNum, name: stageNames[stageNum], focus: stageFocus[stageNum] };

  const newClients90 = 15;
  const projected90Rev = (clientCount + newClients90) * currentAcv;
  const pct90 =
    goalRevenue > 0 ? Math.min((projected90Rev / goalRevenue) * 100, 100) : 0;

  const effTargetAcv = targetAcv > 0 ? targetAcv : acvNeeded;
  const scenarioBase = [
    { label: "Stay Mid-Market", acv: currentAcv, tag: null, color: "#60a5fa" },
    { label: "Controlled Test", acv: currentAcv * 1.35, tag: "RECOMMENDED", color: "#34d399" },
    { label: "Stabilized Model", acv: currentAcv * 1.6, tag: null, color: "#a78bfa" },
    { label: "Premium", acv: effTargetAcv, tag: null, color: "#fbbf24" },
    {
      label: "90-Day Achievable",
      acv: currentAcv,
      tag: "NO PRICE CHANGE",
      color: "#38bdf8",
      is90Day: true,
      projected90Rev,
      pct90,
      newClients90,
    },
  ];
  const scenarios = scenarioBase.map((s) => {
    if (s.is90Day) {
      return {
        ...s,
        clientsNeeded: clientCount + s.newClients90,
        newClients: s.newClients90,
        projected: s.projected90Rev,
        progress: s.pct90,
      };
    }
    const clientsNeeded = s.acv > 0 ? Math.ceil(goalRevenue / s.acv) : 0;
    const newClients = Math.max(clientsNeeded - clientCount, 0);
    const projected = (clientCount + newClients) * s.acv;
    const progress = goalRevenue > 0 ? Math.min((projected / goalRevenue) * 100, 100) : 0;
    return { ...s, clientsNeeded, newClients, projected, progress };
  });

  const newClientRows = [5, 10, 15, 20, 25, 30, 40, 50].map((n) => {
    const acvForN = n > 0 && needFromNew > 0 ? needFromNew / n : 0;
    const pricePerJob = freqDiv > 0 ? acvForN / freqDiv : 0;
    const hitsGoal = acvForN > 0 && legacyRevenue + n * acvForN >= goalRevenue;
    return { n, acvForN, pricePerJob, hitsGoal };
  });

  return {
    freqDiv,
    recRevenue,
    recJobs,
    otJobs,
    recAvgCharge,
    otAvgCharge,
    workerPayout,
    overheadPerJob,
    platformFeePerJob,
    cancellationAdj,
    totalCostPerJob,
    effectiveLaborPct,
    grossMargin,
    priceFloor,
    recommendedNewClientRate,
    hourlyFloor,
    hourlyFloorGrid,
    leakagePerJob,
    leakagePerClient,
    totalLeakage,
    currentAcv,
    currentMrr,
    gap,
    acvNeeded,
    legacyRevenue,
    needFromNew,
    monthlyGrowthNumber,
    projected90Rev,
    pct90,
    newClients90,
    scenarios,
    newClientRows,
    stage,
    goalRevenue,
    suppliesPerJob: suppliesPerJob || 0,
    driveTimeCost: driveTimeCost || 0,
    insurancePerJob: insurancePerJob || 0,
    platformFeePct: platformFeePct || 0,
    cancellationRate: cancellationRate || 0,
  };
}

function AnimatedNumber({ value = 0, prefix = "", suffix = "", decimals = 0 }) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    const duration = 500;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * ease;
      setDisplay(current);
      fromRef.current = current;
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
      else fromRef.current = to;
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  const abs = Math.abs(display);
  const neg = display < 0 ? "-" : "";
  const formatted =
    abs >= 1000
      ? abs.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : abs.toFixed(decimals);

  return (
    <span style={{ fontFamily: "DM Mono, monospace" }}>
      {neg}
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

function StatCard({ label, value, sub, accent, warn, t }) {
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${warn ? t.red : t.border}`,
        borderRadius: 12,
        padding: "16px 20px",
        flex: 1,
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 12, color: t.muted, marginBottom: 4 }}>{label}</div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: accent || t.text,
          fontFamily: "DM Mono, monospace",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

function Badge({ label, color }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: color + "22",
        color,
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </span>
  );
}

function ProgressBar({ value, max, color, t }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      style={{
        background: t.border,
        borderRadius: 999,
        height: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          borderRadius: 999,
          transition: "width 500ms cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </div>
  );
}

function InputRow({ label, hint, prefix, suffix, value, onChange, t }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{ display: "block", fontSize: 12, color: t.muted, marginBottom: 4 }}
      >
        {label}
      </label>
      {hint && (
        <div style={{ fontSize: 11, color: t.muted, marginBottom: 4, opacity: 0.7 }}>
          {hint}
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: t.bg,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {prefix && (
          <span
            style={{
              padding: "8px 10px",
              color: t.muted,
              background: t.surface,
              borderRight: `1px solid ${t.border}`,
              fontSize: 13,
            }}
          >
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            color: t.text,
            padding: "8px 10px",
            fontSize: 14,
            outline: "none",
            fontFamily: "DM Mono, monospace",
          }}
        />
        {suffix && (
          <span
            style={{
              padding: "8px 10px",
              color: t.muted,
              background: t.surface,
              borderLeft: `1px solid ${t.border}`,
              fontSize: 13,
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function QsInput({ label, hint, prefix, suffix, field, qs, setQs, t }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 13,
          color: t.text,
          fontWeight: 500,
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      {hint && (
        <div style={{ fontSize: 11, color: t.muted, marginBottom: 4 }}>{hint}</div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: t.bg,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {prefix && (
          <span
            style={{
              padding: "8px 12px",
              color: t.muted,
              background: t.surface,
              borderRight: `1px solid ${t.border}`,
              fontSize: 13,
            }}
          >
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={qs[field] || ""}
          onChange={(e) => setQs((p) => ({ ...p, [field]: e.target.value }))}
          placeholder="0"
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            color: t.text,
            padding: "8px 12px",
            fontSize: 14,
            outline: "none",
            fontFamily: "DM Mono, monospace",
          }}
        />
        {suffix && (
          <span
            style={{
              padding: "8px 12px",
              color: t.muted,
              background: t.surface,
              borderLeft: `1px solid ${t.border}`,
              fontSize: 13,
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function CheckItem({ label, checked, onChange, t }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 8,
        cursor: "pointer",
        background: checked ? t.green + "15" : t.surface,
        border: `1px solid ${checked ? t.green : t.border}`,
        marginBottom: 8,
        transition: "all 300ms",
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 5,
          border: `2px solid ${checked ? t.green : t.border}`,
          background: checked ? t.green : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 300ms",
          flexShrink: 0,
        }}
      >
        {checked && (
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>
        )}
      </div>
      <span style={{ color: checked ? t.green : t.text, fontSize: 14 }}>{label}</span>
    </div>
  );
}

function InsightBlock({ icon, title, body, color, t }) {
  return (
    <div
      style={{
        background: color + "10",
        border: `1px solid ${color}40`,
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontWeight: 700, color, fontSize: 14 }}>{title}</span>
      </div>
      <div
        style={{
          color: t.text,
          fontSize: 14,
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
        }}
      >
        {body}
      </div>
    </div>
  );
}

function TypingCursor() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setVisible((v) => !v), 500);
    return () => clearInterval(id);
  }, []);
  return <span style={{ opacity: visible ? 1 : 0 }}>▌</span>;
}

const SECTION_MAP = {
  DIAGNOSIS: { icon: "🔍", title: "Diagnosis", colorKey: "red" },
  "ROOT CAUSE": { icon: "⚠️", title: "Root Cause", colorKey: "amber" },
  "RECOMMENDED PATH": { icon: "🚀", title: "Recommended Path", colorKey: "green" },
  "THIS WEEK": { icon: "📅", title: "This Week", colorKey: "blue" },
  "PRICING READINESS": { icon: "💡", title: "Pricing Readiness", colorKey: "purple" },
};

function StreamingInsight({ text, isStreaming, t }) {
  const keys = Object.keys(SECTION_MAP);
  const sections = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const marker = `[${key}]`;
    const idx = text.indexOf(marker);
    if (idx === -1) continue;
    const nextKey = keys[i + 1];
    const nextMarker = nextKey ? `[${nextKey}]` : null;
    const start = idx + marker.length;
    const end =
      nextMarker && text.indexOf(nextMarker) > -1
        ? text.indexOf(nextMarker)
        : text.length;
    sections.push({ key, body: text.slice(start, end).trim() });
  }

  if (sections.length === 0) {
    return (
      <div style={{ color: t.text, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
        {text}
        {isStreaming && <TypingCursor />}
      </div>
    );
  }

  return (
    <div>
      {sections.map((s, i) => {
        const meta = SECTION_MAP[s.key];
        return (
          <InsightBlock
            key={s.key}
            icon={meta.icon}
            title={meta.title}
            body={s.body}
            color={t[meta.colorKey]}
            t={t}
          />
        );
      })}
      {isStreaming && (
        <span style={{ color: t.muted }}>
          <TypingCursor />
        </span>
      )}
    </div>
  );
}

function PayStructureStep({ qs, setQs, t }) {
  const n = (v) => parseFloat(v) || 0;
  const avgCharge =
    n(qs.totalRevenue) > 0 && n(qs.totalJobs) > 0
      ? n(qs.totalRevenue) / n(qs.totalJobs)
      : 0;
  const workerPayout =
    qs.payType === "percent" && n(qs.laborPct) > 0
      ? (n(qs.laborPct) / 100) * avgCharge
      : qs.payType === "flat" && n(qs.flatPay) > 0
      ? n(qs.flatPay)
      : qs.payType === "hourly" && n(qs.hourlyRate) > 0 && n(qs.jobHours) > 0
      ? n(qs.hourlyRate) * n(qs.jobHours)
      : 0;
  const laborPctCalc = avgCharge > 0 ? (workerPayout / avgCharge) * 100 : 0;
  const margin = 100 - laborPctCalc;
  const showPreview = workerPayout > 0 && avgCharge > 0;

  const btnStyle = (active) => ({
    flex: 1,
    padding: "10px 0",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    background: active ? t.blue : t.surface,
    color: active ? "#fff" : t.muted,
    transition: "all 200ms",
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          style={btnStyle(qs.payType === "percent")}
          onClick={() => setQs((p) => ({ ...p, payType: "percent" }))}
        >
          % of Job
        </button>
        <button
          style={btnStyle(qs.payType === "flat")}
          onClick={() => setQs((p) => ({ ...p, payType: "flat" }))}
        >
          Flat / Job
        </button>
        <button
          style={btnStyle(qs.payType === "hourly")}
          onClick={() => setQs((p) => ({ ...p, payType: "hourly" }))}
        >
          Per Hour
        </button>
      </div>

      {qs.payType === "percent" && (
        <QsInput label="Labor %" prefix="%" field="laborPct" qs={qs} setQs={setQs} t={t} />
      )}
      {qs.payType === "flat" && (
        <QsInput label="Flat Pay per Job" prefix="$" field="flatPay" qs={qs} setQs={setQs} t={t} />
      )}
      {qs.payType === "hourly" && (
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <QsInput label="Hourly Rate" prefix="$" field="hourlyRate" qs={qs} setQs={setQs} t={t} />
          </div>
          <div style={{ flex: 1 }}>
            <QsInput label="Avg Job Hours" suffix="hrs" field="jobHours" qs={qs} setQs={setQs} t={t} />
          </div>
        </div>
      )}

      {showPreview && (
        <div
          style={{
            background: t.bg,
            border: `1px solid ${t.border}`,
            borderRadius: 10,
            padding: "12px 16px",
            marginTop: 8,
            display: "flex",
            gap: 24,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: t.muted }}>Payout / Job</div>
            <div style={{ fontFamily: "DM Mono", fontWeight: 700, color: t.text }}>
              ${workerPayout.toFixed(0)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: t.muted }}>Labor %</div>
            <div style={{ fontFamily: "DM Mono", fontWeight: 700, color: t.amber }}>
              {laborPctCalc.toFixed(1)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: t.muted }}>Your Margin</div>
            <div
              style={{
                fontFamily: "DM Mono",
                fontWeight: 700,
                color: margin >= 50 ? t.green : t.red,
              }}
            >
              {margin.toFixed(1)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SAMPLE_QS = {
  payType: "percent",
  laborPct: "40",
  flatPay: "",
  hourlyRate: "",
  jobHours: "3",
  totalRevenue: "18500",
  oneTimeRevenue: "2200",
  totalJobs: "74",
  recurringJobs: "62",
  clientCount: "31",
  freqType: "biweekly",
  targetAcv: "",
  goalRevenue: "25000",
  suppliesPerJob: "10",
  driveTimeCost: "8",
  insurancePerJob: "6",
  platformFeePct: "0",
  cancellationRate: "5",
};

function QuickStartScreen({ qs, setQs, onBuild, t }) {
  const n = (v) => parseFloat(v) || 0;
  const [showCostInputs, setShowCostInputs] = useState(false);

  const complete =
    ((qs.payType === "percent" ? n(qs.laborPct) > 0 : true) &&
      (qs.payType === "flat" ? n(qs.flatPay) > 0 : true) &&
      (qs.payType === "hourly"
        ? n(qs.hourlyRate) > 0 && n(qs.jobHours) > 0
        : true)) &&
    n(qs.totalRevenue) > 0 &&
    n(qs.totalJobs) > 0 &&
    n(qs.clientCount) > 0 &&
    n(qs.goalRevenue) > 0;

  const recRevenue = n(qs.totalRevenue) - n(qs.oneTimeRevenue);
  const recJobs = n(qs.recurringJobs) > 0 ? n(qs.recurringJobs) : n(qs.totalJobs);
  const otJobs = Math.max(n(qs.totalJobs) - recJobs, 0);
  const recAvg = recJobs > 0 ? recRevenue / recJobs : 0;
  const otAvg = otJobs > 0 ? n(qs.oneTimeRevenue) / otJobs : 0;
  const currentAcv = n(qs.clientCount) > 0 ? recRevenue / n(qs.clientCount) : 0;
  const freqDiv =
    qs.freqType === "weekly" ? 4 : qs.freqType === "biweekly" ? 2 : qs.freqType === "triweekly" ? 4 / 3 : 1;
  const acvNeeded = n(qs.clientCount) > 0 ? n(qs.goalRevenue) / n(qs.clientCount) : 0;

  const workerPayout =
    qs.payType === "percent" ? (n(qs.laborPct) / 100) * recAvg :
    qs.payType === "flat" ? n(qs.flatPay) :
    qs.payType === "hourly" ? n(qs.hourlyRate) * n(qs.jobHours) : 0;
  const overhead = (n(qs.suppliesPerJob) || 10) + (n(qs.driveTimeCost) || 8) + (n(qs.insurancePerJob) || 6);
  const platFee = recAvg > 0 ? recAvg * ((n(qs.platformFeePct) || 0) / 100) : 0;
  const cancAdj = (n(qs.cancellationRate) || 5) > 0 ? 1 / (1 - (n(qs.cancellationRate) || 5) / 100) : 1;
  const allInCost = (workerPayout + overhead + platFee) * cancAdj;
  const showCostPreview =
    n(qs.suppliesPerJob) > 0 ||
    n(qs.driveTimeCost) > 0 ||
    n(qs.insurancePerJob) > 0 ||
    n(qs.platformFeePct) > 0 ||
    n(qs.cancellationRate) > 0;

  const stepCard = {
    background: t.surface,
    border: `1px solid ${t.border}`,
    borderRadius: 16,
    padding: "20px 24px",
    marginBottom: 16,
  };

  const stepBadge = (num, color = t.blue) => (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: 999,
        background: color,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {num}
    </div>
  );

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "28px 16px 40px",
        fontFamily: "Instrument Sans, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 34, fontWeight: 300, color: dark ? t.green : "#75D3DF", fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.02em" }}>
          Margin &amp; Stabilization
        </div>
        <div style={{ fontSize: 13, color: t.muted, marginTop: 4, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500 }}>
          Financial Decision Tool · Clean AIOS
        </div>
        <div style={{ fontSize: 14, color: t.muted, marginTop: 8 }}>
          Answer 5 questions to build your financial report
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
          <button
            onClick={() => setQs(SAMPLE_QS)}
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              border: `1px solid ${t.border}`,
              background: t.surface,
              color: t.muted,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Try sample numbers
          </button>
          <button
            onClick={onBuild}
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              border: "none",
              background: "transparent",
              color: t.muted,
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Skip and enter manually
          </button>
        </div>
      </div>

      {/* Step 01 — Pay Structure */}
      <div style={stepCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          {stepBadge("01")}
          <div style={{ fontWeight: 600, color: t.text }}>Pay Structure</div>
        </div>
        <PayStructureStep qs={qs} setQs={setQs} t={t} />
      </div>

      {/* Step 02 — Revenue */}
      <div style={stepCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          {stepBadge("02", t.amber)}
          <div style={{ fontWeight: 600, color: t.text }}>Last Month Revenue</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <QsInput label="Total Revenue" prefix="$" field="totalRevenue" qs={qs} setQs={setQs} t={t} />
          </div>
          <div style={{ flex: 1 }}>
            <QsInput label="Total Jobs" field="totalJobs" qs={qs} setQs={setQs} t={t} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <QsInput
              label="One-Time Revenue"
              hint="Deep cleans, move-outs, first-time visits"
              prefix="$"
              field="oneTimeRevenue"
              qs={qs}
              setQs={setQs}
              t={t}
            />
          </div>
          {n(qs.oneTimeRevenue) > 0 && (
            <div style={{ flex: 1 }}>
              <QsInput
                label="How many were recurring jobs?"
                field="recurringJobs"
                qs={qs}
                setQs={setQs}
                t={t}
              />
            </div>
          )}
        </div>
        {recAvg > 0 && (
          <div
            style={{
              background: t.bg,
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              padding: "12px 16px",
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: t.muted }}>Recurring Avg / Job</div>
              <div style={{ fontFamily: "DM Mono", fontWeight: 700, color: t.amber }}>
                ${recAvg.toFixed(0)}
              </div>
            </div>
            {otAvg > 0 && (
              <div>
                <div style={{ fontSize: 11, color: t.muted }}>One-Time Avg / Job</div>
                <div style={{ fontFamily: "DM Mono", fontWeight: 700, color: t.green }}>
                  ${otAvg.toFixed(0)}
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 11, color: t.muted }}>Recurring Revenue</div>
              <div style={{ fontFamily: "DM Mono", fontWeight: 700, color: t.text }}>
                ${recRevenue.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 03 — Client Count */}
      <div style={stepCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          {stepBadge("03", t.green)}
          <div style={{ fontWeight: 600, color: t.text }}>Client Count</div>
        </div>
        <QsInput label="Recurring client count" field="clientCount" qs={qs} setQs={setQs} t={t} />
        {currentAcv > 0 && (
          <div
            style={{
              background: t.bg,
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              padding: "12px 16px",
              display: "flex",
              gap: 24,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: t.muted }}>Current ACV</div>
              <div style={{ fontFamily: "DM Mono", fontWeight: 700, color: t.green }}>
                ${currentAcv.toFixed(0)}/mo
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: t.muted }}>Current MRR</div>
              <div style={{ fontFamily: "DM Mono", fontWeight: 700, color: t.text }}>
                ${(currentAcv * n(qs.clientCount)).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 04 — Job Details + Real Cost Inputs */}
      <div style={stepCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          {stepBadge("04", t.purple)}
          <div style={{ fontWeight: 600, color: t.text }}>Job Details</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              color: t.text,
              fontWeight: 500,
              marginBottom: 8,
            }}
          >
            Cleaning frequency
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              ["weekly", "Weekly"],
              ["biweekly", "Bi-Weekly"],
              ["triweekly", "Triweekly"],
              ["monthly", "Monthly"],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setQs((p) => ({ ...p, freqType: val }))}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: qs.freqType === val ? t.purple : t.surface,
                  color: qs.freqType === val ? "#fff" : t.muted,
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {qs.payType !== "hourly" && (
          <QsInput
            label="Avg job duration"
            suffix="hrs"
            field="jobHours"
            qs={qs}
            setQs={setQs}
            t={t}
          />
        )}

        {/* Collapsible Real Cost Inputs */}
        <div
          style={{
            marginTop: 8,
            border: `1px solid ${t.border}`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => setShowCostInputs((v) => !v)}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: t.bg,
              border: "none",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: t.muted,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span>Real Cost Inputs (Optional)</span>
            <span>{showCostInputs ? "▲" : "▼"}</span>
          </button>
          {showCostInputs && (
            <div style={{ padding: "14px 14px 4px" }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <QsInput label="Supplies / Job" hint="Default: $10" prefix="$" field="suppliesPerJob" qs={qs} setQs={setQs} t={t} />
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <QsInput label="Drive Time / Job" hint="Default: $8" prefix="$" field="driveTimeCost" qs={qs} setQs={setQs} t={t} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <QsInput label="Insurance / Job" hint="Default: $6" prefix="$" field="insurancePerJob" qs={qs} setQs={setQs} t={t} />
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <QsInput label="Platform Fee %" hint="Default: 0" suffix="%" field="platformFeePct" qs={qs} setQs={setQs} t={t} />
                </div>
              </div>
              <QsInput label="Cancellation Rate %" hint="Default: 5%" suffix="%" field="cancellationRate" qs={qs} setQs={setQs} t={t} />
              {showCostPreview && allInCost > 0 && (
                <div
                  style={{
                    background: t.green + "15",
                    border: `1px solid ${t.green}40`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    marginBottom: 12,
                    fontSize: 12,
                    color: t.text,
                  }}
                >
                  <span style={{ color: t.muted }}>All-In Cost / Job: </span>
                  <span style={{ fontFamily: "DM Mono", fontWeight: 700, color: t.green }}>
                    ${allInCost.toFixed(0)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Step 05 — Revenue Goal */}
      <div style={stepCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          {stepBadge("05", t.green)}
          <div style={{ fontWeight: 600, color: t.text }}>Revenue Goal</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <QsInput
              label="Monthly revenue goal"
              prefix="$"
              field="goalRevenue"
              qs={qs}
              setQs={setQs}
              t={t}
            />
          </div>
          <div style={{ flex: 1 }}>
            <QsInput
              label="Target ACV (optional)"
              hint="Auto-calculated if blank"
              prefix="$"
              field="targetAcv"
              qs={qs}
              setQs={setQs}
              t={t}
            />
          </div>
        </div>
        {acvNeeded > 0 && (
          <div
            style={{
              background: t.bg,
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              padding: "12px 16px",
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: t.muted }}>ACV to Hit Goal</div>
              <div style={{ fontFamily: "DM Mono", fontWeight: 700, color: t.green }}>
                ${acvNeeded.toFixed(0)}/mo
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: t.muted }}>Price per Job</div>
              <div style={{ fontFamily: "DM Mono", fontWeight: 700, color: t.text }}>
                ${freqDiv > 0 ? (acvNeeded / freqDiv).toFixed(0) : "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: t.muted }}>Gap to Goal</div>
              <div
                style={{
                  fontFamily: "DM Mono",
                  fontWeight: 700,
                  color: n(qs.goalRevenue) > recRevenue ? t.amber : t.green,
                }}
              >
                ${Math.abs(n(qs.goalRevenue) - recRevenue).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Build Button */}
      <button
        onClick={onBuild}
        disabled={!complete}
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: 12,
          border: "none",
          cursor: complete ? "pointer" : "not-allowed",
          background: complete ? t.green : t.border,
          color: complete ? "#fff" : t.muted,
          fontSize: 16,
          fontWeight: 700,
          boxShadow: complete ? `0 0 24px ${t.green}55` : "none",
          transition: "all 300ms",
          fontFamily: "Instrument Sans, sans-serif",
        }}
      >
        {complete ? "✓ Build My Report" : "Complete required fields to continue"}
      </button>
    </div>
  );
}

function PriceFloorTab({ inp, setInp, c, t }) {
  const set = (k) => (v) => setInp((p) => ({ ...p, [k]: v }));

  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
      {/* Left: Inputs */}
      <div style={{ flex: "0 0 200px", minWidth: 180 }}>
        <div
          style={{
            fontSize: 11,
            color: t.muted,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 12,
          }}
        >
          Inputs
        </div>
        <InputRow
          label="Worker Payout / Job"
          prefix="$"
          value={Math.round(c.workerPayout)}
          onChange={() => {}}
          t={t}
        />
        <InputRow
          label="Avg Job Hours"
          suffix="hrs"
          value={inp.jobHours}
          onChange={set("jobHours")}
          t={t}
        />
        <InputRow
          label="Target Margin"
          suffix="%"
          value={inp.targetMargin}
          onChange={set("targetMargin")}
          t={t}
        />
        <InputRow
          label="Current Charge / Job"
          prefix="$"
          value={Math.round(c.recAvgCharge)}
          onChange={() => {}}
          t={t}
        />
        <InputRow
          label="Recurring Clients"
          value={inp.clientCount}
          onChange={set("clientCount")}
          t={t}
        />
        <div style={{ fontSize: 11, color: t.muted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "14px 0 8px" }}>
          Real Costs / Job
        </div>
        <InputRow label="Supplies" prefix="$" value={inp.suppliesPerJob} onChange={set("suppliesPerJob")} t={t} />
        <InputRow label="Drive Time" prefix="$" value={inp.driveTimeCost} onChange={set("driveTimeCost")} t={t} />
        <InputRow label="Insurance" prefix="$" value={inp.insurancePerJob} onChange={set("insurancePerJob")} t={t} />
        <InputRow label="Platform Fee" suffix="%" value={inp.platformFeePct} onChange={set("platformFeePct")} t={t} />
        <InputRow label="Cancellation Rate" suffix="%" value={inp.cancellationRate} onChange={set("cancellationRate")} t={t} />
      </div>

      {/* Right: Results */}
      <div style={{ flex: 1, minWidth: 280 }}>
        {/* Real Cost Per Job Breakdown */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>Real Cost Per Job — All-In</div>
          {[
            { label: "Worker Payout", value: c.workerPayout, color: t.text },
            { label: "Supplies", value: inp.suppliesPerJob || 0, color: t.text },
            { label: "Drive Time", value: inp.driveTimeCost || 0, color: t.text },
            { label: "Insurance", value: inp.insurancePerJob || 0, color: t.text },
            { label: `Platform Fee (${inp.platformFeePct || 0}%)`, value: c.platformFeePerJob, color: t.text },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${t.border}` }}>
              <span style={{ fontSize: 12, color: t.muted }}>{row.label}</span>
              <span style={{ fontFamily: "DM Mono", fontSize: 13, color: row.color }}>${(row.value || 0).toFixed(0)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `2px solid ${t.border}` }}>
            <span style={{ fontSize: 12, color: t.muted }}>Subtotal</span>
            <span style={{ fontFamily: "DM Mono", fontSize: 13, color: t.text }}>
              ${(c.workerPayout + (inp.suppliesPerJob || 0) + (inp.driveTimeCost || 0) + (inp.insurancePerJob || 0) + c.platformFeePerJob).toFixed(0)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${t.border}` }}>
            <span style={{ fontSize: 12, color: t.muted }}>× Cancellation Adj</span>
            <span style={{ fontFamily: "DM Mono", fontSize: 13, color: t.amber }}>×{c.cancellationAdj.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Total Cost / Job</span>
            <span style={{ fontFamily: "DM Mono", fontSize: 15, fontWeight: 700, color: t.green }}>${c.totalCostPerJob.toFixed(0)}</span>
          </div>
        </div>

        {/* Metric Cards */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <StatCard
            label="Price Floor"
            value={<AnimatedNumber value={c.priceFloor} prefix="$" decimals={0} />}
            sub="All-in minimum (labor + overhead)"
            accent={t.green}
            t={t}
          />
          <StatCard
            label="Avg / Job"
            value={<AnimatedNumber value={c.recAvgCharge} prefix="$" decimals={0} />}
            sub="Current recurring avg"
            accent={t.blue}
            t={t}
          />
          <StatCard
            label="Leakage / Job"
            value={
              <AnimatedNumber
                value={Math.abs(c.leakagePerJob)}
                prefix={c.leakagePerJob < 0 ? "-$" : "+$"}
                decimals={0}
              />
            }
            sub={c.leakagePerJob < 0 ? "Below floor" : "Above floor"}
            accent={c.leakagePerJob < 0 ? t.red : t.green}
            warn={c.leakagePerJob < 0}
            t={t}
          />
          <StatCard
            label="New Client Rate"
            value={<AnimatedNumber value={c.recommendedNewClientRate} prefix="$" decimals={0} />}
            sub="Recommended starting rate"
            accent={t.purple}
            t={t}
          />
        </div>

        {/* Hourly Floor Grid */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: t.muted, marginBottom: 8 }}>
            Blended Hourly Floor
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {c.hourlyFloorGrid.map((hf) => (
              <div
                key={hf.hours}
                style={{
                  flex: 1,
                  background: t.surface,
                  border: `1px solid ${hf.hours === inp.jobHours ? t.blue : t.border}`,
                  borderRadius: 10,
                  padding: "12px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 11, color: t.muted }}>{hf.hours}h job</div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: hf.hours === inp.jobHours ? t.blue : t.text,
                    fontFamily: "DM Mono",
                  }}
                >
                  ${hf.floor.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leakage Breakdown */}
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: "16px 20px",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>
            Leakage Breakdown
          </div>
          {[
            { label: "Leakage per Job", value: c.leakagePerJob },
            { label: "Leakage per Client / Month", value: c.leakagePerClient },
            { label: "Total Monthly Leakage", value: c.totalLeakage },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: `1px solid ${t.border}`,
              }}
            >
              <span style={{ fontSize: 13, color: t.muted }}>{row.label}</span>
              <span
                style={{
                  fontFamily: "DM Mono",
                  fontWeight: 600,
                  color: row.value < 0 ? t.red : t.green,
                }}
              >
                {row.value < 0 ? "-" : "+"}${Math.abs(row.value).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PremiumModelTab({ inp, setInp, c, t }) {
  const set = (k) => (v) => setInp((p) => ({ ...p, [k]: v }));
  const freqDiv = c.freqDiv;
  const premiumPerCleaning = freqDiv > 0 ? inp.targetAcv / freqDiv : 0;
  const laborCost = inp.jobHours > 0 ? c.workerPayout / inp.jobHours : 0;
  const premiumHourly = inp.jobHours > 0 ? premiumPerCleaning / inp.jobHours : 0;
  const premiumMargin =
    premiumHourly > 0 ? ((premiumHourly - laborCost) / premiumHourly) * 100 : 0;
  const currentHourly = inp.jobHours > 0 ? c.recAvgCharge / inp.jobHours : 0;

  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
      <div style={{ flex: "0 0 200px", minWidth: 180 }}>
        <div
          style={{
            fontSize: 11,
            color: t.muted,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 12,
          }}
        >
          Inputs
        </div>
        <InputRow
          label="Target ACV / Month"
          prefix="$"
          value={inp.targetAcv}
          onChange={set("targetAcv")}
          t={t}
        />
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: t.muted, marginBottom: 6 }}>
            Frequency
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            {["weekly", "biweekly", "triweekly", "monthly"].map((f) => (
              <button
                key={f}
                onClick={() => setInp((p) => ({ ...p, freqType: f }))}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: inp.freqType === f ? t.purple : t.surface,
                  color: inp.freqType === f ? "#fff" : t.muted,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "capitalize",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <InputRow
          label="Avg Job Hours"
          suffix="hrs"
          value={inp.jobHours}
          onChange={set("jobHours")}
          t={t}
        />
      </div>

      <div style={{ flex: 1, minWidth: 280 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <StatCard
            label="Premium Price / Cleaning"
            value={<AnimatedNumber value={premiumPerCleaning} prefix="$" decimals={0} />}
            accent={t.purple}
            t={t}
          />
          <StatCard
            label="Premium Hourly Rate"
            value={<AnimatedNumber value={premiumHourly} prefix="$" decimals={2} />}
            accent={t.blue}
            t={t}
          />
          <StatCard
            label="Gross Margin at Premium"
            value={<AnimatedNumber value={premiumMargin} suffix="%" decimals={1} />}
            warn={premiumMargin < 50}
            accent={premiumMargin >= 50 ? t.green : t.red}
            t={t}
          />
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          {/* Mid-Market */}
          <div
            style={{
              flex: 1,
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "20px",
              minWidth: 140,
            }}
          >
            <Badge label="Mid-Market" color={t.blue} />
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: t.muted }}>Price / Cleaning</div>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "DM Mono", color: t.text }}>
                ${c.recAvgCharge.toFixed(0)}
              </div>
              <div style={{ fontSize: 12, color: t.muted, marginTop: 8 }}>Hourly Rate</div>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "DM Mono", color: t.blue }}>
                ${currentHourly.toFixed(2)}/hr
              </div>
              <div style={{ fontSize: 12, color: t.muted, marginTop: 8 }}>Gross Margin</div>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "DM Mono", color: c.grossMargin >= 45 ? t.green : t.red }}>
                {c.grossMargin.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Premium */}
          <div
            style={{
              flex: 1,
              background: t.surface,
              border: `2px solid ${t.purple}`,
              borderRadius: 12,
              padding: "20px",
              minWidth: 140,
            }}
          >
            <Badge label="Premium" color={t.purple} />
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: t.muted }}>Price / Cleaning</div>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "DM Mono", color: t.text }}>
                ${premiumPerCleaning.toFixed(0)}
              </div>
              <div style={{ fontSize: 12, color: t.muted, marginTop: 8 }}>Hourly Rate</div>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "DM Mono", color: t.purple }}>
                ${premiumHourly.toFixed(2)}/hr
              </div>
              <div style={{ fontSize: 12, color: t.muted, marginTop: 8 }}>Gross Margin</div>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "DM Mono", color: premiumMargin >= 50 ? t.green : t.red }}>
                {premiumMargin.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Biweekly ACV Math callout */}
        {inp.freqType === "biweekly" && c.recAvgCharge > 0 && (
          <div
            style={{
              background: t.blue + "12",
              border: `1px solid ${t.blue}40`,
              borderRadius: 12,
              padding: "14px 18px",
              marginBottom: 16,
              fontSize: 13,
              color: t.text,
              lineHeight: 1.7,
            }}
          >
            <div style={{ fontWeight: 700, color: t.blue, marginBottom: 6 }}>📐 Biweekly ACV Math</div>
            <div>
              <span style={{ fontFamily: "DM Mono", color: t.amber }}>${c.recAvgCharge.toFixed(0)}</span>
              {" "}/visit × 2 visits/month = <span style={{ fontFamily: "DM Mono", color: t.amber }}>${(c.recAvgCharge * 2).toFixed(0)}</span>/month
            </div>
            <div>× 12 months = <span style={{ fontFamily: "DM Mono", color: t.amber }}>${(c.recAvgCharge * 24).toFixed(0)}</span>/year per client</div>
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${t.border}` }}>
              Raise by $20/visit → <span style={{ fontFamily: "DM Mono", color: t.green }}>+${(20 * c.freqDiv).toFixed(0)}/mo</span> → <span style={{ fontFamily: "DM Mono", color: t.green }}>+${(20 * c.freqDiv * 12).toFixed(0)}/yr</span> per client
            </div>
            <div>
              Across {inp.clientCount} clients → <span style={{ fontFamily: "DM Mono", fontWeight: 700, color: t.green }}>+${(20 * c.freqDiv * 12 * inp.clientCount).toLocaleString()}/year</span>
            </div>
          </div>
        )}

        {/* Revenue Source Ideas */}
        <div>
          <div style={{ fontSize: 11, color: t.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
            💡 Revenue Source Ideas
          </div>
          {[
            { icon: "🏢", label: "Commercial Clients", desc: "Offices, retail, medical. Higher per-job rates and repeat contracts." },
            { icon: "🏘️", label: "Property Management", desc: "Apartment complexes, Airbnb partners. Bulk recurring contracts." },
            { icon: "🏠", label: "Short-Term Rentals", desc: "Same-day turns between guests. Urgency pricing at $100–$200/clean." },
            { icon: "📦", label: "Move-Out / Move-In", desc: "Premium one-time jobs at $300–$600+. High demand, no repeat needed." },
            { icon: "➕", label: "Add-On Services", desc: "Inside fridge, oven, windows, laundry. Add +$30–$80 per visit." },
          ].map((src) => (
            <div
              key={src.label}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                background: t.surface,
                border: `1px solid ${t.border}`,
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{src.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: t.text }}>{src.label}</div>
                <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{src.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RevenueScenariosTab({ inp, setInp, c, t }) {
  const set = (k) => (v) => setInp((p) => ({ ...p, [k]: v }));

  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
      <div style={{ flex: "0 0 200px", minWidth: 180 }}>
        <div
          style={{
            fontSize: 11,
            color: t.muted,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 12,
          }}
        >
          Inputs
        </div>
        <InputRow
          label="Revenue Goal / Month"
          prefix="$"
          value={inp.goalRevenue}
          onChange={set("goalRevenue")}
          t={t}
        />
        <InputRow
          label="Client Count"
          value={inp.clientCount}
          onChange={set("clientCount")}
          t={t}
        />
        <InputRow
          label="Target ACV"
          hint="Used for Premium scenario"
          prefix="$"
          value={inp.targetAcv}
          onChange={set("targetAcv")}
          t={t}
        />
      </div>
      <div style={{ flex: 1, minWidth: 280 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <StatCard
            label="Current MRR"
            value={<AnimatedNumber value={c.currentMrr} prefix="$" decimals={0} />}
            accent={t.text}
            t={t}
          />
          <StatCard
            label="Gap to Goal"
            value={<AnimatedNumber value={Math.abs(c.gap)} prefix="$" decimals={0} />}
            accent={c.gap > 0 ? t.amber : t.green}
            sub={c.gap <= 0 ? "Goal reached!" : undefined}
            t={t}
          />
          <StatCard
            label="Monthly Growth #"
            value={<AnimatedNumber value={c.monthlyGrowthNumber} decimals={0} />}
            sub="New recurring clients/mo needed"
            accent={t.purple}
            t={t}
          />
        </div>

        {/* 5 Scenarios */}
        {c.scenarios.map((s, i) => (
          <div
            key={i}
            style={{
              background: t.surface,
              border: `1px solid ${s.tag === "RECOMMENDED" ? t.green : s.color + "40"}`,
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 600, color: t.text }}>{s.label}</span>
                {s.tag && <Badge label={s.tag} color={s.tag === "RECOMMENDED" ? t.green : s.color} />}
              </div>
              <span style={{ fontFamily: "DM Mono", color: s.color, fontWeight: 600, fontSize: 13 }}>
                {s.is90Day
                  ? `${s.pct90.toFixed(0)}% of goal`
                  : `$${s.acv.toFixed(0)}/mo · $${(c.freqDiv > 0 ? s.acv / c.freqDiv : 0).toFixed(0)}/job`}
              </span>
            </div>
            <ProgressBar value={s.projected} max={inp.goalRevenue} color={s.color} t={t} />
            {s.is90Day ? (
              <div style={{ fontSize: 12, color: t.muted, marginTop: 8, lineHeight: 1.5 }}>
                Without raising a single price — just 5 new clients/month × 3 months = +{s.newClients90} clients — you reach{" "}
                <span style={{ fontFamily: "DM Mono", color: s.color }}>${s.projected90Rev.toLocaleString()}</span>/month.
                That's{" "}
                <span style={{ fontFamily: "DM Mono", color: s.color }}>{s.pct90.toFixed(0)}%</span> of your goal.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 8,
                  fontSize: 12,
                  color: t.muted,
                }}
              >
                <span>+{s.newClients} new clients needed</span>
                <span>
                  <span style={{ fontFamily: "DM Mono", color: t.text }}>
                    ${s.projected.toLocaleString()}/mo
                  </span>
                  <span style={{ color: t.muted }}> · </span>
                  <span style={{ fontFamily: "DM Mono", color: t.muted }}>
                    Annual: ${(s.projected * 12).toLocaleString()}
                  </span>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NewClientAcvTab({ inp, setInp, c, t }) {
  const set = (k) => (v) => setInp((p) => ({ ...p, [k]: v }));

  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
      <div style={{ flex: "0 0 200px", minWidth: 180 }}>
        <div
          style={{
            fontSize: 11,
            color: t.muted,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 12,
          }}
        >
          Inputs
        </div>
        <InputRow
          label="Revenue Goal / Month"
          prefix="$"
          value={inp.goalRevenue}
          onChange={set("goalRevenue")}
          t={t}
        />
        <InputRow
          label="Existing Client Count"
          value={inp.clientCount}
          onChange={set("clientCount")}
          t={t}
        />
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 10,
            padding: "12px 14px",
            marginTop: 8,
          }}
        >
          <div style={{ fontSize: 11, color: t.muted }}>Legacy Revenue</div>
          <div style={{ fontFamily: "DM Mono", fontWeight: 700, color: t.amber, fontSize: 18 }}>
            ${c.legacyRevenue.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: t.muted, marginTop: 2 }}>
            Locked — stays at ${c.currentAcv.toFixed(0)}/mo
          </div>
          <div style={{ fontSize: 11, color: t.muted, marginTop: 8 }}>Need from New</div>
          <div style={{ fontFamily: "DM Mono", fontWeight: 700, color: t.red, fontSize: 18 }}>
            ${c.needFromNew.toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 280 }}>
        <div style={{ fontSize: 13, color: t.muted, marginBottom: 12 }}>
          Your <strong style={{ color: t.amber }}>{inp.clientCount} existing clients</strong> stay at{" "}
          <span style={{ fontFamily: "DM Mono", color: t.amber }}>${c.currentAcv.toFixed(0)}/mo</span>.
          New clients are repriced to hit your goal.
        </div>
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: t.bg }}>
                {["New Clients", "ACV/mo Needed", "Price/Job", "Hits Goal"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      textAlign: h === "New Clients" ? "left" : "right",
                      color: t.muted,
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.newClientRows.map((row) => (
                <tr
                  key={row.n}
                  style={{
                    borderTop: `1px solid ${t.border}`,
                    background: row.hitsGoal ? t.green + "0a" : "transparent",
                  }}
                >
                  <td style={{ padding: "10px 14px", color: t.text, fontFamily: "DM Mono", fontWeight: 600 }}>
                    {row.n}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right", color: t.amber, fontFamily: "DM Mono" }}>
                    {row.acvForN > 0 ? `$${row.acvForN.toFixed(0)}/mo` : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right", color: t.text, fontFamily: "DM Mono" }}>
                    {row.pricePerJob > 0 ? `$${row.pricePerJob.toFixed(0)}` : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    <Badge label={row.hitsGoal ? "✓ Yes" : "No"} color={row.hitsGoal ? t.green : t.muted} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* How the math works */}
        <div style={{
          background: t.blue + "12",
          border: `1px solid ${t.blue}40`,
          borderRadius: 10,
          padding: "12px 14px",
          marginTop: 12,
          fontSize: 12,
          color: t.text,
          lineHeight: 1.6,
        }}>
          <div style={{ fontWeight: 700, color: t.blue, marginBottom: 4 }}>📐 How this table works</div>
          <div><strong>Price/Job</strong> is your per-visit rate based on current frequency.</div>
          <div style={{ marginTop: 4 }}>
            Example: <span style={{ fontFamily: "DM Mono", color: t.amber }}>$220/job × 2 visits = $440/mo ACV</span> — that's the monthly value of one biweekly client.
          </div>
          <div style={{ marginTop: 4 }}>The "ACV/mo Needed" column shows what each new client must pay per month to hit your goal with that many new clients.</div>
        </div>

        {/* Revenue Source Ideas */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: t.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
            💡 Ways to Grow Your ACV — Revenue Source Ideas
          </div>
          {[
            { label: "Biweekly Residential (Premium)", acv: "$400–$600/mo", desc: "Your core. Move clients from monthly → biweekly and raise rates $20–$40/visit." },
            { label: "Weekly Residential", acv: "$700–$1,200/mo", desc: "High-income households who want weekly. 4 visits/month = 2× the ACV of biweekly." },
            { label: "Airbnb / Short-Term Rentals", acv: "$500–$1,500/mo", desc: "Turnover cleans between guests. 4–8 cleans/month at $100–$200 each. Hosts pay fast." },
            { label: "Apartment Turnover Cleaning", acv: "$800–$2,000/mo", desc: "Work with property managers for move-in/move-out cleans. High volume, steady pipeline." },
            { label: "Property Management Partnerships", acv: "$2,000–$8,000/mo", desc: "One contract = 10–50+ units. Target companies managing 50–500 unit portfolios in your area." },
            { label: "Small Commercial Offices", acv: "$600–$2,500/mo", desc: "2–5x/week cleaning. Higher frequency = higher ACV per account. Stable, low-churn clients." },
            { label: "Post-Construction Cleaning", acv: "$300–$1,500/job", desc: "One-time but high ticket. Partner with local contractors and builders for referrals." },
          ].map((src) => (
            <div key={src.label} style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 8,
              background: t.surface,
              border: `1px solid ${t.border}`,
              marginBottom: 6,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: t.text }}>{src.label}</span>
                  <span style={{ fontFamily: "DM Mono", fontSize: 12, color: t.green }}>{src.acv}</span>
                </div>
                <div style={{ fontSize: 11, color: t.muted, marginTop: 3 }}>{src.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const STAGES_LIST = [
  { n: 1, name: "Validation", range: "Under $10K", focus: "Price at floor or above — build recurring base" },
  { n: 2, name: "Stability", range: "$10K–$20K", focus: "Stop doing everything yourself — document, delegate, build reserves" },
  { n: 3, name: "Systems", range: "$20K–$35K", focus: "Route optimization, raise prices 5–8%, build manager layer" },
  { n: 4, name: "Leadership", range: "$35K–$50K", focus: "Tiered pricing, retention systems, develop team leads" },
  { n: 5, name: "Ownership", range: "$50K–$75K", focus: "Target 55–65% gross margin, systems run without you" },
  { n: 6, name: "Scale", range: "$75K–$100K", focus: "Multiple revenue streams, brand authority, operational infrastructure" },
  { n: 7, name: "Enterprise", range: "$100K+", focus: "Think in ACV + lifetime value — this is a portfolio, not a job" },
];

const STAGE_WARNINGS = [
  "",
  "Most businesses fail here by underpricing. Know your floor — stay above it.",
  "Owner-dependency is the top risk. If you stop working, revenue stops. Fix this now.",
  "Route optimization and price increases unlock the next level. Don't skip them.",
  "Without a team lead, you hit a ceiling. Hire before you need to.",
  "Margin compression is the silent killer at this stage. Watch cost per job closely.",
  "Scale without systems is chaos. Every process must be documented before expanding.",
  "At $100K+ you're running a portfolio. Protect your best accounts.",
];

const PHASES_LIST = [
  { label: "Break $10K", target: 10000 },
  { label: "Confirm Premium Works", target: 15000 },
  { label: "Scale Intelligently", target: 20000 },
  { label: "Market Dominance", target: 25000 },
  { label: "Operational Strength", target: 30000 },
  { label: "Systems Running", target: 35000 },
  { label: "Owner Optional", target: 40000 },
  { label: "Full Ownership", target: 50000 },
  { label: "Multi-Crew Operation", target: 60000 },
  { label: "Regional Presence", target: 75000 },
  { label: "Scalable Infrastructure", target: 85000 },
  { label: "Enterprise Ready", target: 100000 },
];

const READINESS_CHECKS = [
  { key: "margin45", label: "Gross margin above 45%" },
  { key: "contractorStable", label: "Contractor team is stable" },
  { key: "ownerNotCleaning", label: "Owner not cleaning" },
  { key: "closeRate", label: "Close rate is consistent" },
  { key: "stressDecreasing", label: "Stress is decreasing" },
];

function GrowthLadderTab({ inp, c, t }) {
  const [checks, setChecks] = useState({
    margin45: false,
    contractorStable: false,
    ownerNotCleaning: false,
    closeRate: false,
    stressDecreasing: false,
  });
  const checkedCount = Object.values(checks).filter(Boolean).length;
  const rev = inp.totalRevenue;

  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
      {/* Stage Ladder */}
      <div style={{ flex: 1, minWidth: 220 }}>
        <div
          style={{
            fontSize: 11,
            color: t.muted,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 12,
          }}
        >
          Stage Ladder
        </div>

        {/* Monthly Growth Number card */}
        {c.gap > 0 && c.currentAcv > 0 && (
          <div
            style={{
              background: t.purple + "12",
              border: `1px solid ${t.purple}40`,
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 12, color: t.muted, marginBottom: 4 }}>Monthly Growth Number</div>
            <div style={{ fontFamily: "DM Mono", fontWeight: 700, fontSize: 22, color: t.purple }}>
              {c.monthlyGrowthNumber} new clients/mo
            </div>
            <div style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>
              To close your <span style={{ fontFamily: "DM Mono", color: t.amber }}>${Math.abs(c.gap).toLocaleString()}</span> gap at current ACV
            </div>
          </div>
        )}

        {STAGES_LIST.map((s) => {
          const isCurrent = s.n === c.stage.n;
          return (
            <div
              key={s.n}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 10,
                marginBottom: 8,
                background: isCurrent ? t.green + "15" : t.surface,
                border: `1px solid ${isCurrent ? t.green : t.border}`,
                transition: "all 300ms",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: isCurrent ? t.green : t.border,
                  color: isCurrent ? "#fff" : t.muted,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                {s.n}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, color: isCurrent ? t.green : t.text, fontSize: 14 }}>
                    {s.name}
                  </span>
                  {isCurrent && <Badge label="You Are Here" color={t.green} />}
                </div>
                <div style={{ fontSize: 12, color: t.muted }}>{s.range}</div>
                <div style={{ fontSize: 11, color: isCurrent ? t.green : t.muted, marginTop: 4, lineHeight: 1.4 }}>
                  {s.focus}
                </div>
                {isCurrent && STAGE_WARNINGS[s.n] && (
                  <div style={{
                    marginTop: 6,
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: t.amber + "15",
                    border: `1px solid ${t.amber}40`,
                    fontSize: 11,
                    color: t.amber,
                    lineHeight: 1.4,
                  }}>
                    ⚠️ {STAGE_WARNINGS[s.n]}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Readiness + Phase Ladder */}
      <div style={{ flex: 1, minWidth: 220 }}>
        <div
          style={{
            fontSize: 11,
            color: t.muted,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 12,
          }}
        >
          Scale Readiness
        </div>
        {READINESS_CHECKS.map((ck) => (
          <CheckItem
            key={ck.key}
            label={ck.label}
            checked={checks[ck.key]}
            onChange={(v) => setChecks((p) => ({ ...p, [ck.key]: v }))}
            t={t}
          />
        ))}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: t.muted }}>Readiness Score</span>
            <span style={{ fontFamily: "DM Mono", fontWeight: 700, color: checkedCount >= 4 ? t.green : t.amber }}>
              {checkedCount}/5
            </span>
          </div>
          <ProgressBar value={checkedCount} max={5} color={checkedCount >= 4 ? t.green : t.amber} t={t} />
          {checkedCount === 5 && (
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <Badge label="✓ READY TO SCALE" color={t.green} />
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: 11,
            color: t.muted,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            margin: "24px 0 12px",
          }}
        >
          Revenue Phase Ladder
        </div>
        {PHASES_LIST.map((ph, i) => {
          const prev = i > 0 ? PHASES_LIST[i - 1].target : 0;
          const done = rev >= ph.target;
          const progress = Math.min(Math.max(rev - prev, 0), ph.target - prev);
          const range = ph.target - prev;
          return (
            <div key={ph.target} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: done ? t.green : t.text }}>{ph.label}</span>
                <span style={{ fontSize: 11, fontFamily: "DM Mono", color: t.muted }}>
                  ${(ph.target / 1000).toFixed(0)}K
                </span>
              </div>
              <ProgressBar value={progress} max={range} color={done ? t.green : t.blue} t={t} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InsightsTab({ inp, c, t }) {
  const [apiKey, setApiKey] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const buildPrompt = () => `You are a financial advisor for a service business owner using a subcontractor labor model. Analyze their metrics and deliver concise, actionable insights.

Business Snapshot:
- Total Revenue: $${inp.totalRevenue.toLocaleString()}/mo | Recurring: $${c.recRevenue.toFixed(0)} | One-time: $${inp.oneTimeRevenue.toLocaleString()}
- Jobs: ${inp.totalJobs} total | ${c.recJobs} recurring | ${c.otJobs} one-time
- Recurring Avg Charge: $${c.recAvgCharge.toFixed(0)}/job
- Worker Payout: $${c.workerPayout.toFixed(0)}/job (${c.effectiveLaborPct.toFixed(1)}% effective labor)
- All-In Cost Per Job: $${c.totalCostPerJob.toFixed(0)}/job (includes labor, overhead, cancellation adj)
- Gross Margin: ${c.grossMargin.toFixed(1)}%
- Price Floor: $${c.priceFloor.toFixed(0)}/job (at ${inp.targetMargin}% target margin)
- Recommended New Client Rate: $${c.recommendedNewClientRate}/job
- Leakage: $${c.leakagePerJob.toFixed(0)}/job | $${c.leakagePerClient.toFixed(0)}/client/mo | $${c.totalLeakage.toFixed(0)} total/mo
- Clients: ${inp.clientCount} | ACV: $${c.currentAcv.toFixed(0)}/mo | MRR: $${c.currentMrr.toFixed(0)}
- Revenue Goal: $${inp.goalRevenue.toLocaleString()}/mo | Gap: $${c.gap.toFixed(0)}
- Business Stage: ${c.stage.n} — ${c.stage.name}

Respond using EXACTLY these 5 section markers (no extra text before [DIAGNOSIS]):

[DIAGNOSIS]
Current state of margin and pricing health. Be specific, use the numbers.

[ROOT CAUSE]
Primary underlying driver of any margin issues or gaps.

[RECOMMENDED PATH]
Single best strategic move for the next 30 days.

[THIS WEEK]
3 specific, actionable tasks to do this week.

[PRICING READINESS]
Is this business ready to raise prices? What supports or blocks it?

Keep each section 3–5 sentences. Be direct and specific.`;

  const generate = async () => {
    if (!apiKey) return;
    setText("");
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "messages-2023-12-15",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 900,
          stream: true,
          messages: [{ role: "user", content: buildPrompt() }],
        }),
        signal: abortRef.current.signal,
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const evt = JSON.parse(data);
            if (evt.type === "content_block_delta" && evt.delta?.text) {
              setText((p) => p + evt.delta.text);
            }
          } catch {}
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        setText(
          "[DIAGNOSIS]\nCould not reach Claude API. Please check your API key and try again."
        );
      }
    }
    setLoading(false);
  };

  const snapshot = [
    { label: "MRR", value: `$${c.currentMrr.toFixed(0)}`, color: t.text },
    {
      label: "Gross Margin",
      value: `${c.grossMargin.toFixed(1)}%`,
      color: c.grossMargin >= 45 ? t.green : t.red,
    },
    {
      label: "All-In Cost/Job",
      value: `$${c.totalCostPerJob.toFixed(0)}`,
      color: t.amber,
    },
    {
      label: "Leakage",
      value: `$${Math.abs(c.totalLeakage).toFixed(0)}`,
      color: c.totalLeakage < 0 ? t.red : t.green,
    },
    { label: `Stage ${c.stage.n}`, value: c.stage.name, color: t.purple },
  ];

  return (
    <div>
      {/* Snapshot Bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {snapshot.map((s) => (
          <div
            key={s.label}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              padding: "8px 14px",
              flex: 1,
              minWidth: 80,
            }}
          >
            <div style={{ fontSize: 11, color: t.muted }}>{s.label}</div>
            <div style={{ fontFamily: "DM Mono", fontWeight: 700, color: s.color, fontSize: 15 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* API Key input (shown when no text yet) */}
      {!text && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, color: t.muted, marginBottom: 6 }}>
            Claude API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 8,
              border: `1px solid ${t.border}`,
              background: t.bg,
              color: t.text,
              fontSize: 13,
              outline: "none",
              fontFamily: "DM Mono, monospace",
              boxSizing: "border-box",
            }}
          />
          <div style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>
            Your key stays in your browser — never stored or shared.
          </div>
        </div>
      )}

      {/* Empty state */}
      {!text && !loading && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 14, animation: "pulse 2s ease-in-out infinite" }}>
            ✨
          </div>
          <button
            onClick={generate}
            disabled={!apiKey}
            style={{
              padding: "14px 32px",
              borderRadius: 12,
              border: "none",
              cursor: apiKey ? "pointer" : "not-allowed",
              background: apiKey ? t.purple : t.border,
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              boxShadow: apiKey ? `0 0 24px ${t.purple}50` : "none",
              fontFamily: "Instrument Sans, sans-serif",
            }}
          >
            Generate My Insights
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && !text && (
        <div style={{ textAlign: "center", padding: "32px 0", color: t.muted }}>
          <div style={{ fontSize: 32, marginBottom: 10, animation: "pulse 1.5s ease-in-out infinite" }}>
            ✨
          </div>
          <div>Analyzing your numbers...</div>
        </div>
      )}

      {/* Streaming output */}
      {text && <StreamingInsight text={text} isStreaming={loading} t={t} />}

      {/* Post-gen controls */}
      {text && !loading && (
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={generate}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: `1px solid ${t.purple}`,
              background: "transparent",
              color: t.purple,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ↻ Regenerate
          </button>
          <button
            onClick={() => setText("")}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: `1px solid ${t.border}`,
              background: "transparent",
              color: t.muted,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

const TABS = [
  "Price Floor",
  "Premium Model",
  "Revenue Scenarios",
  "New Client ACV",
  "Growth Ladder",
  "Insights",
];

const DEFAULT_INP = {
  payType: "percent",
  laborPct: 40,
  flatPay: 0,
  hourlyRate: 0,
  totalRevenue: 0,
  oneTimeRevenue: 0,
  totalJobs: 0,
  recurringJobsCount: 0,
  clientCount: 0,
  freqType: "biweekly",
  jobHours: 3,
  targetMargin: 50,
  targetAcv: 0,
  goalRevenue: 0,
  suppliesPerJob: 10,
  driveTimeCost: 8,
  insurancePerJob: 6,
  platformFeePct: 0,
  cancellationRate: 5,
};

const DEFAULT_QS = {
  payType: "percent",
  laborPct: "",
  flatPay: "",
  hourlyRate: "",
  jobHours: "",
  totalRevenue: "",
  oneTimeRevenue: "",
  totalJobs: "",
  recurringJobs: "",
  clientCount: "",
  freqType: "biweekly",
  targetAcv: "",
  goalRevenue: "",
  suppliesPerJob: "",
  driveTimeCost: "",
  insurancePerJob: "",
  platformFeePct: "",
  cancellationRate: "",
};

export default function MarginPlugin() {
  const [dark, setDark] = useState(false); // CleanAIOS default: light
  const [showQS, setShowQS] = useState(true);
  const [tab, setTab] = useState(0);
  const [inp, setInp] = useState(DEFAULT_INP);
  const [qs, setQs] = useState(DEFAULT_QS);

  const t = dark ? DARK : LIGHT;
  const n = (v) => parseFloat(v) || 0;

  const buildFromQS = () => {
    const recRevenue = n(qs.totalRevenue) - n(qs.oneTimeRevenue);
    const recJobs = n(qs.recurringJobs) > 0 ? n(qs.recurringJobs) : n(qs.totalJobs);
    const recAvg = recJobs > 0 ? recRevenue / recJobs : 0;

    let subCost = 0;
    if (qs.payType === "percent") subCost = Math.round((n(qs.laborPct) / 100) * recAvg);
    else if (qs.payType === "flat") subCost = n(qs.flatPay);
    else if (qs.payType === "hourly") subCost = Math.round(n(qs.hourlyRate) * n(qs.jobHours));

    const laborPct =
      n(qs.laborPct) > 0
        ? n(qs.laborPct)
        : recAvg > 0
        ? (subCost / recAvg) * 100
        : 40;
    const targetMargin = Math.round(100 - laborPct);
    const targetAcv =
      n(qs.targetAcv) > 0
        ? n(qs.targetAcv)
        : n(qs.clientCount) > 0
        ? Math.round(n(qs.goalRevenue) / n(qs.clientCount))
        : 0;

    setInp({
      payType: qs.payType,
      laborPct,
      flatPay: n(qs.flatPay),
      hourlyRate: n(qs.hourlyRate),
      totalRevenue: n(qs.totalRevenue),
      oneTimeRevenue: n(qs.oneTimeRevenue),
      totalJobs: n(qs.totalJobs),
      recurringJobsCount: n(qs.recurringJobs),
      clientCount: n(qs.clientCount),
      freqType: qs.freqType,
      jobHours: n(qs.jobHours) || 3,
      targetMargin,
      targetAcv,
      goalRevenue: n(qs.goalRevenue),
      suppliesPerJob: n(qs.suppliesPerJob) || 10,
      driveTimeCost: n(qs.driveTimeCost) || 8,
      insurancePerJob: n(qs.insurancePerJob) || 6,
      platformFeePct: n(qs.platformFeePct) || 0,
      cancellationRate: n(qs.cancellationRate) || 5,
    });
    setShowQS(false);
  };

  const loadSample = () => {
    setInp({
      payType: SAMPLE.payType,
      laborPct: SAMPLE.laborPct,
      flatPay: SAMPLE.flatPay,
      hourlyRate: SAMPLE.hourlyRate,
      totalRevenue: SAMPLE.totalRevenue,
      oneTimeRevenue: SAMPLE.oneTimeRevenue,
      totalJobs: SAMPLE.totalJobs,
      recurringJobsCount: SAMPLE.recurringJobsCount,
      clientCount: SAMPLE.clientCount,
      freqType: SAMPLE.freqType,
      jobHours: SAMPLE.jobHours,
      targetMargin: 60,
      targetAcv: SAMPLE.targetAcv || 0,
      goalRevenue: SAMPLE.goalRevenue,
      suppliesPerJob: SAMPLE.suppliesPerJob,
      driveTimeCost: SAMPLE.driveTimeCost,
      insurancePerJob: SAMPLE.insurancePerJob,
      platformFeePct: SAMPLE.platformFeePct,
      cancellationRate: SAMPLE.cancellationRate,
    });
    setShowQS(false);
  };

  const c = calc(inp);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        fontFamily: "Instrument Sans, sans-serif",
        color: t.text,
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* Header */}
      <div
        style={{
          background: t.surface,
          borderBottom: dark ? `1px solid ${t.border}` : `2px solid #75D3DF`,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 400, color: dark ? t.green : "#75D3DF", fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.02em" }}>
            Margin &amp; Stabilization
          </span>
          {!showQS && (
            <Badge label={`Stage ${c.stage.n} — ${c.stage.name}`} color={t.purple} />
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!showQS && (
            <>
              <button
                onClick={() => setShowQS(true)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: `1px solid ${t.border}`,
                  background: "transparent",
                  color: t.muted,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                ↩ Re-enter
              </button>
              <button
                onClick={loadSample}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: `1px solid ${t.border}`,
                  background: "transparent",
                  color: t.muted,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Load Sample
              </button>
            </>
          )}
          <button
            onClick={() => setDark((d) => !d)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${t.border}`,
              background: "transparent",
              color: t.muted,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      {/* Content */}
      {showQS ? (
        <QuickStartScreen qs={qs} setQs={setQs} onBuild={buildFromQS} t={t} />
      ) : (
        <div>
          {/* Tab Bar */}
          <div
            style={{
              background: t.surface,
              borderBottom: `1px solid ${t.border}`,
              padding: "0 24px",
              display: "flex",
              gap: 2,
              overflowX: "auto",
            }}
          >
            {TABS.map((label, i) => (
              <button
                key={i}
                onClick={() => setTab(i)}
                style={{
                  padding: "13px 16px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: tab === i ? t.blue : t.muted,
                  fontWeight: tab === i ? 700 : 500,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  borderBottom: `2px solid ${tab === i ? t.blue : "transparent"}`,
                  transition: "all 200ms",
                  fontFamily: "Instrument Sans, sans-serif",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: "24px" }}>
            {tab === 0 && <PriceFloorTab inp={inp} setInp={setInp} c={c} t={t} />}
            {tab === 1 && <PremiumModelTab inp={inp} setInp={setInp} c={c} t={t} />}
            {tab === 2 && <RevenueScenariosTab inp={inp} setInp={setInp} c={c} t={t} />}
            {tab === 3 && <NewClientAcvTab inp={inp} setInp={setInp} c={c} t={t} />}
            {tab === 4 && <GrowthLadderTab inp={inp} c={c} t={t} />}
            {tab === 5 && <InsightsTab inp={inp} c={c} t={t} />}
          </div>
        </div>
      )}
    </div>
  );
}
