/**
 * Expense Form Component
 */

import React, { useState } from "react";
import { useForm } from "../../hooks/useForm";
import { ExpenseCreate } from "../../types";
import { EXPENSE_CATEGORIES } from "../../utils/constants";
import { validateExpenseForm } from "../../utils/validators";
import expenseService from "../../services/expenseService";
import "../styles/ExpenseForm.css";

interface ExpenseFormProps {
  onSuccess: () => void;
  initialData?: any;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onSuccess, initialData }) => {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const { values, errors, touched, handleChange, handleBlur, handleSubmit } = useForm(
    initialData || {
      category: "",
      description: "",
      amount: 0,
      currency: "USD",
      expense_date: new Date().toISOString().split("T")[0],
    },
    async (values) => {
      setSubmitting(true);
      setApiError("");

      const validationErrors = validateExpenseForm(values);
      if (validationErrors.length > 0) {
        setApiError("Please fix the errors below");
        setSubmitting(false);
        return;
      }

      try {
        await expenseService.createExpense(values as ExpenseCreate);
        onSuccess();
      } catch (error: any) {
        setApiError(error.response?.data?.error || "Failed to create expense");
      } finally {
        setSubmitting(false);
      }
    }
  );

  return (
    <form className="expense-form" onSubmit={handleSubmit((v) => {})}>
      <h2>Create Expense</h2>

      {apiError && <div className="error-message">{apiError}</div>}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={values.category}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={submitting}
          >
            <option value="">Select category</option>
            {Object.entries(EXPENSE_CATEGORIES).map(([key, value]) => (
              <option key={key} value={value}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </option>
            ))}
          </select>
          {touched.category && errors.category && <span className="error">{errors.category}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            type="number"
            name="amount"
            value={values.amount}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="0.00"
            step="0.01"
            min="0"
            disabled={submitting}
          />
          {touched.amount && errors.amount && <span className="error">{errors.amount}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="currency">Currency</label>
          <select
            id="currency"
            name="currency"
            value={values.currency}
            onChange={handleChange}
            disabled={submitting}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="INR">INR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={values.description}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Enter expense description (min 10 characters)"
          rows={4}
          disabled={submitting}
        />
        {touched.description && errors.description && (
          <span className="error">{errors.description}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="expense_date">Date</label>
        <input
          id="expense_date"
          type="date"
          name="expense_date"
          value={values.expense_date}
          onChange={handleChange}
          disabled={submitting}
        />
        {touched.expense_date && errors.expense_date && (
          <span className="error">{errors.expense_date}</span>
        )}
      </div>

      <button type="submit" className="submit-btn" disabled={submitting}>
        {submitting ? "Creating..." : "Create Expense"}
      </button>
    </form>
  );
};