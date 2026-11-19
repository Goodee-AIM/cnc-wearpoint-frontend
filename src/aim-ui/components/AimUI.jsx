import AlertToastStack from "./AlertToastStack.jsx";
import { useTranslation } from "react-i18next";
import ManualInputPage from "../pages/ManualInputPage.jsx";
import { useState } from "react";
import { Header } from "./shared";
import DashboardPage from "../pages/DashboardPage";
import AlertsPage from "../pages/AlertsPage";
import HistoryPopover from "./HistoryPopover";

export default function AimUI({
  page, sets, selectedSet, onSelectSet, measurement, channels, cursorSeconds,
  preview, onReturnLive, playbackStatus, dataMessage, alerts, latestAlerts,
  selectedAlertId, onSelectAlert, onNavigate, onGoMonitoring, onCurrentSet,
  onAcknowledge, onDismissAlert, onRestoreAlerts, acknowledgingId, history, toastSource,
}) {
  const { t } = useTranslation();
  const [manualActive, setManualActive] = useState(() => sessionStorage.getItem("aim-manual-active") === "1");
  const openManual = () => { close(); setManualActive(true); sessionStorage.setItem("aim-manual-active", "1"); };
  const selectLiveSet = (number) => { setManualActive(false); sessionStorage.removeItem("aim-manual-active"); onSelectSet(number); };
  const [historyOpen, setHistoryOpen] = useState(false);
  const close = () => setHistoryOpen(false);
  const navigate = (next) => { close(); setManualActive(false); sessionStorage.removeItem("aim-manual-active"); onNavigate(next); };
  const goHome = () => {
    close();
    setManualActive(false);
    sessionStorage.removeItem("aim-manual-active");
    onReturnLive(4); // Original Set 4 is displayed as Set 1. No server reset.
  };
  return (
    <>
      <AlertToastStack source={toastSource} onOpenSet={(setNumber) => {
        close();
        setManualActive(false);
        sessionStorage.removeItem("aim-manual-active");
        onCurrentSet({ setNumber });
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      }} />
      <Header onHome={goHome} page={page} alertCount={history.historyCounts?.unread ?? t("common.loading")}
        onDashboard={() => navigate("dashboard")} onAlerts={() => navigate("alerts")}
        onHistory={() => setHistoryOpen((open) => !open)} historyOpen={historyOpen} />
        <div hidden={page !== "dashboard" || !manualActive}>
          <ManualInputPage sets={sets} onSelectSet={selectLiveSet} />
        </div>
      {page === "dashboard" ? (
        <>
          {!manualActive && (
            <DashboardPage
              onOpenManual={openManual}
              {...{
                sets, selectedSet, onSelectSet, measurement,
                channels, cursorSeconds, preview, onReturnLive,
                playbackStatus, dataMessage,
              }}
            />
          )}
          <HistoryPopover open={historyOpen} alerts={latestAlerts} onClose={close}
            onDismiss={onDismissAlert} onRestore={onRestoreAlerts} onSelectSet={(alert) => { setManualActive(false); sessionStorage.removeItem("aim-manual-active"); onCurrentSet(alert); }}
            onViewAll={() => navigate("alerts")} />
        </>
      ) : (
        <AlertsPage {...{sets, alerts, selectedAlertId, onSelectAlert, onAcknowledge,
          onGoMonitoring, acknowledgingId, history}} />
      )}
    </>
  );
}
