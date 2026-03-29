/**
 * Create Expense Page
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { ExpenseForm } from "../components/Expense/ExpenseForm";

export const CreateExpense: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="create-expense-page">
      <ExpenseForm onSuccess={() => navigate("/expenses")} />
    </div>
  );
};