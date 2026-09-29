// dash-app.jsx — BWP HR Dashboard : 5 มุมมองหลักด้านกำลังคน
// รองรับ: ขอบเขตสิทธิ์รายหน่วยงาน · คลิกกราฟเพื่อเจาะดู/ดูรายชื่อ
const { useState: useD, useEffect: useDE } = React;

const C1 = "#16a34a", C2 = "#2563eb", C3 = "#7c3aed", C4 = "#e08a00", C5 = "#0891b2";

/* ============ 1. สรุปจำนวนพนักงาน ============ */
function SecHeadcount({ onDrill, onPeople }) {
  const h = DASH.headcount();
  return (
    <Card>
      <DHead n="1" color={C1} title="สรุปจำนวนพนักงาน" sub="Headcount Summary" />
      <div className="card-pad">
        <DStatRow items={[
          { label: "พนักงานปัจจุบัน", value: h.current, unit: "คน", icon: "users", color: C1 },
          { label: "พนักงานใหม่ (ปีนี้)", value: h.newYtd, unit: "คน", icon: "employee", color: C2 },
          { label: "พนักงานลาออก (ปีนี้)", value: h.resignYtd, unit: "คน", icon: "logout", color: "#e11d48" },
          { label: "อยู่ระหว่างทดลองงาน", value: h.probation, unit: "คน", icon: "clock", color: C4 },
          { label: "พนักงานสัญญาจ้าง/รายวัน", value: h.contract, unit: "คน", icon: "jd", color: "#64748b" },
        ]} />
        <div style={{ marginTop: 16 }}>
          <div className="between" style={{ marginBottom: 10 }}>
            <span className="muted" style={{ fontSize: 11.5, fontWeight: 700 }}>พนักงานแยกตามหน่วยงาน</span>
            <span className="muted" style={{ fontSize: 11 }}>คลิกเพื่อเจาะดู</span>
          </div>
          <DDonut rows={h.byDept} centerLabel="พนักงาน" centerValue={h.current}
            activeKey={DASH.drill} onPick={(r) => onDrill(r.id)} />
        </div>
      </div>
    </Card>
  );
}

/* ============ 2. อัตราการลาออก ============ */
function SecTurnover({ onDrill, onPeople }) {
  const t = DASH.turnover();
  return (
    <Card>
      <DHead n="2" color={C2} title="อัตราการลาออก" sub="Turnover Rate"
        right={<Badge cls={t.rateYtd > 10 ? "b-red" : t.rateYtd > 5 ? "b-amber" : "b-green"} dot>{t.rateYtd}% (ปีนี้)</Badge>} />
      <div className="card-pad">
        {!t.hasData ? (
          <DEmpty icon="checkCircle" text="ยังไม่มีการลาออกในระบบ"
            sub="เมื่อบันทึกพนักงานพ้นสภาพใน HR Core (เมนู พนักงาน → เปลี่ยนสถานะ) กราฟอัตราการลาออกจะคำนวณให้อัตโนมัติ" />
        ) : (<>
          <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>
            อัตราการลาออกรายเดือน (%) <span style={{ fontWeight: 400 }}>· ชี้เมาส์ที่จุดเพื่อดูค่า</span>
          </div>
          <DLine points={t.months} unit="%" />
          <div style={{ marginTop: 18 }}>
            <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 10 }}>แยกตามหน่วยงาน (ปีนี้)</div>
            <DBarH rows={t.byDept} unit="%" showBase activeKey={DASH.drill} onPick={(r) => onDrill(r.id)} />
          </div>
          <div style={{ marginTop: 18 }}>
            <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 10 }}>แยกตามอายุงาน</div>
            <DBarV rows={t.byTenure.map((b) => ({ label: b.label, v: b.v }))}
              onPick={(r) => onPeople("tenure", r.label, "พนักงานอายุงาน " + r.label)} />
          </div>
        </>)}
      </div>
    </Card>
  );
}

