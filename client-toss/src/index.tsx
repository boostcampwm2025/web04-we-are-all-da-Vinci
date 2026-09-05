import { initObservability } from "@/shared/lib";
import { ErrorBoundary, RootErrorFallback } from "@/shared/ui/errorBoundary";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// 렌더 시작 전에 초기화해야 첫 렌더 크래시까지 잡힌다.
initObservability();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary fallback={(retry) => <RootErrorFallback onRetry={retry} />}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
