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

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.update().catch(() => undefined);

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              worker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        let hasReloaded = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (hasReloaded) return;
          hasReloaded = true;
          window.location.reload();
        });
      })
      .catch(() => undefined);
  });
}
