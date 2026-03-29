import { useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="sidebar">
      <h2>Expense App</h2>

      <p>{user.role}</p>

      {/* Employee */}
      {user.role === "employee" && (
        <button onClick={() => navigate("/expense")}>
          Add Expense
        </button>
      )}

      {/* Manager */}
      {user.role === "manager" && (
        <button onClick={() => navigate("/expenses")}>
          Approvals
        </button>
      )}

      {/* Admin */}
      {user.role === "admin" && (
        <>
          <button onClick={() => navigate("/expense")}>
            Add Expense
          </button>

          <button onClick={() => navigate("/expenses")}>
            All Expenses
          </button>
        </>
      )}

      {/* 🔥 Logout */}
      <hr />
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}