/* ============ 3. การสรรหาและคัดเลือก ============ */
function SecRecruit({ recruit }) {
  const s = recruit && recruit.ok ? recruit.stats : null;
  const fw = s ? DASH.recruitFunnel(s) : null;
  const f = fw ? fw.funnel : null;
  const positions = s ? DASH.recruitPositions(s) : [];
  return (
    <Card>
      <DHead n="3" color={C3} title="การสรรหาและคัดเลือก" sub="New Hire & Recruitment"
        right={s ? <Badge cls="b-teal" dot>{fw.scoped ? "เฉพาะหน่วยงานของคุณ" : "เชื่อมระบบสรรหา"}</Badge> : null} />
      <div className="card-pad">
        {!recruit ? <DEmpty icon="clock" text="กำลังเชื่อมต่อระบบสรรหา…" />
          : !recruit.ok ? <DEmpty icon="alert" text="เชื่อมต่อระบบสรรหาไม่ได้" sub={recruit.error} />
          : f.applicants === 0 ? <DEmpty icon="users" text="ยังไม่มีผู้สมัครในหน่วยงานที่คุณดูแล"
              sub="เมื่อมีใบสมัครในระบบสรรหาสำหรับหน่วยงานนี้ ตัวเลขจะแสดงที่นี่" />
          : (<>
            <DFunnel stages={[
              { label: "ตำแหน่งที่เปิดรับ", v: f.openings },
              { label: "ผู้สมัครทั้งหมด", v: f.applicants },
              { label: "เข้าสัมภาษณ์", v: f.interviewed },
              { label: "ได้รับข้อเสนอ", v: f.offered },
              { label: "เริ่มงานจริง", v: f.started },
            ]} />

            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 }}>
              <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "13px 15px", textAlign: "center" }}>
                <div className="muted" style={{ fontSize: 11.5 }}>ระยะเวลาสรรหาเฉลี่ย</div>
                <div className="mono" style={{ fontSize: 23, fontWeight: 700, color: C3 }}>
                  {s.time_to_hire_days != null ? s.time_to_hire_days : "—"}
                  <span style={{ fontSize: 12.5, fontWeight: 400 }}> วัน</span>
                </div>
                <div className="muted" style={{ fontSize: 10.5 }}>วันที่สมัคร → วันเริ่มงาน (ทั้งบริษัท)</div>
              </div>
              <div style={{ border: "1px dashed var(--border)", borderRadius: 12, padding: "13px 15px", textAlign: "center" }}>
                <div className="muted" style={{ fontSize: 11.5 }}>ต้นทุนต่อการรับ 1 คน</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-3)", marginTop: 6 }}>ยังไม่มีข้อมูล</div>
                <div className="muted" style={{ fontSize: 10.5, marginTop: 2 }}>ต้องบันทึกค่าใช้จ่ายการสรรหา</div>
              </div>
            </div>

            {!fw.scoped && s.open_requests != null && (
              <div style={{ marginTop: 14, fontSize: 12.5, background: "var(--accent-soft)", color: "var(--accent-700)",
                borderRadius: 10, padding: "9px 13px" }}>
                ใบขออัตรากำลังที่ยังเปิดอยู่ <b>{s.open_requests}</b> ใบ · ผู้สมัครที่ยังไม่ผ่านการคัดเลือก{" "}
                <b>{((s.by_status || {})["new"] || 0) + ((s.by_status || {})["interview"] || 0)}</b> คน
              </div>
            )}

            {positions.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 10 }}>ตำแหน่งที่มีผู้สมัครมากที่สุด</div>
                <DBarH rows={positions.map((p, i) => ({
                  label: p.position, v: p.applicants, color: DASH.PALETTE[i % DASH.PALETTE.length],
                }))} />
                <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
                  ตำแหน่งที่ยังหาคนไม่ได้:{" "}
                  {positions.filter((p) => !p.hired).length
                    ? positions.filter((p) => !p.hired).map((p) => p.position).join(" · ")
                    : "— ไม่มี —"}
                </div>
              </div>
            )}
          </>)}
      </div>
    </Card>
  );
}

