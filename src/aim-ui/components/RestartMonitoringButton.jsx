import { useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../dashboardConfig.js";
import ManualControlIcon from "./ManualControlIcon.jsx";

export default function RestartMonitoringButton() {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState(false);

  const startAnalysis = async () => {
    if (busy) return;

    setBusy(true);

    try {
      const response = await fetch(
        new URL("/api/monitoring/restart", API_BASE),
        {
          method: "POST",
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      const message = i18n.resolvedLanguage?.startsWith("en")
        ? "Unable to confirm the start of analysis. Check the playback status."
        : "분석 시작을 확인하지 못했습니다. 현재 재생 상태를 확인해주세요.";

      window.alert(`${message}\n${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      className="monitoring-restart-trigger"
      type="button"
      disabled={busy}
      onClick={startAnalysis}
    >
      <ManualControlIcon name="replay" />
      {t(busy ? "monitoring.restarting" : "monitoring.restartAll")}
    </button>
  );
}