import React, { useEffect, useState } from 'react';
import expenseService from '../services/expenseService';
import { Expense } from '../types/expense';
import Navbar from '../components/Common/Navbar';
import toast from 'react-hot-toast';

const ExpenseList: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const data = await expenseService.listExpenses();
      setExpenses(data);
    } catch (error) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading expenses...</div>;

  return (
    <div>
      <Navbar />
      <div className="page-container">
        <h1>My Expenses</h1>

        {expenses.length === 0 ? (
          <p className="empty-state">No expenses found. Create one to get started!</p>
        ) : (
          <table className="expenses-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{new Date(expense.expense_date).toLocaleDateString()}</td>
                  <td>{expense.category}</td>
                  <td>{expense.description}</td>
                  <td>{expense.amount} {expense.currency}</td>
                  <td>
                    <span className={`status status-${expense.status}`}>
                      {expense.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ExpenseList;