/* ============ 4. การเข้างานและการลา ============ */
function SecAttendance({ onPeople, onDrill }) {
  const P = DASH.attPeriod;
  const S = P ? DASH.attSummary() : null;

  if (!P || !S) {
    return (
      <Card>
        <DHead n="4" color={C4} title="การเข้างานและการลา" sub="Attendance & Leave"
          right={<Badge cls="b-gray" dot>ยังไม่มีข้อมูล</Badge>} />
        <div className="card-pad">
          <DEmpty icon="calendar" text="ยังไม่มีข้อมูลการเข้างานและการลา"
            sub="นำเข้าไฟล์รายงานตอกบัตรที่ HR Core → เมนู “เวลาทำงานและการลา” แล้วข้อมูลจะขึ้นที่นี่อัตโนมัติ" />
        </div>
      </Card>
    );
  }

  const types = DASH.attLeaveTypes();
  const byDept = DASH.attByDept();
  const otRows = byDept.slice().sort((a, b) => b.otPerHead - a.otPerHead)
    .map((d) => ({ id: d.key, label: d.label, v: d.otPerHead }));
  const absRows = byDept.slice().sort((a, b) => b.absent - a.absent).filter((d) => d.absent > 0)
    .map((d) => ({ id: d.key, label: d.label, v: d.absent }));

  const click = (kind, title) => (onPeople ? () => onPeople(kind, title) : undefined);

  return (
    <Card>
      <DHead n="4" color={C4} title="การเข้างานและการลา" sub="Attendance & Leave"
        right={<Badge cls="b-teal" dot>{P.label || P.id}</Badge>} />
      <div className="card-pad">

        <DStatRow items={[
          { label: "อัตราการเข้างาน", value: S.attendRate + "%", tone: "#16a34a" },
          { label: "อัตราการขาดงาน", value: S.absentRate + "%", tone: "#e11d48" },
          { label: "อัตราการลา", value: S.leaveRate + "%", tone: "#7c3aed" },
          { label: "OT เฉลี่ย/คน", value: S.otPerHead + " ชม.", tone: "#0891b2" },
        ]} />

        <div className="row wrap" style={{ gap: 7, marginTop: 10 }}>
          <button className="chip" onClick={click("absent", "พนักงานที่ขาดงาน · " + (P.label || ""))}>
            ขาดงานรวม <b>{S.absentDays}</b> วัน
          </button>
          <button className="chip" onClick={click("late", "พนักงานที่มาสาย · " + (P.label || ""))}>
            มาสาย <b>{S.lateCount}</b> ครั้ง
          </button>
          <button className="chip" onClick={click("leave", "พนักงานที่ลา · " + (P.label || ""))}>
            ลารวม <b>{S.leaveDays}</b> วัน
          </button>
          <button className="chip" onClick={click("ot", "พนักงานที่ทำ OT · " + (P.label || ""))}>
            OT รวม <b>{S.otHours}</b> ชม.
          </button>
        </div>

        {types.length ? (
          <div style={{ marginTop: 16 }}>
            <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 8 }}>
              การลาแยกประเภท (วัน)
            </div>
            <DBarH rows={types} unit=" วัน" />
          </div>
        ) : null}

        {otRows.length > 1 ? (
          <div style={{ marginTop: 16 }}>
            <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 8 }}>
              OT เฉลี่ยต่อคน รายหน่วยงาน (ชม.)
            </div>
            <DBarH rows={otRows} unit=" ชม." onPick={onDrill ? (r) => onDrill(r.id) : undefined} activeKey={DASH.drill} />
          </div>
        ) : null}

        {absRows.length ? (
          <div style={{ marginTop: 16 }}>
            <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 8 }}>
              ขาดงาน รายหน่วยงาน (วัน)
            </div>
            <DBarH rows={absRows} unit=" วัน" onPick={onDrill ? (r) => onDrill(r.id) : undefined} activeKey={DASH.drill} />
          </div>
        ) : null}

        <div className="muted" style={{ fontSize: 11.5, marginTop: 14, lineHeight: 1.7,
          borderTop: "1px solid var(--border-2)", paddingTop: 10 }}>
          ข้อมูล {S.people} คน · วันทำงานเฉลี่ย {S.avgWorkDays} วัน ·
          นำเข้าเมื่อ {new Date(P.imported_at).toLocaleDateString("th-TH")}
          {P.note ? " · " + P.note : ""}
          <br />พนักงานที่ไม่มีในรายงานตอกบัตรจะไม่ถูกนับ
        </div>
      </div>
    </Card>
  );
}


