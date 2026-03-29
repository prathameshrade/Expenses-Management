import Sidebar from "../components/Sidebar";
import { useEffect, useState } from "react";
import { listExpenses } from "../utils/api";

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [total, setTotal] = useState(0);
  const [approved, setApproved] = useState(0);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await listExpenses();
        const expenses = result.data || [];
        setTotal(expenses.length);
        setApproved(expenses.filter((e: any) => e.status === "approved").length);
        setPending(expenses.filter((e: any) => e.status !== "approved").length);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load dashboard";
        alert(message);
      }
    };

    load();
  }, []);

  return (
    <div className="layout">
      <Sidebar />

      <div className="content">
        <h1>Dashboard</h1>

        <p>Welcome {user.email}</p>
        <p>Role: {user.role}</p>

        <br />

        {/* 🔥 Stats */}
        <div style={{ display: "flex", gap: "20px" }}>
          <div className="container">
            <h3>Total Expenses</h3>
            <p>{total}</p>
          </div>

          <div className="container">
            <h3>Approved</h3>
            <p>{approved}</p>
          </div>

          <div className="container">
            <h3>Pending</h3>
            <p>{pending}</p>
          </div>
        </div>
      </div>
    </div>
  );
}