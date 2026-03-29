import { useState } from "react";
import { createExpense } from "../utils/api";

export default function ExpenseForm() {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!amount || !category) {
      alert("Fill all fields");
      return;
    }

    try {
      await createExpense({
        amount: Number(amount),
        category: category as "food" | "travel" | "accommodation" | "miscellaneous",
        description,
        currency: "USD",
        expense_date: new Date().toISOString(),
      });

      alert("Expense Submitted");
      setAmount("");
      setCategory("food");
      setDescription("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit expense";
      alert(message);
    }
  };

  return (
    <div className="container">
      <h2>Add Expense</h2>

      <input
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="food">Food</option>
        <option value="travel">Travel</option>
        <option value="accommodation">Accommodation</option>
        <option value="miscellaneous">Miscellaneous</option>
      </select>

      <input
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}