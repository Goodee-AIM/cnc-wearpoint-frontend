import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../dashboardConfig.js";

export default function RestartMonitoringButton() {
  const { t } = useTranslation();
  const dialog = useRef(null);
  const controller = useRef(null);
  const alive = useRef(true);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; controller.current?.abort(); };
  }, []);
  const restart = async (event) => {
    event.preventDefault();
    if (busy || !token) return;
    setBusy(true); setError("");
    const request = new AbortController();
    controller.current = request;
    const timeout = setTimeout(() => request.abort(), 15000);
    try {
      const response = await fetch(new URL("/api/monitoring/restart", API_BASE), {
        method: "POST",
        headers: { "X-Monitoring-Control-Token": token },
        signal: request.signal,
      });
      if (!response.ok) {
        if (response.status === 403) throw new Error(t("monitoring.restartDenied"));
        throw new Error(t("monitoring.restartFailed", { status: response.status }));
      }
      if (alive.current) dialog.current.close();
    } catch (err) {
      if (alive.current) setError(err.name === "AbortError" ? t("monitoring.restartTimeout") : err.message);
    } finally {
      clearTimeout(timeout);
      if (controller.current === request) controller.current = null;
      if (alive.current) setBusy(false);
    }
  };
  return <>
    <button type="button" onClick={() => dialog.current.showModal()}>{t("monitoring.restartAll")}</button>
    <dialog ref={dialog} className="monitoring-restart-dialog"
      onClose={() => { setToken(""); setError(""); }}
      onCancel={event => { if (busy) event.preventDefault(); }} aria-labelledby="monitoring-restart-title">
      <form onSubmit={restart}>
        <h2 id="monitoring-restart-title">{t("monitoring.restartAll")}</h2>
        <p>{t("monitoring.restartDescription")}</p>
        <label>{t("monitoring.controlKey")}
          <input type="password" autoFocus autoComplete="off" value={token}
            onChange={event => setToken(event.target.value)} disabled={busy} required />
        </label>
        {error && <p role="alert">{error}</p>}
        <div className="monitoring-restart-actions">
          <button type="button" disabled={busy} onClick={() => dialog.current.close()}>{t("manual.cancel")}</button>
          <button type="submit" disabled={busy || !token}>{t(busy ? "monitoring.restarting" : "monitoring.restartAll")}</button>
        </div>
      </form>
    </dialog>
  </>;
}
