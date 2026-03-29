import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from '../hooks/useForm';
import expenseService from '../services/expenseService';
import Navbar from '../components/Common/Navbar';
import toast from 'react-hot-toast';

interface ExpenseFormValues {
  category: string;
  description: string;
  amount: number | '';
  currency: string;
  expense_date: string;
}

const ExpenseForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);

  const validate = (values: ExpenseFormValues) => {
    const errors: Partial<Record<keyof ExpenseFormValues, string>> = {};

    if (!values.category) errors.category = 'Category is required';
    if (!values.description) errors.description = 'Description is required';
    if (!values.amount || Number(values.amount) <= 0) errors.amount = 'Amount must be greater than 0';
    if (!values.currency) errors.currency = 'Currency is required';
    if (!values.expense_date) errors.expense_date = 'Date is required';

    return errors;
  };

  const { values, errors, handleChange, handleSubmit, setFieldValue } = useForm<ExpenseFormValues>(
    { category: '', description: '', amount: '', currency: 'USD', expense_date: '' },
    validate
  );

  const onSubmit = async (data: ExpenseFormValues) => {
    setLoading(true);
    try {
      await expenseService.createExpense({
        category: data.category as any,
        description: data.description,
        amount: Number(data.amount),
        currency: data.currency,
        expense_date: data.expense_date,
        receipt_file: receiptFile || undefined,
      });

      toast.success('Expense created successfully!');
      navigate('/expenses');
    } catch (error) {
      toast.error('Failed to create expense');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="page-container">
        <h1>New Expense</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="expense-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={values.category}
                onChange={handleChange}
              >
                <option value="">Select Category</option>
                <option value="food">Food</option>
                <option value="travel">Travel</option>
                <option value="accommodation">Accommodation</option>
                <option value="miscellaneous">Miscellaneous</option>
              </select>
              {errors.category && <span className="error">{errors.category}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="amount">Amount *</label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={values.amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
              />
              {errors.amount && <span className="error">{errors.amount}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="currency">Currency *</label>
              <select
                id="currency"
                name="currency"
                value={values.currency}
                onChange={handleChange}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
              </select>
              {errors.currency && <span className="error">{errors.currency}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={values.description}
              onChange={handleChange}
              placeholder="Enter expense description"
              rows={4}
            />
            {errors.description && <span className="error">{errors.description}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="expense_date">Expense Date *</label>
            <input
              type="date"
              id="expense_date"
              name="expense_date"
              value={values.expense_date}
              onChange={handleChange}
            />
            {errors.expense_date && <span className="error">{errors.expense_date}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="receipt">Receipt (Optional)</label>
            <input
              type="file"
              id="receipt"
              accept="image/*"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-large">
            {loading ? 'Creating...' : 'Create Expense'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;