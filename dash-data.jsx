// dash-data.jsx — ชั้นข้อมูลของแดชบอร์ด HR (คำนวณจากข้อมูลจริงเท่านั้น)
// รองรับ: ขอบเขตสิทธิ์รายหน่วยงาน (scope) + การเจาะดูรายหน่วยงาน (drill-down)
const DASH = {};

DASH.HUB = "https://bwp-hr-connect.vercel.app/";
DASH.WORKING = ["ACTIVE", "PROBATION", "ON_LEAVE", "SUSPENDED"];
DASH.MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
DASH.PALETTE = ["#2563eb", "#0d9488", "#7c3aed", "#e08a00", "#db2777", "#0891b2", "#16a34a", "#64748b", "#e11d48"];

DASH.statusOf = (e) => String(e.employment_status || "ACTIVE").toUpperCase();
DASH.isWorking = (e) => DASH.WORKING.indexOf(DASH.statusOf(e)) > -1;
DASH.r1 = (x) => Math.round(x * 10) / 10;
DASH.pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);

/* ---------- ผู้ใช้ + ขอบเขตสิทธิ์ ---------- */
DASH.loadUser = async () => {
  const { data } = await window.sb.auth.getUser();
  const email = ((data && data.user && data.user.email) || "").toLowerCase();
  if (!email) return null;
  const { data: u } = await window.sb.from("app_users").select("*").ilike("email", email).maybeSingle();
  DASH.unregistered = !u;   // มีบัญชีใน Auth แต่ยังไม่ได้ตั้งสิทธิ์ใน app_users
  DASH.user = u || { email, name: email.split("@")[0], role: "viewer" };

  // admin/hr เห็นทั้งองค์กร · บทบาทอื่นเห็นเฉพาะหน่วยงานที่รับผิดชอบ
  const role = String(DASH.user.role || "").toLowerCase();
  const roleCode = String(DASH.user.role_code || "").toUpperCase();
  const isAll = ["admin", "hr"].indexOf(role) > -1 || ["SUPER_ADMIN", "HR_ADMIN", "HR"].indexOf(roleCode) > -1;
  const scoped = Array.isArray(DASH.user.dept_scope) && DASH.user.dept_scope.length
    ? DASH.user.dept_scope
    : (DASH.user.dept ? [DASH.user.dept] : []);
  DASH.scope = { all: isAll, depts: isAll ? [] : scoped };
  return DASH.user;
};

// ---- สรุปการเข้างานและการลา (งวดล่าสุด) ----
DASH.loadAttendance = async () => {
  DASH.attPeriod = null; DASH.attRows = [];
  try {
    const { data: ps } = await window.sb.from("attendance_periods")
      .select("*").order("id", { ascending: false }).limit(1);
    if (!ps || !ps.length) return;
    DASH.attPeriod = ps[0];
    const { data: rs } = await window.sb.from("attendance_monthly")
      .select("*").eq("period_id", ps[0].id);
    DASH.attRows = rs || [];
  } catch (e) { DASH.attPeriod = null; DASH.attRows = []; }
};

// เฉพาะพนักงานที่อยู่ในขอบเขตของผู้ใช้ (และหน่วยงานที่เจาะดูอยู่)
DASH.attVisible = () => {
  const ids = {};
  DASH.visible().forEach((e) => { ids[e.id] = e; });
  return (DASH.attRows || []).filter((r) => ids[r.employee_id]);
};

DASH.attSummary = () => {
  const rows = DASH.attVisible();
  if (!rows.length) return null;
  const sum = (f) => rows.reduce((t, r) => t + Number(r[f] || 0), 0);
  const work = sum("work_days"), absent = sum("absent_days"), leave = sum("total_leave_days");
  const denom = work + absent + leave;
  const r1 = (n) => Math.round(n * 10) / 10;
  return {
    people: rows.length,
    workDays: r1(work), absentDays: r1(absent), leaveDays: r1(leave),
    lateCount: sum("late_count"), lateMinutes: sum("late_minutes"),
    earlyCount: sum("early_count"),
    otHours: r1(sum("total_ot_hours")),
    otPerHead: r1(sum("total_ot_hours") / rows.length),
    attendRate: denom ? r1((work / denom) * 100) : 0,
    absentRate: denom ? r1((absent / denom) * 100) : 0,
    leaveRate: denom ? r1((leave / denom) * 100) : 0,
    avgWorkDays: r1(work / rows.length),
  };
};

