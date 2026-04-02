import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const EXPENSE_CATEGORIES = ["Travel", "Meals & Entertainment", "Accommodation", "Office Supplies", "Software", "Training", "Marketing", "Utilities", "Consulting", "Other"];
const ROLES = { ADMIN: "Admin", MANAGER: "Manager", EMPLOYEE: "Employee" };

// ─── INITIAL STATE ────────────────────────────────────────────────────────────
const initState = () => {
  const saved = localStorage.getItem("expenseApp_v3");
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return {
    company: null, currentUser: null,
    users: [], expenses: [], approvalRules: [], notifications: []
  };
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (amt, cur = "USD") => {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(amt); }
  catch { return `${cur} ${Number(amt).toFixed(2)}`; }
};
const today = () => new Date().toISOString().split("T")[0];

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState(initState);
  const [view, setView] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [countries, setCountries] = useState([]);
  const [rates, setRates] = useState({});
  const [toast, setToast] = useState(null);
  const [sidebar, setSidebar] = useState(true);

  const save = (s) => { setState(s); localStorage.setItem("expenseApp_v3", JSON.stringify(s)); };
  const update = (patch) => save({ ...state, ...patch });
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch countries once
  useEffect(() => {
    fetch("https://restcountries.com/v3.1/all?fields=name,currencies")
      .then(r => r.json())
      .then(data => {
        const list = data.map(c => {
          const cur = c.currencies ? Object.keys(c.currencies)[0] : null;
          return { name: c.name.common, currency: cur };
        }).filter(c => c.currency).sort((a, b) => a.name.localeCompare(b.name));
        setCountries(list);
      }).catch(() => {});
  }, []);

  // Fetch rates when company currency changes
  useEffect(() => {
    if (!state.company?.currency) return;
    fetch(`https://api.exchangerate-api.com/v4/latest/${state.company.currency}`)
      .then(r => r.json())
      .then(d => setRates(d.rates || {}))
      .catch(() => {});
  }, [state.company?.currency]);

  const convert = (amount, from, to) => {
    if (from === to) return amount;
    if (!rates[from] || !rates[to]) return amount;
    const base = amount / rates[from];
    return base * rates[to];
  };

  const { company, currentUser, users, expenses, approvalRules } = state;

  // ── AUTH ─────────────────────────────────────────────────────────────────────
  if (!currentUser) {
    return <AuthScreen countries={countries} onAuth={(company, user, allUsers) => {
      save({ ...state, company, currentUser: user, users: allUsers, expenses: [], approvalRules: [], notifications: [] });
      setView("dashboard");
    }} />;
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────────
  const myExpenses = currentUser.role === ROLES.ADMIN
    ? expenses
    : expenses.filter(e => e.submittedBy === currentUser.id);

  const pendingForMe = expenses.filter(e => {
    if (!e.currentStep) return false;
    const step = e.approvalSteps?.[e.currentStep];
    return step?.approverId === currentUser.id && e.status === "pending";
  });

  const getUser = (id) => users.find(u => u.id === id);

  const submitExpense = (data) => {
    const rule = approvalRules.find(r => r.id === data.ruleId);
    let steps = [];
    if (rule) {
      // Build steps from rule
      if (data.managerFirst && currentUser.managerId) {
        steps.push({ id: uid(), approverId: currentUser.managerId, label: "Manager", status: "pending", order: 0 });
      }
      rule.approvers.forEach((a, i) => {
        steps.push({ id: uid(), approverId: a.userId, label: a.label, status: "pending", order: steps.length });
      });
    } else if (currentUser.managerId) {
      steps.push({ id: uid(), approverId: currentUser.managerId, label: "Manager", status: "pending", order: 0 });
    }
    const convertedAmount = convert(parseFloat(data.amount), data.currency, company.currency);
    const expense = {
      id: uid(), ...data, submittedBy: currentUser.id,
      status: steps.length ? "pending" : "approved",
      convertedAmount, companyCurrency: company.currency,
      approvalSteps: steps, currentStep: steps.length ? 0 : null,
      createdAt: new Date().toISOString(), comments: [], history: [
        { at: new Date().toISOString(), by: currentUser.id, action: "submitted" }
      ]
    };
    update({ expenses: [...expenses, expense] });
    showToast("Expense submitted successfully!");
    setModal(null);
  };

  const actOnExpense = (expenseId, action, comment, approverRule) => {
    const updated = expenses.map(exp => {
      if (exp.id !== expenseId) return exp;
      const steps = [...exp.approvalSteps];
      steps[exp.currentStep] = { ...steps[exp.currentStep], status: action, comment, decidedAt: new Date().toISOString() };
      const histEntry = { at: new Date().toISOString(), by: currentUser.id, action, comment };

      // Check conditional rules
      let finalStatus = null;
      const rule = approvalRules.find(r => r.id === exp.ruleId);
      if (rule && action === "approved") {
        const approvedCount = steps.filter(s => s.status === "approved").length;
        const total = steps.length;
        const pct = (approvedCount / total) * 100;
        const specificApproved = rule.specificApproverId && steps.some(s => s.approverId === rule.specificApproverId && s.status === "approved");
        if (specificApproved) finalStatus = "approved";
        else if (rule.percentageThreshold && pct >= rule.percentageThreshold) finalStatus = "approved";
      }
      if (action === "rejected") finalStatus = "rejected";

      let nextStep = exp.currentStep;
      let status = exp.status;
      if (finalStatus) {
        status = finalStatus;
        nextStep = null;
      } else if (action === "approved") {
        // Move to next step
        const next = steps.findIndex((s, i) => i > exp.currentStep && s.status === "pending");
        if (next === -1) { status = "approved"; nextStep = null; }
        else nextStep = next;
      }

      return { ...exp, approvalSteps: steps, currentStep: nextStep, status, history: [...exp.history, histEntry] };
    });
    update({ expenses: updated });
    showToast(`Expense ${action}!`, action === "approved" ? "success" : "error");
    setModal(null);
  };

  // ─── LAYOUT ─────────────────────────────────────────────────────────────────
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "⬡" },
    { id: "expenses", label: "My Expenses", icon: "◈", roles: [ROLES.EMPLOYEE, ROLES.ADMIN] },
    { id: "approvals", label: "Approvals", icon: "◎", roles: [ROLES.MANAGER, ROLES.ADMIN], badge: pendingForMe.length },
    { id: "team", label: "Team Expenses", icon: "◉", roles: [ROLES.MANAGER, ROLES.ADMIN] },
    { id: "users", label: "Users", icon: "◫", roles: [ROLES.ADMIN] },
    { id: "rules", label: "Approval Rules", icon: "⬟", roles: [ROLES.ADMIN] },
  ].filter(n => !n.roles || n.roles.includes(currentUser.role));

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0b0f", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#e8eaf0" }}>
      <style>{globalCSS}</style>

      {/* SIDEBAR */}
      <aside style={{
        width: sidebar ? 240 : 68, transition: "width 0.3s cubic-bezier(.4,0,.2,1)",
        background: "linear-gradient(180deg,#0f1117 0%,#0a0b0f 100%)",
        borderRight: "1px solid #1e2130", display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 100, overflow: "hidden"
      }}>
        <div style={{ padding: "20px 16px", borderBottom: "1px solid #1e2130", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#6c63ff,#a855f7)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>⬡</div>
          {sidebar && <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: "#fff" }}>EXPENZO</div>
            <div style={{ fontSize: 10, color: "#6c7a9c", letterSpacing: 0.5 }}>{company.name}</div>
          </div>}
          <button onClick={() => setSidebar(s => !s)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#6c7a9c", cursor: "pointer", fontSize: 16, flexShrink: 0, padding: 4 }}>
            {sidebar ? "◂" : "▸"}
          </button>
        </div>

        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setView(n.id)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10,
              background: view === n.id ? "linear-gradient(90deg,rgba(108,99,255,.18),rgba(108,99,255,.05))" : "none",
              border: view === n.id ? "1px solid rgba(108,99,255,.25)" : "1px solid transparent",
              color: view === n.id ? "#a5a0ff" : "#6c7a9c", cursor: "pointer", width: "100%", textAlign: "left",
              fontSize: 13, fontWeight: view === n.id ? 600 : 400, transition: "all .2s", position: "relative"
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon}</span>
              {sidebar && <span>{n.label}</span>}
              {n.badge > 0 && <span style={{
                marginLeft: "auto", background: "#6c63ff", color: "#fff", borderRadius: 10,
                fontSize: 10, fontWeight: 700, padding: "2px 6px", minWidth: 18, textAlign: "center"
              }}>{n.badge}</span>}
            </button>
          ))}
        </nav>

        <div style={{ padding: "12px 8px", borderTop: "1px solid #1e2130" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6c63ff,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {currentUser.name[0].toUpperCase()}
            </div>
            {sidebar && <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#e8eaf0", truncate: true, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.name}</div>
              <div style={{ fontSize: 10, color: "#6c63ff" }}>{currentUser.role}</div>
            </div>}
          </div>
          <button onClick={() => { update({ currentUser: null }); }} style={{
            width: "100%", padding: "8px 12px", borderRadius: 8, background: "rgba(255,80,80,.08)",
            border: "1px solid rgba(255,80,80,.15)", color: "#ff6b6b", cursor: "pointer", fontSize: 12,
            display: "flex", alignItems: "center", gap: 8, justifyContent: sidebar ? "flex-start" : "center"
          }}>
            <span>⏏</span>{sidebar && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, marginLeft: sidebar ? 240 : 68, transition: "margin-left 0.3s cubic-bezier(.4,0,.2,1)", padding: "28px 32px", minHeight: "100vh" }}>
        {view === "dashboard" && <DashboardView state={state} pendingForMe={pendingForMe} myExpenses={myExpenses} company={company} fmt={fmt} setView={setView} setModal={setModal} currentUser={currentUser} />}
        {view === "expenses" && <ExpensesView expenses={myExpenses} company={company} currentUser={currentUser} fmt={fmt} setModal={setModal} users={users} />}
        {view === "approvals" && <ApprovalsView pending={pendingForMe} company={company} fmt={fmt} setModal={setModal} users={users} getUser={getUser} />}
        {view === "team" && <TeamView expenses={expenses} company={company} fmt={fmt} setModal={setModal} users={users} currentUser={currentUser} />}
        {view === "users" && <UsersView state={state} update={update} showToast={showToast} />}
        {view === "rules" && <RulesView state={state} update={update} showToast={showToast} />}
      </main>

      {/* FAB */}
      {(currentUser.role === ROLES.EMPLOYEE || currentUser.role === ROLES.ADMIN) && (
        <button onClick={() => setModal({ type: "submit" })} style={{
          position: "fixed", bottom: 32, right: 32, width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg,#6c63ff,#a855f7)", border: "none", color: "#fff",
          fontSize: 24, cursor: "pointer", boxShadow: "0 8px 32px rgba(108,99,255,.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
          transition: "transform .2s, box-shadow .2s"
        }} onMouseEnter={e => e.target.style.transform = "scale(1.1)"} onMouseLeave={e => e.target.style.transform = "scale(1)"}>
          +
        </button>
      )}

      {/* MODALS */}
      {modal?.type === "submit" && <SubmitModal onClose={() => setModal(null)} onSubmit={submitExpense} rules={approvalRules} currentUser={currentUser} company={company} countries={countries} convert={convert} />}
      {modal?.type === "detail" && <DetailModal expense={modal.expense} onClose={() => setModal(null)} onAction={actOnExpense} currentUser={currentUser} users={users} company={company} fmt={fmt} canAct={modal.canAct} />}

      {/* TOAST */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "success" ? "rgba(52,211,153,.15)" : "rgba(239,68,68,.15)",
          border: `1px solid ${toast.type === "success" ? "rgba(52,211,153,.4)" : "rgba(239,68,68,.4)"}`,
          color: toast.type === "success" ? "#34d399" : "#ef4444",
          padding: "12px 24px", borderRadius: 12, fontSize: 13, fontWeight: 600, zIndex: 9999,
          backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,.4)"
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ countries, onAuth }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", company: "", country: "United States" });
  const [users, setUsers] = useState(() => { try { return JSON.parse(localStorage.getItem("expenseApp_v3") || "{}").users || []; } catch { return []; } });
  const [err, setErr] = useState("");

  const countryObj = countries.find(c => c.name === form.country);
  const currency = countryObj?.currency || "USD";

  const handleLogin = () => {
    const all = (() => { try { return JSON.parse(localStorage.getItem("expenseApp_v3") || "{}"); } catch { return {}; } })();
    const u = (all.users || []).find(u => u.email === form.email && u.password === form.password);
    if (!u) return setErr("Invalid credentials");
    onAuth(all.company, u, all.users);
  };

  const handleSignup = () => {
    if (!form.name || !form.email || !form.password || !form.company) return setErr("All fields required");
    const admin = { id: uid(), name: form.name, email: form.email, password: form.password, role: ROLES.ADMIN, managerId: null, createdAt: new Date().toISOString() };
    const company = { id: uid(), name: form.company, country: form.country, currency, createdAt: new Date().toISOString() };
    const newState = { company, currentUser: admin, users: [admin], expenses: [], approvalRules: [], notifications: [] };
    localStorage.setItem("expenseApp_v3", JSON.stringify(newState));
    onAuth(company, admin, [admin]);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0b0f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{globalCSS}</style>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 80% 60% at 50% -10%,rgba(108,99,255,.25),transparent)", pointerEvents: "none" }} />
      <div style={{ width: 420, background: "#0f1117", border: "1px solid #1e2130", borderRadius: 20, padding: 40, position: "relative", boxShadow: "0 32px 80px rgba(0,0,0,.6)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: "linear-gradient(135deg,#6c63ff,#a855f7)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>⬡</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>EXPENZO</div>
          <div style={{ fontSize: 13, color: "#6c7a9c", marginTop: 4 }}>Intelligent Expense Management</div>
        </div>

        <div style={{ display: "flex", background: "#161822", borderRadius: 10, padding: 4, marginBottom: 28 }}>
          {["login", "signup"].map(t => (
            <button key={t} onClick={() => { setTab(t); setErr(""); }} style={{
              flex: 1, padding: "8px", borderRadius: 8, border: "none", cursor: "pointer",
              background: tab === t ? "#6c63ff" : "none", color: tab === t ? "#fff" : "#6c7a9c",
              fontSize: 13, fontWeight: 600, textTransform: "capitalize", transition: "all .2s"
            }}>{t === "login" ? "Sign In" : "Sign Up"}</button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {tab === "signup" && <>
            <Input label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Jane Smith" />
            <Input label="Company Name" value={form.company} onChange={v => setForm({ ...form, company: v })} placeholder="Acme Corp" />
            <div>
              <label style={{ fontSize: 11, color: "#6c7a9c", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Country ({currency})</label>
              <select value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} style={selectStyle}>
                {countries.map(c => <option key={c.name} value={c.name}>{c.name} ({c.currency})</option>)}
              </select>
            </div>
          </>}
          <Input label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="jane@company.com" />
          <Input label="Password" type="password" value={form.password} onChange={v => setForm({ ...form, password: v })} placeholder="••••••••" />
          {err && <div style={{ fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "8px 12px" }}>{err}</div>}
          <button onClick={tab === "login" ? handleLogin : handleSignup} style={{
            padding: "13px", borderRadius: 10, background: "linear-gradient(135deg,#6c63ff,#a855f7)",
            border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
            marginTop: 6, transition: "opacity .2s"
          }}>
            {tab === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD VIEW ───────────────────────────────────────────────────────────
function DashboardView({ state, pendingForMe, myExpenses, company, fmt, setView, setModal, currentUser }) {
  const { expenses, users } = state;
  const totalSubmitted = myExpenses.length;
  const approved = myExpenses.filter(e => e.status === "approved").length;
  const pending = myExpenses.filter(e => e.status === "pending").length;
  const rejected = myExpenses.filter(e => e.status === "rejected").length;
  const totalAmt = myExpenses.filter(e => e.status === "approved").reduce((s, e) => s + (e.convertedAmount || 0), 0);

  const recent = [...myExpenses].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const categoryTotals = {};
  myExpenses.forEach(e => { categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (e.convertedAmount || 0); });
  const topCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: 0 }}>Dashboard</h1>
        <p style={{ margin: "6px 0 0", color: "#6c7a9c", fontSize: 14 }}>
          Welcome back, {currentUser.name} · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Approved", value: fmt(totalAmt, company.currency), sub: `${approved} expenses`, color: "#34d399", icon: "✓" },
          { label: "Pending Review", value: pending, sub: pendingForMe.length > 0 ? `${pendingForMe.length} need your action` : "awaiting approval", color: "#f59e0b", icon: "◌" },
          { label: "Total Submitted", value: totalSubmitted, sub: `${rejected} rejected`, color: "#6c63ff", icon: "◈" },
          { label: "Team Members", value: users.length, sub: `in ${company.name}`, color: "#a855f7", icon: "◉", adminOnly: true },
        ].map((k, i) => (
          <div key={i} style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 16, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -10, right: -10, width: 60, height: 60, borderRadius: "50%", background: `${k.color}15` }} />
            <div style={{ fontSize: 22, marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#6c7a9c", marginTop: 4, fontWeight: 500 }}>{k.label}</div>
            <div style={{ fontSize: 11, color: k.color, marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* RECENT EXPENSES */}
        <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 16, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#fff" }}>Recent Expenses</h3>
            <button onClick={() => setView("expenses")} style={{ background: "none", border: "none", color: "#6c63ff", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>View all →</button>
          </div>
          {recent.length === 0 ? <EmptyState icon="◈" msg="No expenses yet" /> : recent.map(e => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #1e2130" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#161822", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                {categoryIcon(e.category)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0" }}>{e.description}</div>
                <div style={{ fontSize: 11, color: "#6c7a9c" }}>{e.category} · {e.date}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{fmt(e.convertedAmount, company.currency)}</div>
                <StatusBadge status={e.status} />
              </div>
            </div>
          ))}
        </div>

        {/* CATEGORY BREAKDOWN */}
        <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 16, padding: 22 }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 700, color: "#fff" }}>By Category</h3>
          {topCategories.length === 0 ? <EmptyState icon="◫" msg="No data yet" /> : topCategories.map(([cat, amt]) => {
            const pct = totalAmt > 0 ? (amt / totalAmt) * 100 : 0;
            return (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "#e8eaf0" }}>{cat}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#6c63ff" }}>{fmt(amt, company.currency)}</span>
                </div>
                <div style={{ height: 6, background: "#1e2130", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#6c63ff,#a855f7)", borderRadius: 3, transition: "width 1s ease" }} />
                </div>
              </div>
            );
          })}

          {pendingForMe.length > 0 && (
            <div style={{ marginTop: 20, padding: "14px", background: "rgba(108,99,255,.08)", border: "1px solid rgba(108,99,255,.2)", borderRadius: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#a5a0ff", marginBottom: 8 }}>⚡ Action Required</div>
              <div style={{ fontSize: 13, color: "#e8eaf0" }}>{pendingForMe.length} expense{pendingForMe.length > 1 ? "s" : ""} waiting for your approval</div>
              <button onClick={() => setView("approvals")} style={{ marginTop: 10, padding: "8px 16px", borderRadius: 8, background: "#6c63ff", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Review Now →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EXPENSES VIEW ────────────────────────────────────────────────────────────
function ExpensesView({ expenses, company, currentUser, fmt, setModal, users }) {
  const [filter, setFilter] = useState("all");
  const filtered = expenses.filter(e => filter === "all" || e.status === filter);

  return (
    <div>
      <PageHeader title="My Expenses" sub={`${expenses.length} total submissions`} />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["all", "pending", "approved", "rejected"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "7px 16px", borderRadius: 8, border: `1px solid ${filter === f ? "#6c63ff" : "#1e2130"}`,
            background: filter === f ? "rgba(108,99,255,.15)" : "transparent", color: filter === f ? "#a5a0ff" : "#6c7a9c",
            fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize"
          }}>{f}</button>
        ))}
      </div>
      {filtered.length === 0 ? <EmptyState icon="◈" msg="No expenses found" /> :
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(e => <ExpenseCard key={e.id} expense={e} company={company} fmt={fmt} onClick={() => setModal({ type: "detail", expense: e, canAct: false })} users={users} />)}
        </div>}
    </div>
  );
}

// ─── APPROVALS VIEW ───────────────────────────────────────────────────────────
function ApprovalsView({ pending, company, fmt, setModal, users, getUser }) {
  return (
    <div>
      <PageHeader title="Pending Approvals" sub={`${pending.length} expense${pending.length !== 1 ? "s" : ""} awaiting your decision`} />
      {pending.length === 0 ? <EmptyState icon="◎" msg="All caught up! No pending approvals." /> :
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pending.map(e => <ExpenseCard key={e.id} expense={e} company={company} fmt={fmt} onClick={() => setModal({ type: "detail", expense: e, canAct: true })} users={users} showSubmitter />)}
        </div>}
    </div>
  );
}

// ─── TEAM VIEW ────────────────────────────────────────────────────────────────
function TeamView({ expenses, company, fmt, setModal, users, currentUser }) {
  const [filter, setFilter] = useState("all");
  const teamExpenses = currentUser.role === ROLES.ADMIN ? expenses :
    expenses.filter(e => {
      const submitter = users.find(u => u.id === e.submittedBy);
      return submitter?.managerId === currentUser.id;
    });
  const filtered = teamExpenses.filter(e => filter === "all" || e.status === filter);

  return (
    <div>
      <PageHeader title="Team Expenses" sub={`${teamExpenses.length} total expenses`} />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["all", "pending", "approved", "rejected"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "7px 16px", borderRadius: 8, border: `1px solid ${filter === f ? "#6c63ff" : "#1e2130"}`,
            background: filter === f ? "rgba(108,99,255,.15)" : "transparent", color: filter === f ? "#a5a0ff" : "#6c7a9c",
            fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize"
          }}>{f}</button>
        ))}
      </div>
      {filtered.length === 0 ? <EmptyState icon="◉" msg="No team expenses" /> :
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(e => <ExpenseCard key={e.id} expense={e} company={company} fmt={fmt} onClick={() => setModal({ type: "detail", expense: e, canAct: false })} users={users} showSubmitter />)}
        </div>}
    </div>
  );
}

// ─── USERS VIEW ───────────────────────────────────────────────────────────────
function UsersView({ state, update, showToast }) {
  const { users, currentUser } = state;
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "password123", role: ROLES.EMPLOYEE, managerId: "" });

  const addUser = () => {
    if (!form.name || !form.email) return showToast("Name and email required", "error");
    if (users.find(u => u.email === form.email)) return showToast("Email already exists", "error");
    const user = { id: uid(), ...form, createdAt: new Date().toISOString() };
    update({ users: [...users, user] });
    setShowAdd(false);
    setForm({ name: "", email: "", password: "password123", role: ROLES.EMPLOYEE, managerId: "" });
    showToast("User created!");
  };

  const updateRole = (userId, role) => {
    update({ users: users.map(u => u.id === userId ? { ...u, role } : u) });
    showToast("Role updated!");
  };

  const updateManager = (userId, managerId) => {
    update({ users: users.map(u => u.id === userId ? { ...u, managerId } : u) });
    showToast("Manager updated!");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <PageHeader title="Users & Roles" sub={`${users.length} team members`} noMargin />
        <button onClick={() => setShowAdd(true)} style={primaryBtn}>+ Add User</button>
      </div>

      {showAdd && (
        <div style={{ background: "#0f1117", border: "1px solid #6c63ff", borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 14, fontWeight: 700, color: "#a5a0ff" }}>New User</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Input label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Jane Smith" />
            <Input label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="jane@co.com" />
            <Input label="Password" value={form.password} onChange={v => setForm({ ...form, password: v })} placeholder="password" />
            <div>
              <label style={labelStyle}>Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={selectStyle}>
                {Object.values(ROLES).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Manager</label>
              <select value={form.managerId} onChange={e => setForm({ ...form, managerId: e.target.value })} style={selectStyle}>
                <option value="">No Manager</option>
                {users.filter(u => u.role !== ROLES.EMPLOYEE).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={addUser} style={primaryBtn}>Create User</button>
            <button onClick={() => setShowAdd(false)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e2130" }}>
              {["Member", "Email", "Role", "Manager", "Joined"].map(h => (
                <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontSize: 11, color: "#6c7a9c", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: "1px solid #1e2130" }}>
                <td style={{ padding: "14px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6c63ff,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>
                      {u.name[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0" }}>{u.name}</span>
                    {u.id === currentUser.id && <span style={{ fontSize: 10, background: "rgba(108,99,255,.2)", color: "#a5a0ff", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>YOU</span>}
                  </div>
                </td>
                <td style={{ padding: "14px 20px", fontSize: 12, color: "#6c7a9c" }}>{u.email}</td>
                <td style={{ padding: "14px 20px" }}>
                  {u.id !== currentUser.id ? (
                    <select value={u.role} onChange={e => updateRole(u.id, e.target.value)} style={{ ...selectStyle, padding: "4px 8px", fontSize: 11, width: "auto" }}>
                      {Object.values(ROLES).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : <RoleBadge role={u.role} />}
                </td>
                <td style={{ padding: "14px 20px" }}>
                  {u.id !== currentUser.id ? (
                    <select value={u.managerId || ""} onChange={e => updateManager(u.id, e.target.value)} style={{ ...selectStyle, padding: "4px 8px", fontSize: 11, width: "auto" }}>
                      <option value="">None</option>
                      {users.filter(m => m.id !== u.id && m.role !== ROLES.EMPLOYEE).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  ) : <span style={{ fontSize: 12, color: "#6c7a9c" }}>{users.find(m => m.id === u.managerId)?.name || "—"}</span>}
                </td>
                <td style={{ padding: "14px 20px", fontSize: 12, color: "#6c7a9c" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── RULES VIEW ───────────────────────────────────────────────────────────────
function RulesView({ state, update, showToast }) {
  const { approvalRules, users } = state;
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", managerFirst: true,
    approvers: [], ruleType: "sequential",
    percentageThreshold: 60, specificApproverId: ""
  });

  const managers = users.filter(u => u.role !== ROLES.EMPLOYEE);

  const addApprover = () => setForm(f => ({ ...f, approvers: [...f.approvers, { id: uid(), userId: "", label: "" }] }));
  const removeApprover = (id) => setForm(f => ({ ...f, approvers: f.approvers.filter(a => a.id !== id) }));
  const updateApprover = (id, field, val) => setForm(f => ({ ...f, approvers: f.approvers.map(a => a.id === id ? { ...a, [field]: val } : a) }));

  const saveRule = () => {
    if (!form.name) return showToast("Rule name required", "error");
    const rule = { id: uid(), ...form, createdAt: new Date().toISOString() };
    update({ approvalRules: [...approvalRules, rule] });
    setShowAdd(false);
    showToast("Approval rule created!");
  };

  const deleteRule = (id) => { update({ approvalRules: approvalRules.filter(r => r.id !== id) }); showToast("Rule deleted"); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <PageHeader title="Approval Rules" sub="Define multi-level approval workflows" noMargin />
        <button onClick={() => setShowAdd(true)} style={primaryBtn}>+ New Rule</button>
      </div>

      {showAdd && (
        <div style={{ background: "#0f1117", border: "1px solid #6c63ff", borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 14, fontWeight: 700, color: "#a5a0ff" }}>Create Approval Rule</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Input label="Rule Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Standard Approval" />
            <Input label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} placeholder="e.g., For expenses >$500" />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, cursor: "pointer" }}>
            <input type="checkbox" checked={form.managerFirst} onChange={e => setForm({ ...form, managerFirst: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: "#6c63ff" }} />
            <span style={{ fontSize: 13, color: "#e8eaf0", fontWeight: 600 }}>Manager approves first (IS MANAGER APPROVER)</span>
          </label>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <label style={labelStyle}>Additional Approvers (in sequence)</label>
              <button onClick={addApprover} style={{ ...ghostBtn, padding: "6px 12px", fontSize: 12 }}>+ Add Step</button>
            </div>
            {form.approvers.map((a, i) => (
              <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#6c63ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0, marginBottom: 2 }}>{i + (form.managerFirst ? 2 : 1)}</div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Approver</label>
                  <select value={a.userId} onChange={e => updateApprover(a.id, "userId", e.target.value)} style={selectStyle}>
                    <option value="">Select approver</option>
                    {managers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <Input label="Step Label" value={a.label} onChange={v => updateApprover(a.id, "label", v)} placeholder="e.g., Finance, Director" />
                </div>
                <button onClick={() => removeApprover(a.id)} style={{ ...ghostBtn, padding: "9px 12px", color: "#ef4444", borderColor: "rgba(239,68,68,.3)", marginBottom: 0 }}>✕</button>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #1e2130", paddingTop: 20, marginBottom: 20 }}>
            <label style={{ ...labelStyle, marginBottom: 14 }}>Conditional Rule (optional)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Percentage Threshold (%)</label>
                <input type="number" value={form.percentageThreshold} onChange={e => setForm({ ...form, percentageThreshold: Number(e.target.value) })}
                  min={0} max={100} style={{ ...selectStyle }} placeholder="60" />
                <div style={{ fontSize: 10, color: "#6c7a9c", marginTop: 4 }}>If X% approve → auto-approve</div>
              </div>
              <div>
                <label style={labelStyle}>Specific Approver Override</label>
                <select value={form.specificApproverId} onChange={e => setForm({ ...form, specificApproverId: e.target.value })} style={selectStyle}>
                  <option value="">None</option>
                  {managers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
                <div style={{ fontSize: 10, color: "#6c7a9c", marginTop: 4 }}>If this person approves → auto-approve</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={saveRule} style={primaryBtn}>Save Rule</button>
            <button onClick={() => setShowAdd(false)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {approvalRules.length === 0 && !showAdd ? <EmptyState icon="⬟" msg="No approval rules yet. Create one to define workflows." /> :
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {approvalRules.map(rule => (
            <div key={rule.id} style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 16, padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{rule.name}</div>
                  {rule.description && <div style={{ fontSize: 12, color: "#6c7a9c", marginTop: 4 }}>{rule.description}</div>}
                </div>
                <button onClick={() => deleteRule(rule.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                {rule.managerFirst && <FlowStep label="Manager" order={1} />}
                {rule.approvers.map((a, i) => {
                  const u = users.find(u => u.id === a.userId);
                  return <><span style={{ color: "#1e2130", fontSize: 18 }}>→</span><FlowStep key={a.id} label={a.label || u?.name || "?"} order={i + (rule.managerFirst ? 2 : 1)} /></>;
                })}
              </div>
              {(rule.percentageThreshold || rule.specificApproverId) && (
                <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.15)", borderRadius: 10, fontSize: 12, color: "#f59e0b" }}>
                  ⚡ Conditional: {[
                    rule.percentageThreshold && `${rule.percentageThreshold}% approval → auto-approve`,
                    rule.specificApproverId && `${users.find(u => u.id === rule.specificApproverId)?.name || "?"} approves → auto-approve`
                  ].filter(Boolean).join(" OR ")}
                </div>
              )}
            </div>
          ))}
        </div>}
    </div>
  );
}

// ─── SUBMIT MODAL ─────────────────────────────────────────────────────────────
function SubmitModal({ onClose, onSubmit, rules, currentUser, company, countries, convert }) {
  const [form, setForm] = useState({ amount: "", currency: company.currency, category: "", description: "", date: today(), ruleId: "", managerFirst: !!currentUser.managerId });
  const [ocr, setOcr] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef();

  const currencies = [...new Set(countries.map(c => c.currency).filter(Boolean))].sort();
  const converted = form.amount && form.currency !== company.currency ? convert(parseFloat(form.amount), form.currency, company.currency) : null;

  const handleOCR = async (file) => {
    setOcrLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(",")[1];
      setPreview(e.target.result);
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            messages: [{
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: file.type, data: base64 } },
                { type: "text", text: `Extract expense details from this receipt. Respond ONLY with JSON (no markdown): {"amount": number, "currency": "USD", "description": "short description", "category": "one of: Travel/Meals & Entertainment/Accommodation/Office Supplies/Software/Training/Marketing/Utilities/Consulting/Other", "date": "YYYY-MM-DD", "vendor": "vendor name"}` }
              ]
            }]
          })
        });
        const data = await res.json();
        const text = data.content?.find(c => c.type === "text")?.text || "";
        const clean = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        setForm(f => ({
          ...f,
          amount: parsed.amount?.toString() || f.amount,
          currency: parsed.currency || f.currency,
          description: [parsed.vendor, parsed.description].filter(Boolean).join(" - ") || f.description,
          category: EXPENSE_CATEGORIES.includes(parsed.category) ? parsed.category : f.category,
          date: parsed.date || f.date,
        }));
      } catch (err) {
        console.error(err);
      }
      setOcrLoading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <ModalWrap onClose={onClose}>
      <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#fff" }}>Submit Expense</h2>
      <p style={{ margin: "0 0 24px", color: "#6c7a9c", fontSize: 13 }}>Fill in the details or scan a receipt</p>

      {/* OCR ZONE */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{ border: "2px dashed #1e2130", borderRadius: 12, padding: "16px", textAlign: "center", cursor: "pointer", marginBottom: 20, background: "#0a0b0f", transition: "border-color .2s", position: "relative" }}
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#6c63ff"; }}
        onDragLeave={e => e.currentTarget.style.borderColor = "#1e2130"}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) handleOCR(f); }}
      >
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (f) handleOCR(f); }} />
        {ocrLoading ? (
          <div style={{ color: "#6c63ff", fontSize: 13 }}>🔍 Scanning receipt with OCR...</div>
        ) : preview ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={preview} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8 }} alt="receipt" />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, color: "#34d399", fontWeight: 700 }}>✓ Receipt scanned</div>
              <div style={{ fontSize: 11, color: "#6c7a9c" }}>Fields auto-filled below</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📷</div>
            <div style={{ fontSize: 12, color: "#6c7a9c" }}>Drag & drop receipt or <span style={{ color: "#6c63ff", fontWeight: 700 }}>click to scan</span></div>
            <div style={{ fontSize: 11, color: "#2a2d3e", marginTop: 4 }}>OCR auto-extracts amount, date & vendor</div>
          </>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={labelStyle}>Amount</label>
          <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={selectStyle} placeholder="0.00" />
          {converted && <div style={{ fontSize: 11, color: "#6c63ff", marginTop: 4 }}>≈ {fmt(converted, company.currency)}</div>}
        </div>
        <div>
          <label style={labelStyle}>Currency</label>
          <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} style={selectStyle}>
            {currencies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <label style={labelStyle}>Category</label>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={selectStyle}>
            <option value="">Select category</option>
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <Input label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} placeholder="What was this expense for?" />
        </div>
        <div>
          <Input label="Date" type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} />
        </div>
        <div>
          <label style={labelStyle}>Approval Rule</label>
          <select value={form.ruleId} onChange={e => setForm({ ...form, ruleId: e.target.value })} style={selectStyle}>
            <option value="">Default (Manager only)</option>
            {rules.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        {currentUser.managerId && (
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={form.managerFirst} onChange={e => setForm({ ...form, managerFirst: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: "#6c63ff" }} />
              <span style={{ fontSize: 13, color: "#e8eaf0" }}>Require manager approval first</span>
            </label>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        <button onClick={() => {
          if (!form.amount || !form.category || !form.description) return alert("Amount, category and description required");
          onSubmit(form);
        }} style={{ ...primaryBtn, flex: 1 }}>Submit Expense</button>
        <button onClick={onClose} style={ghostBtn}>Cancel</button>
      </div>
    </ModalWrap>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────
function DetailModal({ expense, onClose, onAction, currentUser, users, company, fmt, canAct }) {
  const [comment, setComment] = useState("");
  const submitter = users.find(u => u.id === expense.submittedBy);

  return (
    <ModalWrap onClose={onClose} wide>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: "#fff" }}>{expense.description}</h2>
          <div style={{ fontSize: 12, color: "#6c7a9c" }}>Submitted by {submitter?.name} · {expense.date}</div>
        </div>
        <StatusBadge status={expense.status} large />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Amount", value: fmt(expense.amount, expense.currency) },
          { label: `In ${expense.companyCurrency}`, value: fmt(expense.convertedAmount, expense.companyCurrency) },
          { label: "Category", value: expense.category },
        ].map((f, i) => (
          <div key={i} style={{ background: "#0a0b0f", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#6c7a9c", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{f.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{f.value}</div>
          </div>
        ))}
      </div>

      {/* APPROVAL STEPS */}
      {expense.approvalSteps?.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#6c7a9c", fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Approval Flow</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {expense.approvalSteps.map((step, i) => {
              const approver = users.find(u => u.id === step.approverId);
              const isCurrent = expense.currentStep === i;
              return (
                <div key={step.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  borderRadius: 10, border: `1px solid ${isCurrent ? "rgba(108,99,255,.4)" : "#1e2130"}`,
                  background: isCurrent ? "rgba(108,99,255,.06)" : "transparent"
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
                    background: step.status === "approved" ? "rgba(52,211,153,.2)" : step.status === "rejected" ? "rgba(239,68,68,.2)" : isCurrent ? "rgba(108,99,255,.2)" : "#1e2130",
                    color: step.status === "approved" ? "#34d399" : step.status === "rejected" ? "#ef4444" : isCurrent ? "#6c63ff" : "#6c7a9c"
                  }}>{step.status === "approved" ? "✓" : step.status === "rejected" ? "✕" : i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0" }}>{step.label} — {approver?.name || "Unknown"}</div>
                    {step.comment && <div style={{ fontSize: 11, color: "#6c7a9c", marginTop: 2 }}>"{step.comment}"</div>}
                  </div>
                  <span style={{ fontSize: 11, color: isCurrent ? "#6c63ff" : "#6c7a9c", fontWeight: 600 }}>
                    {isCurrent ? "⟳ Current" : step.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ACTION */}
      {canAct && expense.status === "pending" && (
        <div style={{ borderTop: "1px solid #1e2130", paddingTop: 20 }}>
          <Input label="Comment (optional)" value={comment} onChange={setComment} placeholder="Add a note..." />
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={() => onAction(expense.id, "approved", comment)} style={{ ...primaryBtn, flex: 1, background: "linear-gradient(135deg,#10b981,#059669)" }}>✓ Approve</button>
            <button onClick={() => onAction(expense.id, "rejected", comment)} style={{ ...primaryBtn, flex: 1, background: "linear-gradient(135deg,#ef4444,#dc2626)" }}>✕ Reject</button>
          </div>
        </div>
      )}
    </ModalWrap>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function ExpenseCard({ expense, company, fmt, onClick, users, showSubmitter }) {
  const submitter = users.find(u => u.id === expense.submittedBy);
  return (
    <div onClick={onClick} style={{
      background: "#0f1117", border: "1px solid #1e2130", borderRadius: 14, padding: "16px 20px",
      cursor: "pointer", display: "flex", alignItems: "center", gap: 14, transition: "border-color .2s, background .2s"
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#2a2d4a"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "#1e2130"}
    >
      <div style={{ width: 42, height: 42, borderRadius: 12, background: "#161822", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
        {categoryIcon(expense.category)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#e8eaf0" }}>{expense.description}</div>
        <div style={{ fontSize: 12, color: "#6c7a9c", marginTop: 3 }}>
          {expense.category} · {expense.date}
          {showSubmitter && submitter && ` · ${submitter.name}`}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{fmt(expense.convertedAmount, company.currency)}</div>
        {expense.currency !== company.currency && <div style={{ fontSize: 11, color: "#6c7a9c" }}>{fmt(expense.amount, expense.currency)}</div>}
        <div style={{ marginTop: 4 }}><StatusBadge status={expense.status} /></div>
      </div>
    </div>
  );
}

function StatusBadge({ status, large }) {
  const map = { approved: ["#34d399", "rgba(52,211,153,.12)"], rejected: ["#ef4444", "rgba(239,68,68,.12)"], pending: ["#f59e0b", "rgba(245,158,11,.12)"] };
  const [color, bg] = map[status] || ["#6c7a9c", "#1e2130"];
  return <span style={{ fontSize: large ? 12 : 10, color, background: bg, padding: large ? "4px 10px" : "2px 8px", borderRadius: 6, fontWeight: 700, display: "inline-block", textTransform: "capitalize" }}>{status}</span>;
}

function RoleBadge({ role }) {
  const map = { Admin: "#6c63ff", Manager: "#f59e0b", Employee: "#34d399" };
  return <span style={{ fontSize: 11, color: map[role] || "#6c7a9c", background: `${map[role]}18`, padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>{role}</span>;
}

function FlowStep({ label, order }) {
  return <div style={{ background: "rgba(108,99,255,.12)", border: "1px solid rgba(108,99,255,.2)", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#a5a0ff", fontWeight: 600 }}>
    <span style={{ opacity: 0.6, marginRight: 6 }}>{order}.</span>{label}
  </div>;
}

function EmptyState({ icon, msg }) {
  return <div style={{ textAlign: "center", padding: "60px 20px", color: "#2a2d3e" }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 14, color: "#4a5068" }}>{msg}</div>
  </div>;
}

function PageHeader({ title, sub, noMargin }) {
  return <div style={{ marginBottom: noMargin ? 0 : 28 }}>
    <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}>{title}</h1>
    {sub && <p style={{ margin: "6px 0 0", color: "#6c7a9c", fontSize: 13 }}>{sub}</p>}
  </div>;
}

function Input({ label, value, onChange, type = "text", placeholder }) {
  return <div>
    {label && <label style={labelStyle}>{label}</label>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={selectStyle} />
  </div>;
}

function ModalWrap({ children, onClose, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20, backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 20, padding: 32, width: "100%", maxWidth: wide ? 620 : 500, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function categoryIcon(cat) {
  const map = { "Travel": "✈", "Meals & Entertainment": "🍽", "Accommodation": "🏨", "Office Supplies": "📎", "Software": "💻", "Training": "📚", "Marketing": "📣", "Utilities": "⚡", "Consulting": "💼", "Other": "📋" };
  return map[cat] || "📋";
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const labelStyle = { fontSize: 11, color: "#6c7a9c", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 };
const selectStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, background: "#161822", border: "1px solid #1e2130", color: "#e8eaf0", fontSize: 13, outline: "none", boxSizing: "border-box" };
const primaryBtn = { padding: "10px 20px", borderRadius: 10, background: "linear-gradient(135deg,#6c63ff,#a855f7)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const ghostBtn = { padding: "10px 20px", borderRadius: 10, background: "transparent", border: "1px solid #1e2130", color: "#6c7a9c", fontSize: 13, fontWeight: 600, cursor: "pointer" };

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0a0b0f; }
  ::-webkit-scrollbar-thumb { background: #1e2130; border-radius: 3px; }
  input, select { transition: border-color .2s; }
  input:focus, select:focus { border-color: #6c63ff !important; outline: none; }
  button:active { transform: scale(0.97); }
`;
