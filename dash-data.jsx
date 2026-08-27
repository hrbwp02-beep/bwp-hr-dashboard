// dash-data.jsx — ชั้นข้อมูลของแดชบอร์ด HR (คำนวณจากข้อมูลจริงเท่านั้น)
const DASH = {};

DASH.HUB = "https://hrbwp02-beep.github.io/bwp-hr-connect/";
DASH.WORKING = ["ACTIVE", "PROBATION", "ON_LEAVE", "SUSPENDED"];
DASH.MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
DASH.PALETTE = ["#2563eb", "#0d9488", "#7c3aed", "#e08a00", "#db2777", "#0891b2", "#16a34a", "#64748b", "#e11d48"];

DASH.statusOf = (e) => String(e.employment_status || "ACTIVE").toUpperCase();
DASH.isWorking = (e) => DASH.WORKING.indexOf(DASH.statusOf(e)) > -1;
DASH.r1 = (x) => Math.round(x * 10) / 10;
DASH.pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);

/* ---------- โหลดข้อมูล ---------- */
DASH.loadUser = async () => {
  const { data } = await window.sb.auth.getUser();
  const email = ((data && data.user && data.user.email) || "").toLowerCase();
  if (!email) return null;
  const { data: u } = await window.sb.from("app_users").select("*").ilike("email", email).maybeSingle();
  DASH.user = u || { email, name: email.split("@")[0], role: "viewer" };
  return DASH.user;
};

DASH.load = async () => {
  const [emps, depts, etypes] = await Promise.all([
    window.sb.from("employees").select("*"),
    window.sb.from("departments").select("*").order("sort"),
    window.sb.from("employment_types").select("*").order("sort"),
  ]);
  const err = [emps, depts, etypes].find((r) => r.error);
  if (err) throw new Error(err.error.message);

  DASH.departments = depts.data || [];
  DASH.employmentTypes = etypes.data || [];
  DASH.deptMap = {}; DASH.departments.forEach((d) => { DASH.deptMap[d.id] = d; });
  DASH.etypeMap = {}; DASH.employmentTypes.forEach((t) => { DASH.etypeMap[t.id] = t; });
  DASH.employees = (emps.data || []).map((e) => ({ ...e, _st: DASH.statusOf(e) }));
  return DASH;
};

// สถิติสรรหา (ข้ามระบบ · ตัวเลขรวมเท่านั้น) — ล้มเหลวได้โดยไม่ทำให้แดชบอร์ดพัง
DASH.loadRecruit = async () => {
  try {
    const { data, error } = await window.sb.functions.invoke("recruit-bridge", { body: { action: "stats" } });
    if (error || !data || !data.ok) return { ok: false, error: (data && data.error) || (error && error.message) || "เชื่อมต่อไม่สำเร็จ" };
    return { ok: true, stats: data.stats };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
};

DASH.deptName = (id) => (DASH.deptMap[id] ? DASH.deptMap[id].name : (id || "—"));
DASH.deptShort = (id) => (DASH.deptMap[id] ? (DASH.deptMap[id].short || DASH.deptMap[id].name) : (id || "—"));

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
  const all = DASH.employees || [];
  const y = new Date().getFullYear();
  const working = all.filter(DASH.isWorking);
  const byDept = (DASH.departments || []).map((d, i) => ({
    label: d.name, short: d.short || d.name, v: working.filter((e) => e.dept === d.id).length,
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
  const all = DASH.employees || [];
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    // กำลังคนต้นเดือน = คนที่เข้างานก่อนเดือนนี้ และยังไม่ออกก่อนเดือนนี้
    const head = all.filter((e) => e.hire_date && new Date(e.hire_date) < next &&
      (!e.resign_date || new Date(e.resign_date) >= d)).length;
    const left = all.filter((e) => e.resign_date &&
      new Date(e.resign_date) >= d && new Date(e.resign_date) < next).length;
    months.push({ label: DASH.MONTHS_TH[d.getMonth()], year: d.getFullYear(), head, left, rate: DASH.pct(left, head) });
  }
  const leavers = all.filter((e) => e.resign_date);
  const y = new Date().getFullYear();
  const leaversYtd = leavers.filter((e) => new Date(e.resign_date).getFullYear() === y);
  const working = all.filter(DASH.isWorking).length;

  const byDept = (DASH.departments || []).map((d, i) => {
    const base = all.filter((e) => e.dept === d.id).length;
    const n = leaversYtd.filter((e) => e.dept === d.id).length;
    return { label: d.short || d.name, v: DASH.pct(n, base), n, base, color: d.color || DASH.PALETTE[i % DASH.PALETTE.length] };
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
  const w = (DASH.employees || []).filter(DASH.isWorking);
  const total = w.length;
  const ageBands = [["< 25 ปี", 0, 25], ["25-34 ปี", 25, 35], ["35-44 ปี", 35, 45], ["45-54 ปี", 45, 55], ["> 54 ปี", 55, 200]];
  const byAge = ageBands.map(([label, lo, hi]) => {
    const n = w.filter((e) => e.age != null && e.age >= lo && e.age < hi).length;
    return { label, v: n, pct: DASH.pct(n, w.filter((e) => e.age != null).length) };
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
    avgAge: w.filter((e) => e.age != null).length
      ? DASH.r1(w.filter((e) => e.age != null).reduce((a, e) => a + e.age, 0) / w.filter((e) => e.age != null).length) : 0,
    male, female, malePct: DASH.pct(male, male + female), femalePct: DASH.pct(female, male + female),
    permPct: DASH.pct(perm, total), contractPct: DASH.pct(total - perm, total),
    noGender: w.filter((e) => !e.gender).length,
  };
};

window.DASH = DASH;
