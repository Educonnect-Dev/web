import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "./index.css";
import "./i18n";
import App from "./App.tsx";

if (typeof window !== "undefined") {
  const { pathname, search, hash } = window.location;
  if (!hash && pathname !== "/") {
    window.location.replace(`/#${pathname}${search}`);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
