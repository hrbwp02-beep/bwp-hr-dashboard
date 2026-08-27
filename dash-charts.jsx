// dash-charts.jsx — กราฟพื้นฐานของแดชบอร์ด (ใช้ตัวเลขจริงทั้งหมด)
const { useState: useD1 } = React;

/* แถบแนวนอน + ค่าตัวเลข */
function DBarH({ rows, unit, max, showBase }) {
  const m = max != null ? max : Math.max(1, ...rows.map((r) => r.v));
  if (!rows.length) return <DEmpty text="ยังไม่มีข้อมูล" />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {rows.map((r) => (
        <div key={r.label} className="row" style={{ gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12.5, minWidth: 96, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            title={r.label}>{r.label}</span>
          <div style={{ flex: 1, height: 16, borderRadius: 5, background: "var(--surface-3)", overflow: "hidden" }}>
            <div style={{ width: Math.min(100, (r.v / m) * 100) + "%", height: "100%", background: r.color || "var(--accent)", borderRadius: 5, transition: "width .4s" }} />
          </div>
          <span className="mono" style={{ fontWeight: 600, fontSize: 12.5, minWidth: unit === "%" ? 52 : 40, textAlign: "right" }}>
            {r.v}{unit || ""}{showBase && r.base != null ? <span className="muted" style={{ fontWeight: 400 }}> /{r.base}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

/* แท่งแนวตั้ง (ช่วงอายุ) */
function DBarV({ rows, unit }) {
  const m = Math.max(1, ...rows.map((r) => r.v));
  return (
    <div className="row" style={{ gap: 8, alignItems: "flex-end", justifyContent: "space-around", minHeight: 150 }}>
      {rows.map((r, i) => (
        <div key={r.label} style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{r.v}</div>
          <div style={{ height: 96, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div title={r.label + " : " + r.v} style={{ width: "68%", maxWidth: 42, height: Math.max(4, (r.v / m) * 94),
              background: DASH.PALETTE[i % DASH.PALETTE.length], borderRadius: "6px 6px 0 0", transition: "height .4s" }} />
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 6, whiteSpace: "nowrap" }}>{r.label}</div>
          {r.pct != null && <div className="mono muted" style={{ fontSize: 10.5 }}>{r.pct}%</div>}
        </div>
      ))}
    </div>
  );
}

/* เส้นแนวโน้ม (อัตราลาออกรายเดือน) */
function DLine({ points, unit, height }) {
  const h = height || 150, w = 320, pad = 26;
  const vals = points.map((p) => p.rate != null ? p.rate : p.v);
  const max = Math.max(1, ...vals);
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const xy = (i) => [pad + i * step, h - 22 - (vals[i] / max) * (h - 46)];
  const path = points.map((_, i) => (i ? "L" : "M") + xy(i).join(" ")).join(" ");
  const area = path + ` L ${xy(points.length - 1)[0]} ${h - 22} L ${xy(0)[0]} ${h - 22} Z`;
  const [hi, setHi] = useD1(-1);
  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", minWidth: 300, height: "auto", display: "block" }} role="img" aria-label="กราฟแนวโน้ม">
        {[0, .5, 1].map((f) => (
          <line key={f} x1={pad} x2={w - pad} y1={h - 22 - f * (h - 46)} y2={h - 22 - f * (h - 46)}
            stroke="var(--border-2)" strokeWidth="1" />
        ))}
        <path d={area} fill="var(--accent)" opacity=".10" />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => {
          const [x, y] = xy(i);
          return (
            <g key={i} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(-1)}>
              <circle cx={x} cy={y} r={hi === i ? 5 : 3.2} fill="var(--accent)" />
              <rect x={x - step / 2} y="0" width={step || 20} height={h} fill="transparent" />
              {hi === i && <text x={x} y={y - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text)">
                {vals[i]}{unit || ""}</text>}
              {(i % 2 === 0 || points.length <= 7) &&
                <text x={x} y={h - 6} textAnchor="middle" fontSize="10" fill="var(--text-3)">{p.label}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* กรวยการสรรหา */
function DFunnel({ stages }) {
  const max = Math.max(1, ...stages.map((s) => s.v));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {stages.map((s, i) => {
        const wpc = 40 + (s.v / max) * 60;
        return (
          <div key={s.label} className="row" style={{ gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12.5, minWidth: 108 }}>{s.label}</span>
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <div style={{ width: wpc + "%", padding: "7px 10px", borderRadius: 7, textAlign: "center",
                background: DASH.PALETTE[2], opacity: 1 - i * 0.14, color: "#fff", fontWeight: 700, fontSize: 13 }}>
                {s.v}
              </div>
            </div>
            <span className="mono muted" style={{ fontSize: 11.5, minWidth: 42, textAlign: "right" }}>
              {i > 0 && stages[i - 1].v ? DASH.pct(s.v, stages[i - 1].v) + "%" : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* โดนัทอย่างง่าย (ใช้เมื่อไม่ต้องการ legend ของ charts.jsx) */
function DDonut({ rows, centerLabel, centerValue }) {
  const total = rows.reduce((a, r) => a + r.v, 0);
  if (!total) return <DEmpty text="ยังไม่มีข้อมูล" />;
  const R = 54, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="row wrap" style={{ gap: 18, alignItems: "center", justifyContent: "center" }}>
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={centerLabel || "สัดส่วน"}>
        <g transform="translate(70,70) rotate(-90)">
          {rows.map((r) => {
            const len = (r.v / total) * C;
            const el = <circle key={r.label} r={R} fill="none" stroke={r.color} strokeWidth="20"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} />;
            acc += len; return el;
          })}
        </g>
        <text x="70" y="66" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--text)">{centerValue != null ? centerValue : total}</text>
        <text x="70" y="84" textAnchor="middle" fontSize="10.5" fill="var(--text-3)">{centerLabel || ""}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 140 }}>
        {rows.map((r) => (
          <div key={r.label} className="between" style={{ gap: 12, fontSize: 12.5 }}>
            <span className="row" style={{ gap: 7, minWidth: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: r.color, flex: "0 0 10px" }} />
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</span>
            </span>
            <span className="mono" style={{ fontWeight: 600 }}>{r.v} <span className="muted">({DASH.pct(r.v, total)}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* แถวตัวเลข */
function DStatRow({ items }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {items.map((it) => (
        <div key={it.label} className="between" style={{ padding: "9px 0", borderBottom: "1px solid var(--border-2)", gap: 12 }}>
          <span className="row" style={{ gap: 9, fontSize: 13 }}>
            {it.icon && <span style={{ color: it.color || "var(--accent)" }}><Icon name={it.icon} size={16} /></span>}
            {it.label}
          </span>
          <span className="mono" style={{ fontWeight: 700, fontSize: 14, color: it.color || "var(--text)" }}>
            {it.value}{it.unit ? <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}> {it.unit}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

/* สถานะว่าง / ยังไม่มีระบบ */
function DEmpty({ text, sub, icon }) {
  return (
    <div style={{ textAlign: "center", padding: "26px 14px" }}>
      <span style={{ color: "var(--text-3)" }}><Icon name={icon || "clock"} size={30} /></span>
      <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 9 }}>{text}</div>
      {sub && <div className="muted" style={{ fontSize: 12.5, marginTop: 5, lineHeight: 1.7, maxWidth: 340, margin: "5px auto 0" }}>{sub}</div>}
    </div>
  );
}

/* หัวการ์ดแบบมีเลขลำดับ */
function DHead({ n, title, sub, color, right }) {
  return (
    <div className="between" style={{ padding: "15px 18px 12px", borderBottom: "1px solid var(--border-2)", gap: 10 }}>
      <div className="row" style={{ gap: 11, minWidth: 0 }}>
        <span style={{ width: 27, height: 27, borderRadius: 9, background: color, color: "#fff",
          display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13.5, flex: "0 0 27px" }}>{n}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color }}>{title}</div>
          {sub && <div className="muted" style={{ fontSize: 12 }}>{sub}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

Object.assign(window, { DBarH, DBarV, DLine, DFunnel, DDonut, DStatRow, DEmpty, DHead });