// แยกประเภทการลา
DASH.attLeaveTypes = () => {
  const rows = DASH.attVisible();
  const T = [
    ["ลาป่วย", "sick_days"], ["ลากิจ", "personal_days"], ["พักผ่อนประจำปี", "annual_days"],
    ["ลาคลอด", "maternity_days"], ["ลาบวช", "ordination_days"], ["ลาอบรม", "training_days"],
    ["ลาเพื่องานศพ", "funeral_days"], ["อุบัติเหตุในงาน", "accident_days"],
    ["ลาทหาร", "military_days"], ["ลาเพื่อสมรส", "marriage_days"],
    ["ลาเพื่อทำหมัน", "sterilize_days"], ["ลาอื่นๆ", "other_days"],
  ];
  return T.map(([label, f]) => ({
    key: f, label,
    v: Math.round(rows.reduce((t, r) => t + Number(r[f] || 0), 0) * 10) / 10,
  })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
};

// OT และการขาดงานรายหน่วยงาน
DASH.attByDept = () => {
  const rows = DASH.attVisible();
  const empMap = {};
  DASH.visible().forEach((e) => { empMap[e.id] = e; });
  const acc = {};
  rows.forEach((r) => {
    const e = empMap[r.employee_id]; if (!e) return;
    const d = e.dept || "-";
    acc[d] = acc[d] || { ot: 0, absent: 0, late: 0, leave: 0, n: 0 };
    acc[d].ot += Number(r.total_ot_hours || 0);
    acc[d].absent += Number(r.absent_days || 0);
    acc[d].late += Number(r.late_count || 0);
    acc[d].leave += Number(r.total_leave_days || 0);
    acc[d].n += 1;
  });
  return (DASH.departments || []).filter((d) => acc[d.id]).map((d) => ({
    key: d.id, label: d.short || d.name, n: acc[d.id].n,
    ot: Math.round(acc[d.id].ot), otPerHead: Math.round(acc[d.id].ot / acc[d.id].n),
    absent: Math.round(acc[d.id].absent * 10) / 10,
    late: acc[d.id].late,
    leave: Math.round(acc[d.id].leave * 10) / 10,
  }));
};

// รายชื่อสำหรับคลิกดู
DASH.attPeople = (kind) => {
  const rows = DASH.attVisible();
  const empMap = {};
  DASH.visible().forEach((e) => { empMap[e.id] = e; });
  const pick = { absent: "absent_days", late: "late_count", leave: "total_leave_days", ot: "total_ot_hours" }[kind];
  if (!pick) return [];
  return rows.filter((r) => Number(r[pick] || 0) > 0)
    .sort((a, b) => Number(b[pick] || 0) - Number(a[pick] || 0))
    .map((r) => ({ ...(empMap[r.employee_id] || { id: r.employee_id, name: r.employee_id }),
                   _attValue: Number(r[pick] || 0) }));
};

DASH.inScope = (deptId) => DASH.scope.all || DASH.scope.depts.indexOf(deptId) > -1;

/* ---------- โหลดข้อมูล ---------- */
DASH.load = async () => {
  const [emps, depts, etypes, dmap] = await Promise.all([
    window.sb.from("employees").select("*"),
    window.sb.from("hr_departments").select("*").order("sort"),
    window.sb.from("employment_types").select("*").order("sort"),
    window.sb.from("recruit_dept_map").select("recruit_dept, dept_id"),
  ]);
  const err = [emps, depts, etypes].find((r) => r.error);
  if (err) throw new Error(err.error.message);

  DASH.allDepartments = depts.data || [];
  DASH.departments = DASH.allDepartments.filter((d) => DASH.inScope(d.id));
  DASH.employmentTypes = etypes.data || [];
  DASH.deptMap = {}; DASH.allDepartments.forEach((d) => { DASH.deptMap[d.id] = d; });
  DASH.etypeMap = {}; DASH.employmentTypes.forEach((t) => { DASH.etypeMap[t.id] = t; });

  // แผนที่ชื่อหน่วยงานฝั่งสรรหา → รหัสหน่วยงาน HR Core (ใช้กรองสถิติสรรหาตามสิทธิ์)
  DASH.recruitDeptMap = {};
  (dmap.data || []).forEach((m) => { if (m.dept_id) DASH.recruitDeptMap[m.recruit_dept] = m.dept_id; });

  DASH.allEmployees = (emps.data || []).map((e) => ({ ...e, _st: DASH.statusOf(e) }));
  DASH.drill = null;                 // หน่วยงานที่กำลังเจาะดู (null = ทั้งขอบเขต)

  await DASH.loadAttendance();       // เวลาทำงาน/การลา — ล้มเหลวได้โดยไม่ทำให้แดชบอร์ดพัง
  return DASH;
};

// พนักงานที่ "มองเห็นได้" = อยู่ในสิทธิ์ และตรงกับหน่วยงานที่เจาะดูอยู่
DASH.visible = () => (DASH.allEmployees || []).filter((e) =>
  DASH.inScope(e.dept) && (!DASH.drill || e.dept === DASH.drill));

// หน่วยงานที่เลือกเจาะได้ (ตามสิทธิ์)
DASH.drillableDepts = () => (DASH.departments || []).filter((d) =>
  (DASH.allEmployees || []).some((e) => e.dept === d.id));

DASH.setDrill = (id) => { DASH.drill = (DASH.drill === id ? null : id) || null; };
DASH.deptName = (id) => (DASH.deptMap[id] ? DASH.deptMap[id].name : (id || "—"));
DASH.deptShort = (id) => (DASH.deptMap[id] ? (DASH.deptMap[id].short || DASH.deptMap[id].name) : (id || "—"));
DASH.scopeLabel = () => {
  if (DASH.drill) return DASH.deptName(DASH.drill);
  if (DASH.scope.all) return "ทั้งองค์กร";
  const n = (DASH.departments || []).map((d) => d.short || d.name);
  return n.length ? n.join(" · ") : "หน่วยงานของคุณ";
};

// สถิติสรรหา (ข้ามระบบ · ตัวเลขรวมเท่านั้น) — ล้มเหลวได้โดยไม่ทำให้แดชบอร์ดพัง
DASH.loadRecruit = async () => {
  try {
    const { data, error } = await window.sb.functions.invoke("recruit-bridge", { body: { action: "stats" } });
    if (error || !data || !data.ok) return { ok: false, error: (data && data.error) || (error && error.message) || "เชื่อมต่อไม่สำเร็จ" };
    return { ok: true, stats: data.stats };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
};

// รวมกรวยสรรหาเฉพาะหน่วยงานที่มองเห็นได้
DASH.recruitFunnel = (stats) => {
  if (!stats) return null;
  if (DASH.scope.all && !DASH.drill) return { funnel: stats.funnel, scoped: false };
  const want = DASH.drill ? [DASH.drill] : DASH.scope.depts;
  const sum = { openings: 0, applicants: 0, interviewed: 0, offered: 0, started: 0 };
  Object.entries(stats.funnel_by_dept || {}).forEach(([rd, f]) => {
    const id = DASH.recruitDeptMap[rd];
    if (id && want.indexOf(id) > -1) {
      sum.openings += f.openings || 0; sum.applicants += f.applicants || 0;
      sum.interviewed += f.interviewed || 0; sum.offered += f.offered || 0; sum.started += f.started || 0;
    }
  });
  return { funnel: sum, scoped: true };
};
DASH.recruitPositions = (stats) => {
  const list = (stats && stats.top_positions) || [];
  if (DASH.scope.all && !DASH.drill) return list.slice(0, 6);
  const want = DASH.drill ? [DASH.drill] : DASH.scope.depts;
  return list.filter((p) => { const id = DASH.recruitDeptMap[p.dept]; return id && want.indexOf(id) > -1; }).slice(0, 6);
};

/* ---------- คำนวณตัวชี้วัด ---------- */
DASH.tenureYears = (e) => {
  if (!e.hire_date) return null;
  const d = new Date(e.hire_date);
  if (isNaN(d)) return null;
  const end = e.resign_date ? new Date(e.resign_date) : new Date();
  return (end - d) / (365.25 * 86400000);
};

// 1) สรุปกำลังคน
DASH.headcount = () => {
  const all = DASH.visible();
  const y = new Date().getFullYear();
  const working = all.filter(DASH.isWorking);
  const byDept = (DASH.departments || []).map((d, i) => ({
    id: d.id, label: d.short || d.name, full: d.name,
    v: (DASH.allEmployees || []).filter((e) => e.dept === d.id && DASH.isWorking(e)).length,
    color: d.color || DASH.PALETTE[i % DASH.PALETTE.length],
  })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const contractIds = (DASH.employmentTypes || [])
    .filter((t) => ["CONTRACT", "TEMPORARY", "DAILY"].indexOf(String(t.code).toUpperCase()) > -1)
    .map((t) => t.id);
  return {
    current: working.length,
    newYtd: all.filter((e) => e.hire_date && new Date(e.hire_date).getFullYear() === y).length,
    resignYtd: all.filter((e) => e.resign_date && new Date(e.resign_date).getFullYear() === y).length,
    contract: working.filter((e) => contractIds.indexOf(e.employment_type_id) > -1).length,
    probation: working.filter((e) => e._st === "PROBATION").length,
    byDept,
  };
};

// 2) อัตราการลาออก
DASH.turnover = () => {
  const all = DASH.visible();
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const head = all.filter((e) => e.hire_date && new Date(e.hire_date) < next &&
      (!e.resign_date || new Date(e.resign_date) >= d)).length;
    const left = all.filter((e) => e.resign_date &&
      new Date(e.resign_date) >= d && new Date(e.resign_date) < next).length;
    months.push({ label: DASH.MONTHS_TH[d.getMonth()], year: d.getFullYear(), head, left, rate: DASH.pct(left, head) });
  }
  const leavers = all.filter((e) => e.resign_date);
  const y = now.getFullYear();
  const leaversYtd = leavers.filter((e) => new Date(e.resign_date).getFullYear() === y);
  const working = all.filter(DASH.isWorking).length;

  const byDept = (DASH.departments || []).map((d, i) => {
    const base = (DASH.allEmployees || []).filter((e) => e.dept === d.id).length;
    const n = (DASH.allEmployees || []).filter((e) => e.dept === d.id && e.resign_date &&
      new Date(e.resign_date).getFullYear() === y).length;
    return { id: d.id, label: d.short || d.name, v: DASH.pct(n, base), n, base,
      color: d.color || DASH.PALETTE[i % DASH.PALETTE.length] };
  }).filter((x) => x.base > 0).sort((a, b) => b.v - a.v);

  const bands = [["< 1 ปี", 0, 1], ["1-3 ปี", 1, 3], ["3-5 ปี", 3, 5], ["> 5 ปี", 5, 999]];
  const byTenure = bands.map(([label, lo, hi]) => {
    const inBand = (e) => { const t = DASH.tenureYears(e); return t != null && t >= lo && t < hi; };
    const base = all.filter(inBand).length;
    const n = leaversYtd.filter(inBand).length;
    return { label, v: DASH.pct(n, base), n, base };
  });

  return {
    months, byDept, byTenure,
    rateYtd: DASH.pct(leaversYtd.length, working + leaversYtd.length),
    leaversYtd: leaversYtd.length,
    hasData: leavers.length > 0,
  };
};

// 5) โครงสร้างพนักงาน
DASH.demographics = () => {
  const w = DASH.visible().filter(DASH.isWorking);
  const total = w.length;
  const ageBands = [["< 25 ปี", 0, 25], ["25-34 ปี", 25, 35], ["35-44 ปี", 35, 45], ["45-54 ปี", 45, 55], ["> 54 ปี", 55, 200]];
  const withAge = w.filter((e) => e.age != null).length;
  const byAge = ageBands.map(([label, lo, hi]) => {
    const n = w.filter((e) => e.age != null && e.age >= lo && e.age < hi).length;
    return { label, v: n, pct: DASH.pct(n, withAge) };
  });
  const tens = w.map(DASH.tenureYears).filter((t) => t != null);
  const male = w.filter((e) => e.gender === "ชาย").length;
  const female = w.filter((e) => e.gender === "หญิง").length;
  const permIds = (DASH.employmentTypes || [])
    .filter((t) => ["PERMANENT", "MONTHLY"].indexOf(String(t.code).toUpperCase()) > -1).map((t) => t.id);
  const perm = w.filter((e) => permIds.indexOf(e.employment_type_id) > -1).length;

  const LV_ORDER = ["ผู้บริหารระดับสูง", "ผู้บริหาร", "หัวหน้างาน", "วิศวกร", "เจ้าหน้าที่", "ช่างฝีมือ", "ปฏิบัติการ"];
  const lvCount = {};
  w.forEach((e) => { const l = e.level || "(ไม่ระบุ)"; lvCount[l] = (lvCount[l] || 0) + 1; });
  const idx = (l) => { const i = LV_ORDER.indexOf(l); return i === -1 ? 99 : i; };
  const byLevel = Object.entries(lvCount).sort((a, b) => idx(a[0]) - idx(b[0]))
    .map(([label, v], i) => ({ label, v, color: DASH.PALETTE[i % DASH.PALETTE.length] }));

  const genCount = {};
  w.forEach((e) => { const g = e.generation || "(ไม่ระบุ)"; genCount[g] = (genCount[g] || 0) + 1; });
  const GEN_ORDER = ["Baby Boomer", "Gen X", "Gen Y / Millennials", "Gen Z"];
  const gidx = (l) => { const i = GEN_ORDER.indexOf(l); return i === -1 ? 99 : i; };
  const byGen = Object.entries(genCount).sort((a, b) => gidx(a[0]) - gidx(b[0]))
    .map(([label, v], i) => ({ label, v, color: DASH.PALETTE[i % DASH.PALETTE.length] }));

  return {
    total, byAge, byLevel, byGen,
    avgTenure: tens.length ? DASH.r1(tens.reduce((a, b) => a + b, 0) / tens.length) : 0,
    avgAge: withAge ? DASH.r1(w.filter((e) => e.age != null).reduce((a, e) => a + e.age, 0) / withAge) : 0,
    male, female, malePct: DASH.pct(male, male + female), femalePct: DASH.pct(female, male + female),
    permPct: DASH.pct(perm, total), contractPct: DASH.pct(total - perm, total),
    noGender: w.filter((e) => !e.gender).length,
  };
};

// รายชื่อพนักงานตามเงื่อนไขที่คลิก (สำหรับหน้าต่างเจาะดู)
DASH.listBy = (kind, key) => {
  const w = DASH.visible().filter(DASH.isWorking);
  if (kind === "dept") return DASH.visible().filter((e) => e.dept === key && DASH.isWorking(e));
  if (kind === "level") return w.filter((e) => (e.level || "(ไม่ระบุ)") === key);
  if (kind === "gen") return w.filter((e) => (e.generation || "(ไม่ระบุ)") === key);
  if (kind === "age") {
    const m = { "< 25 ปี": [0, 25], "25-34 ปี": [25, 35], "35-44 ปี": [35, 45], "45-54 ปี": [45, 55], "> 54 ปี": [55, 200] }[key];
    return m ? w.filter((e) => e.age != null && e.age >= m[0] && e.age < m[1]) : [];
  }
  if (kind === "tenure") {
    const m = { "< 1 ปี": [0, 1], "1-3 ปี": [1, 3], "3-5 ปี": [3, 5], "> 5 ปี": [5, 999] }[key];
    return m ? w.filter((e) => { const t = DASH.tenureYears(e); return t != null && t >= m[0] && t < m[1]; }) : [];
  }
  return [];
};

window.DASH = DASH;