/* ============ 5. โครงสร้างพนักงาน ============ */
function SecDemographics({ onPeople }) {
  const d = DASH.demographics();
  return (
    <Card>
      <DHead n="5" color={C5} title="โครงสร้างพนักงาน" sub="Employee Demographics"
        right={<span className="muted" style={{ fontSize: 11 }}>คลิกกราฟดูรายชื่อ</span>} />
      <div className="card-pad">
        <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 8 }}>ช่วงอายุ</div>
        <DBarV rows={d.byAge} onPick={(r) => onPeople("age", r.label, "พนักงานช่วงอายุ " + r.label)} />

        <div style={{ marginTop: 18 }}>
          <DStatRow items={[
            { label: "อายุงานเฉลี่ย", value: d.avgTenure, unit: "ปี", icon: "briefcase", color: C5 },
            { label: "อายุเฉลี่ย", value: d.avgAge, unit: "ปี", icon: "calendar", color: C3 },
            { label: "พนักงานประจำ", value: d.permPct, unit: "%", icon: "checkCircle", color: C1 },
            { label: "สัญญาจ้าง/รายวัน", value: d.contractPct, unit: "%", icon: "jd", color: "#64748b" },
            { label: "ชาย / หญิง", value: d.malePct + " / " + d.femalePct, unit: "%", icon: "users", color: C2 },
          ]} />
          {d.noGender > 0 && (
            <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
              * มีพนักงาน {d.noGender} คนที่ยังไม่ระบุเพศ — สัดส่วนคำนวณจากผู้ที่ระบุแล้วเท่านั้น
            </div>
          )}
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 10 }}>ระดับตำแหน่ง</div>
          <DDonut rows={d.byLevel} centerLabel="พนักงาน" centerValue={d.total}
            onPick={(r) => onPeople("level", r.label, "พนักงานระดับ " + r.label)} />
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 10 }}>ช่วงวัย (Generation)</div>
          <DBarH rows={d.byGen} onPick={(r) => onPeople("gen", r.label, "พนักงาน " + r.label)} />
        </div>
      </div>
    </Card>
  );
}

