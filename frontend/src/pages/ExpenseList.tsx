import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { listExpenses, updateExpenseStatus } from "../utils/api";

export default function ExpenseList() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const loadExpenses = async () => {
      try {
        const result = await listExpenses();
        setExpenses(result.data || []);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load expenses";
        alert(message);
      }
    };

    loadExpenses();
  }, []);

  const updateStatus = async (expenseId: number, status: "approved" | "rejected") => {
    try {
      await updateExpenseStatus(expenseId, status);
      const refreshed = await listExpenses();
      setExpenses(refreshed.data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update status";
      alert(message);
    }
  };

  return (
    <div className="layout">
      {/* 🔥 Sidebar */}
      <Sidebar />

      {/* 🔥 Main Content */}
      <div className="content">
        <h2>All Expenses</h2>

        <div className="table-container">
          {expenses.length === 0 ? (
            <p>No expenses found</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {expenses.map((exp, index) => {
                  const status = exp.status || "submitted";

                  return (
                    <tr key={exp.id || index}>
                      <td>{exp.amount}</td>
                      <td>{exp.category}</td>
                      <td>{exp.description}</td>
                      <td>{new Date(exp.expense_date).toLocaleDateString()}</td>
                      <td>{status}</td>

                      <td>
                        {user.role === "manager" &&
                          status === "submitted" && (
                            <>
                              <button
                                onClick={() =>
                                  updateStatus(exp.id, "approved")
                                }
                              >
                                Approve
                              </button>

                              <button
                                onClick={() =>
                                  updateStatus(exp.id, "rejected")
                                }
                              >
                                Reject
                              </button>
                            </>
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}