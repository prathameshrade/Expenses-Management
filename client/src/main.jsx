import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unknown runtime error" };
  }

  componentDidCatch(error) {
    // Keep console trace for debugging while showing a friendly fallback UI.
    // eslint-disable-next-line no-console
    console.error("Runtime render error:", error);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div style={{ minHeight: "100vh", margin: 0, display: "grid", placeItems: "center", background: "#111", color: "#f8d7da", fontFamily: "system-ui" }}>
        <div style={{ maxWidth: 760, width: "92vw", background: "#1f1f1f", border: "1px solid #842029", borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Frontend Runtime Error</h2>
          <p style={{ marginBottom: 8 }}>The app hit an error while rendering. Please share this message:</p>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{this.state.message}</pre>
        </div>
      </div>
    );
  }
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found in index.html");
}

createRoot(rootEl).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
