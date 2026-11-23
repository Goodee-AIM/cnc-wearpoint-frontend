// The landing page is mounted independently so it never starts dashboard polling.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n";
import App from "./App.jsx";
import LandingPage from "./aim-ui/pages/LandingPage.jsx";
import { shouldRenderDashboard } from "./utils/entryRoute.js";

const showDashboard = shouldRenderDashboard(window.location.pathname, window.location.hash);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {showDashboard ? <App /> : <LandingPage />}
  </StrictMode>,
);