/* ============ Shell ============ */
function DashApp() {
  const [phase, setPhase] = useD("boot");
  const [err, setErr] = useD("");
  const [recruit, setRecruit] = useD(null);
  const [people, setPeople] = useD(null);   // {title, sub, rows}
  const [, force] = useD(0);
  const redraw = () => force((n) => n + 1);

  const boot = async () => {
    setPhase("boot"); setErr("");
    try {
      const { data: { session } } = await window.sb.auth.getSession();
      if (!session) { setPhase("login"); return; }
      await DASH.loadUser();
      if (DASH.unregistered) {
        setErr("บัญชี " + ((DASH.user || {}).email || "") + " ยังไม่ได้ตั้งสิทธิ์ใช้งานในระบบ"
          + " (ไม่มีรายชื่อในตาราง app_users) จึงมองไม่เห็นข้อมูลพนักงานใดๆ"
          + " — โปรดล็อกอินด้วยบัญชีที่ HR กำหนดสิทธิ์ไว้ หรือให้ผู้ดูแลเพิ่มสิทธิ์ให้บัญชีนี้");
        setPhase("error"); return;
      }
      await DASH.load();
      setPhase("ready");
      DASH.loadRecruit().then(setRecruit);
    } catch (e) { setErr(String(e.message || e)); setPhase("error"); }
  };
  useDE(() => { boot(); }, []);

  const reload = async () => {
    await DASH.load(); setRecruit(null);
    DASH.loadRecruit().then(setRecruit);
    redraw(); toast("อัปเดตข้อมูลแล้ว", "refresh");
  };
  const onDrill = (id) => { DASH.setDrill(id); redraw(); };
  const onPeople = (kind, key, title) => {
    const rows = DASH.listBy(kind, key);
    setPeople({ title, sub: DASH.scopeLabel(), rows });
  };
  // รายชื่อจากการ์ดเวลาทำงาน/การลา (ขาดงาน · มาสาย · ลา · OT)
  const onAttPeople = (kind, title) => {
    setPeople({ title, sub: DASH.scopeLabel(), rows: DASH.attPeople(kind) });
  };

  if (phase === "boot") return (<><DashSplash /><ToastHost /></>);
  if (phase === "login") return (<><DashLogin onDone={boot} /><ToastHost /></>);
  if (phase === "error") return (<>
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <Card className="card-pad" style={{ maxWidth: 440, textAlign: "center" }}>
        <span style={{ color: "var(--red)" }}><Icon name="alert" size={38} /></span>
        <h2 style={{ fontSize: 17, margin: "12px 0 6px" }}>โหลดข้อมูลไม่สำเร็จ</h2>
        <p className="muted" style={{ fontSize: 13.5 }}>{err}</p>
        <div className="row" style={{ gap: 9, justifyContent: "center", marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={async () => { await window.sb.auth.signOut(); boot(); }}>ออกจากระบบ</button>
          <button className="btn btn-pri" onClick={boot}><Icon name="refresh" size={15} />ลองใหม่</button>
        </div>
      </Card>
    </div><ToastHost /></>);

  const u = DASH.user || {};
  const h = DASH.headcount();
  const drillable = DASH.drillableDepts();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "14px 0" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px" }} className="between">
          <div className="row" style={{ gap: 13, minWidth: 0 }}>
            <img src="logo.svg" alt="BWP" style={{ width: 40, height: 40 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16.5 }}>แดชบอร์ดกำลังคน</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {DASH.scope.all ? "ทั้งองค์กร" : "เฉพาะหน่วยงานที่คุณดูแล"} · ข้อมูล ณ {new Date().toLocaleDateString("th-TH")}
              </div>
            </div>
          </div>
          <div className="row wrap" style={{ gap: 8 }}>
            <span className="muted hide-sm" style={{ fontSize: 12.5 }}>{u.name || u.email}</span>
            <button className="btn btn-ghost btn-sm" onClick={reload}><Icon name="refresh" size={15} />รีเฟรช</button>
            <a className="btn btn-ghost btn-sm" href={DASH.HUB} style={{ textDecoration: "none" }}>
              <Icon name="chevLeft" size={15} />กลับหน้าหลัก
            </a>
            <button className="icon-btn" aria-label="ออกจากระบบ" title="ออกจากระบบ"
              onClick={async () => { await window.sb.auth.signOut(); location.reload(); }}><Icon name="logout" size={18} /></button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 20px 60px" }}>
        {/* แถบตัวกรอง/เจาะดูหน่วยงาน */}
        {drillable.length > 1 && (
          <div className="row wrap" style={{ gap: 7, marginBottom: 14, alignItems: "center" }}>
            <span className="muted" style={{ fontSize: 12, marginRight: 2 }}>เจาะดู:</span>
            <button onClick={() => onDrill(null)} className="chip-btn"
              style={chipStyle(!DASH.drill)}>ทั้งหมด</button>
            {drillable.map((d) => (
              <button key={d.id} onClick={() => onDrill(d.id)} className="chip-btn"
                style={chipStyle(DASH.drill === d.id)}>{d.short || d.name}</button>
            ))}
          </div>
        )}
        {DASH.drill && (
          <div className="row" style={{ gap: 9, marginBottom: 14, background: "var(--accent-soft)",
            color: "var(--accent-700)", borderRadius: 11, padding: "10px 14px", fontSize: 13 }}>
            <Icon name="search" size={16} />
            <span>กำลังดูเฉพาะ <b>{DASH.deptName(DASH.drill)}</b></span>
            <div className="spacer" style={{ flex: 1 }} />
            <button className="btn btn-ghost btn-sm" onClick={() => onDrill(null)}>ล้างตัวกรอง</button>
          </div>
        )}

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", marginBottom: 18 }}>
          <Stat icon="users" label="พนักงานทั้งหมด" value={h.current} unit="คน" tone={C1} soft="#e7f6ec" sub={DASH.scopeLabel()} />
          <Stat icon="employee" label="เข้าใหม่ปีนี้" value={h.newYtd} unit="คน" tone={C2} soft="#e8effb" />
          <Stat icon="logout" label="ลาออกปีนี้" value={h.resignYtd} unit="คน" tone="#e11d48" soft="#fde8ec" />
          <Stat icon="briefcase" label="หน่วยงาน" value={h.byDept.length} tone={C5} soft="#e0f2ef" />
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", alignItems: "start" }}>
          <SecHeadcount onDrill={onDrill} onPeople={onPeople} />
          <SecTurnover onDrill={onDrill} onPeople={onPeople} />
          <SecRecruit recruit={recruit} />
          <SecAttendance onPeople={onAttPeople} onDrill={onDrill} />
          <SecDemographics onPeople={onPeople} />
        </div>

        <div style={{ marginTop: 22, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
          padding: "16px 20px", fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.85 }}>
          <b style={{ color: "var(--text)" }}>ที่มาของข้อมูล</b> — ข้อ 1, 2, 5 คำนวณสดจากทะเบียนพนักงานใน HR Core ·
          ข้อ 3 ดึงตัวเลขรวมจากระบบสรรหา (ไม่มีข้อมูลส่วนบุคคล) · ข้อ 4 รอระบบลาและบันทึกเวลาทำงาน<br />
          ตัวเลขทั้งหมดมาจากข้อมูลจริงในระบบ ไม่มีการประมาณค่า — ส่วนที่ยังไม่มีข้อมูลจะแสดงว่ายังไม่มี ไม่เดาแทน<br />
          {!DASH.scope.all && <><b style={{ color: "var(--text)" }}>ขอบเขตข้อมูล</b> — บัญชีของคุณเห็นเฉพาะ {DASH.scopeLabel()} ตามสิทธิ์ที่ HR กำหนด</>}
        </div>
      </main>

      {people && <DPeople title={people.title} sub={people.sub} rows={people.rows} onClose={() => setPeople(null)} />}
      <ToastHost />
    </div>
  );
}

function chipStyle(on) {
  return {
    fontSize: 12.5, fontWeight: 600, padding: "6px 13px", borderRadius: 999, cursor: "pointer",
    border: "1px solid " + (on ? "transparent" : "var(--border)"),
    background: on ? "var(--accent)" : "var(--surface)",
    color: on ? "#fff" : "var(--text-2)",
  };
}

function DashSplash() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a1832", color: "#fff" }}>
      <div style={{ textAlign: "center" }}>
        <img src="logo.svg" alt="BWP" style={{ width: 54, height: 54 }} />
        <div style={{ fontWeight: 600, marginTop: 12 }}>แดชบอร์ดกำลังคน</div>
        <div className="boot-spin" style={{ margin: "16px auto 0" }} />
      </div>
    </div>
  );
}

