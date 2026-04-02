import { useEffect, useMemo, useRef, useState } from "react";

const ROLES = { ADMIN: "ADMIN", MANAGER: "MANAGER", EMPLOYEE: "EMPLOYEE" };
const CATEGORIES = ["Travel", "Meals & Entertainment", "Accommodation", "Office Supplies", "Software", "Training", "Marketing", "Utilities", "Consulting", "Other"];
const SESSION_KEY = "expense_api_session_v1";

const fmt = (amount, currency = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount || 0));
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
};

const today = () => new Date().toISOString().split("T")[0];

async function request(path, { method = "GET", body, token, headers } = {}) {
  const finalHeaders = { ...(headers || {}) };
  if (!(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers: finalHeaders,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

function roleLabel(role) {
  if (role === ROLES.ADMIN) return "Admin";
  if (role === ROLES.MANAGER) return "Manager";
  return "Employee";
}

function normalizeExpense(row) {
  return {
    id: row.id,
    submittedBy: row.employee_id || row.submittedBy || null,
    submittedByName: row.employee_name || row.submittedByName || null,
    amount: Number(row.amount || 0),
    currency: row.original_currency || row.currency || "USD",
    convertedAmount: Number(row.company_amount || row.convertedAmount || 0),
    companyCurrency: row.company_currency || row.companyCurrency || "USD",
    category: row.category || "Other",
    description: row.description || "",
    date: row.expense_date || row.date || today(),
    status: String(row.status || "PENDING").toLowerCase(),
    createdAt: row.created_at || new Date().toISOString(),
    pendingApprovalId: row.pendingApprovalId || null,
  };
}

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState({ name: "Company", currency: "USD" });
  const [users, setUsers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [workflow, setWorkflow] = useState(null);
  const [countries, setCountries] = useState([]);
  const [view, setView] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch("https://restcountries.com/v3.1/all?fields=name,currencies")
      .then((r) => r.json())
      .then((data) => {
        const list = data
          .map((c) => ({ name: c.name.common, currency: c.currencies ? Object.keys(c.currencies)[0] : null }))
          .filter((x) => x.currency)
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountries(list);
      })
      .catch(() => {});
  }, []);

  const loadData = async (activeSession) => {
    if (!activeSession?.token || !activeSession?.user) return;
    setUser(activeSession.user);
    if (activeSession.company) {
      setCompany(activeSession.company);
    }

    if (activeSession.user.role === ROLES.ADMIN) {
      const [usersRes, teamRes, wfRes, pendingRes] = await Promise.all([
        request("/users", { token: activeSession.token }),
        request("/expenses/team", { token: activeSession.token }),
        request("/workflows/active", { token: activeSession.token }),
        request("/approvals/pending", { token: activeSession.token }),
      ]);
      setUsers(
        usersRes.users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: String(u.role || ROLES.EMPLOYEE).toUpperCase(),
          managerId: u.manager_id || null,
          createdAt: u.created_at || new Date().toISOString(),
        }))
      );
      setExpenses(teamRes.expenses.map(normalizeExpense));
      setPendingApprovals(
        pendingRes.approvals.map((a) =>
          normalizeExpense({
            ...a,
            id: a.expense_id,
            pendingApprovalId: a.id,
            status: "PENDING",
            employee_name: a.employee_name,
          })
        )
      );
      setWorkflow({ workflow: wfRes.workflow, steps: wfRes.steps || [] });
    }

    if (activeSession.user.role === ROLES.MANAGER) {
      const [teamRes, pendingRes] = await Promise.all([
        request("/expenses/team", { token: activeSession.token }),
        request("/approvals/pending", { token: activeSession.token }),
      ]);
      setUsers([]);
      setExpenses(teamRes.expenses.map(normalizeExpense));
      setPendingApprovals(
        pendingRes.approvals.map((a) =>
          normalizeExpense({
            ...a,
            id: a.expense_id,
            pendingApprovalId: a.id,
            status: "PENDING",
            employee_name: a.employee_name,
          })
        )
      );
      setWorkflow(null);
    }

    if (activeSession.user.role === ROLES.EMPLOYEE) {
      const myRes = await request("/expenses/my", { token: activeSession.token });
      setUsers([]);
      setExpenses(myRes.expenses.map((e) => normalizeExpense({ ...e, employee_id: activeSession.user.id })));
      setPendingApprovals([]);
      setWorkflow(null);
    }
  };

  useEffect(() => {
    if (!session) return;
    loadData(session).catch((e) => showToast(e.message, "error"));
  }, [session]);

  const myExpenses = useMemo(() => {
    if (!user) return [];
    if (user.role === ROLES.EMPLOYEE) return expenses.filter((e) => e.submittedBy === user.id);
    return expenses;
  }, [user, expenses]);

  const nav = [
    { id: "dashboard", label: "Dashboard" },
    { id: "expenses", label: "My Expenses", roles: [ROLES.EMPLOYEE, ROLES.ADMIN] },
    { id: "approvals", label: `Approvals${pendingApprovals.length ? ` (${pendingApprovals.length})` : ""}`, roles: [ROLES.MANAGER, ROLES.ADMIN] },
    { id: "team", label: "Team Expenses", roles: [ROLES.MANAGER, ROLES.ADMIN] },
    { id: "users", label: "Users", roles: [ROLES.ADMIN] },
    { id: "rules", label: "Approval Rules", roles: [ROLES.ADMIN] },
  ].filter((x) => !x.roles || x.roles.includes(user?.role));

  if (!user) {
    return (
      <AuthScreen
        countries={countries}
        onAuth={(next) => {
          setSession(next);
          localStorage.setItem(SESSION_KEY, JSON.stringify(next));
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0b0f", color: "#e8eaf0", fontFamily: "'DM Sans', system-ui, sans-serif", display: "grid", gridTemplateColumns: "240px 1fr" }}>
      <style>{globalCSS}</style>

      <aside style={{ borderRight: "1px solid #1e2130", background: "#0f1117", padding: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>EXPENZO</div>
        <div style={{ color: "#6c7a9c", fontSize: 12, marginBottom: 16 }}>{company.name}</div>
        <div style={{ display: "grid", gap: 6 }}>
          {nav.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)} style={{ ...ghostBtn, textAlign: "left", borderColor: view === n.id ? "#6c63ff" : "#1e2130", color: view === n.id ? "#a5a0ff" : "#6c7a9c" }}>
              {n.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 24, borderTop: "1px solid #1e2130", paddingTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{user.name}</div>
          <div style={{ fontSize: 11, color: "#6c7a9c", marginBottom: 10 }}>{roleLabel(user.role)}</div>
          <button
            style={{ ...ghostBtn, width: "100%", borderColor: "rgba(239,68,68,.3)", color: "#ef4444" }}
            onClick={() => {
              localStorage.removeItem(SESSION_KEY);
              setSession(null);
              setUser(null);
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main style={{ padding: 24 }}>
        {view === "dashboard" && (
          <div>
            <h1 style={{ marginTop: 0 }}>Dashboard</h1>
            <p style={{ color: "#6c7a9c" }}>Welcome back, {user.name}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              <Stat title="Approved Amount" value={fmt(myExpenses.filter((x) => x.status === "approved").reduce((s, x) => s + x.convertedAmount, 0), company.currency)} />
              <Stat title="Pending" value={myExpenses.filter((x) => x.status === "pending").length} />
              <Stat title="Rejected" value={myExpenses.filter((x) => x.status === "rejected").length} />
              <Stat title="Total" value={myExpenses.length} />
            </div>
          </div>
        )}

        {view === "expenses" && <ExpenseList title="My Expenses" rows={myExpenses} company={company} onOpen={(expense) => setModal({ type: "detail", expense, canAct: false })} />}
        {view === "approvals" && <ExpenseList title="Pending Approvals" rows={pendingApprovals} company={company} onOpen={(expense) => setModal({ type: "detail", expense, canAct: true })} />}
        {view === "team" && <ExpenseList title="Team Expenses" rows={expenses} company={company} onOpen={(expense) => setModal({ type: "detail", expense, canAct: false })} />}

        {view === "users" && (
          <UsersView
            users={users}
            onCreate={async (payload) => {
              await request("/users", { method: "POST", body: payload, token: session.token });
              await loadData(session);
              showToast("User created");
            }}
            onUpdate={async (id, payload) => {
              await request(`/users/${id}`, { method: "PATCH", body: payload, token: session.token });
              await loadData(session);
              showToast("User updated");
            }}
          />
        )}

        {view === "rules" && (
          <RulesView
            users={users}
            workflow={workflow}
            onSave={async (payload) => {
              await request("/workflows/active", { method: "POST", body: payload, token: session.token });
              await loadData(session);
              showToast("Workflow saved");
            }}
          />
        )}
      </main>

      {(user.role === ROLES.EMPLOYEE || user.role === ROLES.ADMIN) && (
        <button onClick={() => setModal({ type: "submit" })} style={{ position: "fixed", right: 28, bottom: 28, ...primaryBtn, width: 56, height: 56, borderRadius: "50%", fontSize: 24, padding: 0 }}>+</button>
      )}

      {modal?.type === "submit" && (
        <SubmitModal
          company={company}
          countries={countries}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            await request("/expenses", { method: "POST", token: session.token, body: payload });
            await loadData(session);
            setModal(null);
            showToast("Expense submitted");
          }}
          onOCR={async (file) => {
            const form = new FormData();
            form.append("receipt", file);
            return request("/expenses/ocr", { method: "POST", token: session.token, body: form });
          }}
        />
      )}

      {modal?.type === "detail" && (
        <DetailModal
          expense={modal.expense}
          company={company}
          canAct={modal.canAct}
          onClose={() => setModal(null)}
          onDecision={async (expense, decision, comments) => {
            if (!expense.pendingApprovalId) return;
            await request(`/approvals/${expense.pendingApprovalId}/decision`, {
              method: "POST",
              token: session.token,
              body: { decision, comments },
            });
            await loadData(session);
            setModal(null);
            showToast("Decision saved");
          }}
        />
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "rgba(239,68,68,.15)" : "rgba(52,211,153,.15)", border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,.5)" : "rgba(52,211,153,.5)"}`, color: toast.type === "error" ? "#ef4444" : "#34d399", padding: "10px 16px", borderRadius: 10, zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function AuthScreen({ countries, onAuth }) {
  const [tab, setTab] = useState("login");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", country: "United States", email: "", password: "" });

  const countryObj = countries.find((c) => c.name === form.country);

  const doLogin = async () => {
    setBusy(true);
    setErr("");
    try {
      const data = await request("/login", { method: "POST", body: { email: form.email, password: form.password } });
      onAuth({ token: data.token, user: { ...data.user, role: String(data.user.role).toUpperCase() }, company: null });
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const doSignup = async () => {
    setBusy(true);
    setErr("");
    try {
      const data = await request("/signup", {
        method: "POST",
        body: {
          companyName: form.company,
          country: form.country,
          adminName: form.name,
          email: form.email,
          password: form.password,
        },
      });
      onAuth({ token: data.token, user: { ...data.user, role: String(data.user.role).toUpperCase() }, company: data.company });
    } catch (e) {
      setErr(e.message || "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0b0f", color: "#e8eaf0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{globalCSS}</style>
      <div style={{ width: 420, background: "#0f1117", border: "1px solid #1e2130", borderRadius: 16, padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>EXPENZO</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={() => setTab("login")} style={{ ...ghostBtn, flex: 1, borderColor: tab === "login" ? "#6c63ff" : "#1e2130", color: tab === "login" ? "#a5a0ff" : "#6c7a9c" }}>Login</button>
          <button onClick={() => setTab("signup")} style={{ ...ghostBtn, flex: 1, borderColor: tab === "signup" ? "#6c63ff" : "#1e2130", color: tab === "signup" ? "#a5a0ff" : "#6c7a9c" }}>Signup</button>
        </div>

        {tab === "signup" && (
          <>
            <Input label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Input label="Company Name" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
            <div>
              <label style={labelStyle}>Country ({countryObj?.currency || "USD"})</label>
              <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} style={selectStyle}>
                {countries.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.currency})</option>)}
              </select>
            </div>
          </>
        )}

        <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Input label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />

        {err ? <div style={{ marginTop: 8, color: "#ef4444", fontSize: 12 }}>{err}</div> : null}

        <button onClick={tab === "login" ? doLogin : doSignup} disabled={busy} style={{ ...primaryBtn, width: "100%", marginTop: 12, opacity: busy ? 0.7 : 1 }}>
          {busy ? "Please wait..." : tab === "login" ? "Sign In" : "Create Account"}
        </button>
      </div>
    </div>
  );
}

function ExpenseList({ title, rows, company, onOpen }) {
  return (
    <div>
      <h2>{title}</h2>
      {!rows.length ? <Empty msg="No records" /> : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((r) => (
            <button key={`${r.id}-${r.pendingApprovalId || "x"}`} onClick={() => onOpen(r)} style={{ ...ghostBtn, textAlign: "left", padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#e8eaf0", fontWeight: 700 }}>{r.description || "Expense"}</div>
                  <div style={{ color: "#6c7a9c", fontSize: 12 }}>{r.category} · {r.date}{r.submittedByName ? ` · ${r.submittedByName}` : ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#fff", fontWeight: 700 }}>{fmt(r.convertedAmount, r.companyCurrency || company.currency)}</div>
                  <StatusBadge status={r.status} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersView({ users, onCreate, onUpdate }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "password123", role: ROLES.EMPLOYEE, managerId: "" });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Users & Roles</h2>
        <button style={primaryBtn} onClick={() => setShowAdd((x) => !x)}>+ Add User</button>
      </div>

      {showAdd && (
        <div style={{ border: "1px solid #6c63ff", borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Input label="Password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Role</label>
              <select style={selectStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value={ROLES.EMPLOYEE}>Employee</option>
                <option value={ROLES.MANAGER}>Manager</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Manager</label>
              <select style={selectStyle} value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
                <option value="">None</option>
                {users.filter((u) => u.role === ROLES.MANAGER).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <button
            style={{ ...primaryBtn, marginTop: 10 }}
            onClick={() => onCreate({ name: form.name, email: form.email, password: form.password, role: form.role, managerId: form.managerId || null })}
          >
            Create
          </button>
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {users.map((u) => (
          <div key={u.id} style={{ border: "1px solid #1e2130", borderRadius: 10, padding: 12, display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{u.name}</div>
              <div style={{ fontSize: 12, color: "#6c7a9c" }}>{u.email}</div>
            </div>
            <select style={{ ...selectStyle, width: 130 }} value={u.role} onChange={(e) => onUpdate(u.id, { role: e.target.value, managerId: u.managerId || null })}>
              <option value={ROLES.EMPLOYEE}>Employee</option>
              <option value={ROLES.MANAGER}>Manager</option>
            </select>
            <select style={{ ...selectStyle, width: 150 }} value={u.managerId || ""} onChange={(e) => onUpdate(u.id, { role: u.role, managerId: e.target.value || null })}>
              <option value="">No manager</option>
              {users.filter((m) => m.role === ROLES.MANAGER && m.id !== u.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function RulesView({ users, workflow, onSave }) {
  const managers = users.filter((u) => u.role !== ROLES.EMPLOYEE);
  const [form, setForm] = useState(() => ({
    name: workflow?.workflow?.name || "Default Corporate Flow",
    approvalMode: workflow?.workflow?.approval_mode || "HYBRID",
    isManagerApprover: workflow?.workflow?.is_manager_approver ? true : true,
    percentageThreshold: workflow?.workflow?.percentage_threshold != null ? Number(workflow.workflow.percentage_threshold) * 100 : 60,
    specificApproverId: workflow?.workflow?.specific_approver_id || "",
    steps: workflow?.steps?.length
      ? workflow.steps.map((s, i) => ({ id: `${i + 1}`, label: s.label || `Step ${i + 1}`, approverUserId: s.approver_user_id || "", approverRole: s.approver_role || "MANAGER" }))
      : [{ id: "1", label: "Finance", approverUserId: "", approverRole: "MANAGER" }],
  }));

  return (
    <div>
      <h2>Approval Rules</h2>
      <Input label="Workflow Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>Mode</label>
          <select style={selectStyle} value={form.approvalMode} onChange={(e) => setForm({ ...form, approvalMode: e.target.value })}>
            <option value="SEQUENTIAL">Sequential</option>
            <option value="CONDITIONAL">Conditional</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Threshold (%)</label>
          <input style={selectStyle} type="number" min={0} max={100} value={form.percentageThreshold} onChange={(e) => setForm({ ...form, percentageThreshold: Number(e.target.value) })} />
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <label style={labelStyle}>Specific Approver</label>
        <select style={selectStyle} value={form.specificApproverId} onChange={(e) => setForm({ ...form, specificApproverId: e.target.value })}>
          <option value="">None</option>
          {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <input type="checkbox" checked={form.isManagerApprover} onChange={(e) => setForm({ ...form, isManagerApprover: e.target.checked })} /> Manager first approver
      </label>

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {form.steps.map((s, idx) => (
          <div key={s.id} style={{ border: "1px solid #1e2130", borderRadius: 8, padding: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8 }}>
            <input style={selectStyle} value={s.label} onChange={(e) => setForm({ ...form, steps: form.steps.map((x) => x.id === s.id ? { ...x, label: e.target.value } : x) })} />
            <select style={selectStyle} value={s.approverRole} onChange={(e) => setForm({ ...form, steps: form.steps.map((x) => x.id === s.id ? { ...x, approverRole: e.target.value } : x) })}>
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <select style={selectStyle} value={s.approverUserId} onChange={(e) => setForm({ ...form, steps: form.steps.map((x) => x.id === s.id ? { ...x, approverUserId: e.target.value } : x) })}>
              <option value="">Assign by role</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button style={{ ...ghostBtn, color: "#ef4444" }} onClick={() => setForm({ ...form, steps: form.steps.length > 1 ? form.steps.filter((x) => x.id !== s.id) : form.steps })}>✕</button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button style={ghostBtn} onClick={() => setForm({ ...form, steps: [...form.steps, { id: Math.random().toString(36).slice(2), label: `Step ${form.steps.length + 1}`, approverUserId: "", approverRole: "MANAGER" }] })}>+ Add Step</button>
        <button
          style={primaryBtn}
          onClick={() =>
            onSave({
              name: form.name,
              approvalMode: form.approvalMode,
              isManagerApprover: form.isManagerApprover,
              percentageThreshold: form.percentageThreshold ? form.percentageThreshold / 100 : null,
              specificApproverId: form.specificApproverId || null,
              steps: form.steps.map((s, i) => ({
                stepOrder: i + 1,
                label: s.label,
                approverRole: s.approverUserId ? null : s.approverRole,
                approverUserId: s.approverUserId || null,
              })),
            })
          }
        >
          Save Workflow
        </button>
      </div>
    </div>
  );
}

function SubmitModal({ onClose, onSubmit, onOCR, company, countries }) {
  const [form, setForm] = useState({ amount: "", currency: company.currency || "USD", category: "", description: "", date: today() });
  const [preview, setPreview] = useState(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const fileRef = useRef(null);

  return (
    <ModalWrap onClose={onClose}>
      <h3 style={{ marginTop: 0 }}>Submit Expense</h3>
      <div style={{ border: "1px dashed #1e2130", borderRadius: 10, padding: 12, marginBottom: 12, textAlign: "center", cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          setPreview(URL.createObjectURL(file));
          setOcrBusy(true);
          try {
            const res = await onOCR(file);
            const d = res.draft || {};
            setForm((f) => ({
              ...f,
              amount: d.amount != null ? String(d.amount) : f.amount,
              description: d.merchant ? `${d.merchant}${f.description ? ` - ${f.description}` : ""}` : f.description,
              date: d.date || f.date,
              category: d.category && CATEGORIES.includes(d.category) ? d.category : f.category,
            }));
          } catch {
            // ignore
          }
          setOcrBusy(false);
        }} />
        {ocrBusy ? "Scanning..." : preview ? <img alt="receipt" src={preview} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8 }} /> : "Click to scan receipt (OCR)"}
      </div>
      <Input label="Amount" type="number" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>Currency</label>
          <select style={selectStyle} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {[...new Set(countries.map((c) => c.currency))].sort().map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Date</label>
          <input style={selectStyle} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Category</label>
        <select style={selectStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          <option value="">Select category</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <Input label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button style={primaryBtn} onClick={() => onSubmit({ amount: Number(form.amount), currency: form.currency, category: form.category, description: form.description, expenseDate: form.date })}>Submit</button>
        <button style={ghostBtn} onClick={onClose}>Cancel</button>
      </div>
    </ModalWrap>
  );
}

function DetailModal({ expense, onClose, onDecision, canAct, company }) {
  const [comments, setComments] = useState("");
  return (
    <ModalWrap onClose={onClose}>
      <h3 style={{ marginTop: 0 }}>{expense.description || "Expense"}</h3>
      <div style={{ color: "#6c7a9c", fontSize: 12, marginBottom: 10 }}>{expense.category} · {expense.date}{expense.submittedByName ? ` · ${expense.submittedByName}` : ""}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
        <div style={{ padding: 10, border: "1px solid #1e2130", borderRadius: 10 }}>{fmt(expense.amount, expense.currency)}</div>
        <div style={{ padding: 10, border: "1px solid #1e2130", borderRadius: 10 }}>{fmt(expense.convertedAmount, expense.companyCurrency || company.currency)}</div>
      </div>
      {canAct ? (
        <>
          <Input label="Comment" value={comments} onChange={setComments} />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...primaryBtn, background: "linear-gradient(135deg,#10b981,#059669)" }} onClick={() => onDecision(expense, "APPROVED", comments)}>Approve</button>
            <button style={{ ...primaryBtn, background: "linear-gradient(135deg,#ef4444,#dc2626)" }} onClick={() => onDecision(expense, "REJECTED", comments)}>Reject</button>
          </div>
        </>
      ) : null}
      <div style={{ marginTop: 8 }}><button style={ghostBtn} onClick={onClose}>Close</button></div>
    </ModalWrap>
  );
}

function Stat({ title, value }) {
  return (
    <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 12, color: "#6c7a9c" }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input style={selectStyle} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Empty({ msg }) {
  return <div style={{ color: "#6c7a9c", border: "1px dashed #1e2130", borderRadius: 10, padding: 20, textAlign: "center" }}>{msg}</div>;
}

function ModalWrap({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 500, display: "grid", placeItems: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 100%)", background: "#0f1117", border: "1px solid #1e2130", borderRadius: 14, padding: 16 }}>
        {children}
      </div>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#6c7a9c", marginBottom: 6, marginTop: 8 };
const selectStyle = { width: "100%", border: "1px solid #1e2130", background: "#161822", color: "#e8eaf0", borderRadius: 10, padding: "10px 12px", outline: "none" };
const primaryBtn = { background: "linear-gradient(135deg,#6c63ff,#a855f7)", border: "none", color: "#fff", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700 };
const ghostBtn = { background: "transparent", border: "1px solid #1e2130", color: "#6c7a9c", borderRadius: 10, padding: "10px 14px", cursor: "pointer" };

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; }
`;
