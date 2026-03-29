/**
 * Employee Dashboard Page
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import expenseService from "../services/expenseService";
import { Expense } from "../types";
import { Loading } from "../components/Common/Loading";
import "../styles/pages/Dashboard.css";

export const EmployeeDashboard: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const data = await expenseService.listExpenses();
      setExpenses(data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  const stats = {
    total: expenses.length,
    draft: expenses.filter((e) => e.status === "draft").length,
    approved: expenses.filter((e) => e.status === "approved").length,
    pending: expenses.filter((e) => e.status === "submitted").length,
  };

  return (
    <div className="dashboard">
      <h1>Employee Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.total}</h3>
          <p>Total Expenses</p>
        </div>
        <div className="stat-card">
          <h3>{stats.draft}</h3>
          <p>Draft</p>
        </div>
        <div className="stat-card">
          <h3>{stats.pending}</h3>
          <p>Pending</p>
        </div>
        <div className="stat-card">
          <h3>{stats.approved}</h3>
          <p>Approved</p>
        </div>
      </div>

      <Link to="/expenses" className="btn btn-primary btn-lg">
        View All Expenses
      </Link>
    </div>
  );
};