function DashLogin({ onDone }) {
  const [u, setU] = useD("");
  const [p, setP] = useD("");
  const [busy, setBusy] = useD(false);
  const [err, setErr] = useD("");
  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    const { error } = await window.sb.auth.signInWithPassword({ email: u.trim(), password: p });
    if (error) { setBusy(false); setErr("เข้าสู่ระบบไม่สำเร็จ — ตรวจสอบอีเมล/รหัสผ่าน"); return; }
    const { data: au } = await window.sb.from("app_users").select("active").ilike("email", u.trim()).maybeSingle();
    if (au && au.active === false) {
      await window.sb.auth.signOut(); setBusy(false);
      setErr("บัญชีนี้ถูกระงับการใช้งาน"); return;
    }
    setBusy(false); onDone();
  };
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a1832", padding: 22 }}>
      <div style={{ width: "100%", maxWidth: 372 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img src="logo.svg" alt="BWP" style={{ width: 60, height: 60 }} />
          <h1 style={{ color: "#fff", fontSize: 20, margin: "12px 0 4px" }}>แดชบอร์ดกำลังคน</h1>
          <p style={{ color: "rgba(255,255,255,.6)", fontSize: 13, margin: 0 }}>BWP HR Dashboard</p>
        </div>
        <form onSubmit={submit} style={{ background: "rgba(255,255,255,.07)", borderRadius: 16, padding: 22,
          display: "flex", flexDirection: "column", gap: 13 }}>
          {err && <div style={{ padding: "10px 13px", borderRadius: 10, background: "rgba(225,29,72,.18)", color: "#ffd5dd", fontSize: 13 }}>{err}</div>}
          <div className="field"><label style={{ color: "rgba(255,255,255,.8)", fontSize: 12.5 }}>อีเมล</label>
            <input className="input" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username"
              style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.2)", color: "#fff" }} /></div>
          <div className="field"><label style={{ color: "rgba(255,255,255,.8)", fontSize: 12.5 }}>รหัสผ่าน</label>
            <input className="input" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password"
              style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.2)", color: "#fff" }} /></div>
          <button type="submit" className="btn btn-pri" disabled={busy} style={{ padding: 12, marginTop: 4 }}>
            {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </button>
          <a href={DASH.HUB} style={{ color: "#9dc0ff", fontSize: 12.5, textAlign: "center", textDecoration: "none" }}>← กลับหน้าหลัก BWP HR Connect</a>
        </form>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<DashApp />);
