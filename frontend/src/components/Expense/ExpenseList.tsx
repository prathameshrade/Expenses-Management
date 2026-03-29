/**
 * Expense List Component
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Expense } from "../../types";
import expenseService from "../../services/expenseService";
import { formatCurrency, formatDate, getStatusColor, getCategoryIcon } from "../../utils/helpers";
import { Loading } from "../Common/Loading";
import "../styles/ExpenseList.css";

export const ExpenseList: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await expenseService.listExpenses();
      setExpenses(data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="expense-list">
      <div className="list-header">
        <h2>My Expenses</h2>
        <Link to="/expenses/create" className="btn btn-primary">
          + New Expense
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      {expenses.length === 0 ? (
        <div className="empty-state">
          <p>No expenses found</p>
          <Link to="/expenses/create" className="btn btn-primary">
            Create your first expense
          </Link>
        </div>
      ) : (
        <table className="expenses-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td>{formatDate(expense.expense_date)}</td>
                <td>
                  <span className="category">
                    {getCategoryIcon(expense.category)} {expense.category}
                  </span>
                </td>
                <td>{expense.description}</td>
                <td>{formatCurrency(expense.amount, expense.currency)}</td>
                <td>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(expense.status) }}
                  >
                    {expense.status}
                  </span>
                </td>
                <td>
                  <Link to={`/expenses/${expense.id}`} className="btn-sm btn-info">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};