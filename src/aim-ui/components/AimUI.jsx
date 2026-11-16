import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { Header } from "./shared";
import DashboardPage from "../pages/DashboardPage";
import AlertsPage from "../pages/AlertsPage";
import HistoryPopover from "./HistoryPopover";

export default function AimUI({
                                page,
                                sets,
                                selectedSet,
                                onSelectSet,
                                measurement,
                                channels,
                                cursorSeconds,
                                preview,
                                onReturnLive,
                                playbackStatus,
                                dataMessage,
                                alerts,
                                latestAlerts,
                                selectedAlertId,
                                onSelectAlert,
                                onNavigate,
                                onGoMonitoring,
                                onCurrentSet,
                                onAcknowledge,
                                onDismissAlert,
                                onRestoreAlerts,
                                acknowledgingId,
                                history,
                              }) {
  const { t } = useTranslation();

  const [historyOpen, setHistoryOpen] = useState(false);

  const close = useCallback(() => {
    setHistoryOpen(false);
  }, []);

  const navigate = (next) => {
    close();
    onNavigate(next);
  };

  const alertCount =
      history.historyCounts?.unread ?? t("common.loading");

  return (
      <>
        <Header
            page={page}
            alertCount={alertCount}
            onDashboard={() => navigate("dashboard")}
            onAlerts={() => navigate("alerts")}
            onHistory={() =>
                setHistoryOpen((open) => !open)
            }
            historyOpen={historyOpen}
        />

        {page === "dashboard" ? (
            <>
              <DashboardPage
                  {...{
                    sets,
                    selectedSet,
                    onSelectSet,
                    measurement,
                    channels,
                    cursorSeconds,
                    preview,
                    onReturnLive,
                    playbackStatus,
                    dataMessage,
                  }}
              />

              <HistoryPopover
                  open={historyOpen}
                  alerts={latestAlerts}
                  onClose={close}
                  onDismiss={onDismissAlert}
                  onRestore={onRestoreAlerts}
                  onSelectSet={onCurrentSet}
                  onViewAll={() => navigate("alerts")}
              />
            </>
        ) : (
            <AlertsPage
                {...{
                  sets,
                  alerts,
                  selectedAlertId,
                  onSelectAlert,
                  onAcknowledge,
                  onGoMonitoring,
                  acknowledgingId,
                  history,
                }}
            />
        )}
      </>
  );
}