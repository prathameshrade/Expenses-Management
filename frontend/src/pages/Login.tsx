import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, signup } from "../utils/api";

export default function Login() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (mode: "login" | "signup") => {
    if (!email || !password) {
      alert("Enter email and password");
      return;
    }

    if (mode === "signup" && !name) {
      alert("Enter name for signup");
      return;
    }

    try {
      setLoading(true);

      const result =
        mode === "signup"
          ? await signup({
              email,
              name,
              password,
              country: "US",
              role: role as "admin" | "manager" | "employee",
            })
          : await login({ email, password });

      localStorage.setItem("token", result.access_token);
      localStorage.setItem("user", JSON.stringify(result.user));
      navigate("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Login</h2>

      <input
        placeholder="Enter Name (for signup)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        type="email"
        placeholder="Enter Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Enter Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="employee">Employee</option>
        <option value="manager">Manager</option>
        <option value="admin">Admin</option>
      </select>

      <button onClick={() => handleAuth("login")} disabled={loading}>
        {loading ? "Please wait..." : "Login"}
      </button>
      <button onClick={() => handleAuth("signup")} disabled={loading}>
        {loading ? "Please wait..." : "Sign Up"}
      </button>
    </div>
  );
}