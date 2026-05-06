import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App.tsx";
import "./index.css";

// Catch all runtime errors and display an alert
window.onerror = function(message, source, lineno, colno, error) {
  alert("ERROR CRÍTICO: " + message + "\nEn: " + source + ":" + lineno + "\nPor favor comparte esto con la IA.");
  return false;
};

// Error Boundary para cazar crashes de React específicos
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    alert("REACT CRASH: " + error.message + "\n\n" + errorInfo.componentStack);
  }
  render() {
    if (this.state.hasError) return <div style={{padding: 20, color: 'red'}}><h1>Algo se rompió</h1><pre>{this.state.error?.message}</pre></div>;
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <GlobalErrorBoundary>
    <App />
  </GlobalErrorBoundary>
);
