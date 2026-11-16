import { getSetName } from "../../utils/setDisplay.js";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Footer,
  ImageCard,
  ImageModal,
  PredictionCard,
  WearTypeCard,
} from "../components/shared";

export default function AlertsPage({
                                     alerts = [],
                                     sets = [],
                                     selectedAlertId,
                                     onSelectAlert,
                                     onAcknowledge,
                                     onGoMonitoring,
                                     acknowledgingId = null,
                                     error = null,
                                     demo = false,
                                     history,
                                   }) {
  const { t, i18n } = useTranslation();

  const locale =
      i18n.resolvedLanguage?.startsWith("en")
          ? "en-US"
          : "ko-KR";

  const filters = {
    set: history.alertSetFilter,
    level: history.alertLevelFilter,
    state: history.alertReadFilter,
  };

  const selected =
      alerts.find(
          (alert) => alert.id === selectedAlertId,
      ) || alerts[0];

  const rows = alerts;
  const pageSize = history.historyPageSize;
  const total = history.historyFilteredTotal;
  const current = history.historyPageNumber;

  const max = Math.max(
      1,
      Math.ceil((total ?? 0) / pageSize),
  );

  const loading = history.historyLoading;

  const [imageExpanded, setImageExpanded] =
      useState(false);

  const pendingPageScroll = useRef(null);
  const pendingFilterScroll = useRef(null);

  const [
    reservedPageHeight,
    setReservedPageHeight,
  ] = useState(null);

  const changePageKeepingScroll = (
      pageIndex,
  ) => {
    pendingPageScroll.current = {
      page: pageIndex + 1,
      x: window.scrollX,
      y: window.scrollY,
    };

    history.changeHistoryPage(pageIndex);
  };

  useLayoutEffect(() => {
    const pending =
        pendingPageScroll.current;

    if (
        !pending ||
        loading ||
        current !== pending.page
    ) {
      return;
    }

    window.scrollTo({
      left: pending.x,
      top: pending.y,
      behavior: "instant",
    });

    pendingPageScroll.current = null;
  }, [current, loading]);

  const selectAlertAndScrollToTop = (
      id,
  ) => {
    pendingPageScroll.current = null;
    pendingFilterScroll.current = null;

    setReservedPageHeight(null);

    onSelectAlert(id);

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  };

  const change = (key, value) => {
    if (filters[key] === value) {
      return;
    }

    pendingPageScroll.current = null;

    pendingFilterScroll.current = {
      x: window.scrollX,
      y: window.scrollY,
    };

    setReservedPageHeight(
        document.documentElement.scrollHeight,
    );

    ({
      set: history.setAlertSetFilter,
      level: history.setAlertLevelFilter,
      state: history.setAlertReadFilter,
    })[key](value);
  };

  useLayoutEffect(() => {
    const pending =
        pendingFilterScroll.current;

    if (!pending) {
      return;
    }

    window.scrollTo({
      left: pending.x,
      top: pending.y,
      behavior: "instant",
    });

    if (loading) {
      return;
    }

    pendingFilterScroll.current = null;
  }, [
    filters.set,
    filters.level,
    filters.state,
    loading,
    rows.length,
  ]);

  const formatWear = (value) =>
      value == null
          ? "—"
          : value.toFixed(2);

  const time = (value) =>
      !value
          ? "—"
          : new Intl.DateTimeFormat(locale, {
            timeZone: "Asia/Seoul",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }).format(new Date(value));

  const date = (value) =>
      !value
          ? "—"
          : new Intl.DateTimeFormat(locale, {
            timeZone: "Asia/Seoul",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(value));

  const wearBasis = (basis) =>
      basis === "prediction"
          ? t("alerts.predictedWearBasis")
          : t("alerts.labelWearBasis");

  /*
   * historyMessage는 hook에서 만들어지는 문자열이므로
   * 현재 화면에서 확인된 failed to fetch 메시지만
   * 우선 언어별 문구로 치환합니다.
   */
  const historyMessage = (() => {
    if (!history.historyMessage) {
      return null;
    }

    const message =
        String(history.historyMessage);

    if (
        /failed to fetch/i.test(message)
    ) {
      return t(
          "alerts.fetchFailedRetrying",
      );
    }

    return message;
  })();

  const tableHeaders = [
    {
      key: "time",
      label: t("alerts.tableTime"),
    },
    {
      key: "set",
      label: t("alerts.tableSet"),
    },
    {
      key: "level",
      label: t("alerts.tableLevel"),
    },
    {
      key: "wear",
      label: t("alerts.tableWear"),
    },
    {
      key: "state",
      label: t("alerts.tableState"),
    },
    {
      key: "detail",
      label: t("alerts.tableDetail"),
    },
  ];

  return (
      <main
          className="alerts-main"
          style={
            reservedPageHeight == null
                ? undefined
                : {
                  minHeight:
                      `${reservedPageHeight}px`,
                }
          }
      >
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              {t("alerts.eyebrow")}
            </div>

            <h1>
              {t("alerts.title")}{" "}

              {demo && (
                  <span className="small-badge">
                {t("alerts.demoData")}
              </span>
              )}
            </h1>
          </div>

          <div className="alert-count">
            {history.historyCounts ? (
                <>
                  {t("alerts.sessionTotal")}{" "}
                  <b>
                    {history.historyCounts.total.toLocaleString(
                        locale,
                    )}
                  </b>{" "}
                  {t("alerts.totalUnit")}

                  <span />

                  {t("alerts.unreadLabel")}{" "}
                  <b>
                    {history.historyCounts.unread.toLocaleString(
                        locale,
                    )}
                  </b>{" "}
                  {t("alerts.unreadUnit")}
                </>
            ) : (
                t("alerts.countLoading")
            )}
          </div>
        </div>

        {historyMessage && (
            <p
                className="request-message"
                role="status"
            >
              {historyMessage}
            </p>
        )}

        {selected && (
            <h2
                className={
                    "selected-alert-heading " +
                    selected.level
                }
            >
              [{getSetName(selected.setNumber)}]{" "}
              {selected.level === "danger"
                  ? t("alerts.dangerHeading")
                  : t("alerts.warningHeading")}
            </h2>
        )}

        {selected ? (
            <section className="alert-detail">
              <ImageCard
                  image={selected.image}
                  setNumber={
                    selected.setNumber
                  }
                  onExpand={() =>
                      setImageExpanded(true)
                  }
                  alert
              />

              <div className="alert-insight">
                <div className="insight-metrics">
                  <PredictionCard
                      value={
                        selected.predictedWear
                      }
                  />

                  <WearTypeCard
                      label={
                        selected.wearTypeLabel
                      }
                      type={selected.wearType}
                  />
                </div>

                <article
                    className={
                        "risk-card " +
                        selected.level
                    }
                >
                  <div className="risk-top">
                <span>
                  {getSetName(selected.setNumber)}
                </span>

                    <span className="severity-tag">
                  {t(
                      `status.${selected.level}`,
                  )}
                </span>

                    <span className="detail-status">
                  {selected.acknowledgedAt
                      ? t(
                          "alerts.acknowledged",
                      )
                      : t("alerts.unread")}

                      {selected.cycleNumber
                          ? ` · ${t(
                              "alerts.cycle",
                              {
                                count:
                                selected.cycleNumber,
                              },
                          )}`
                          : ""}
                </span>
                  </div>

                  <h2>
                    {selected.level ===
                    "danger"
                        ? t(
                            "alerts.replacementRequired",
                        )
                        : t(
                            "alerts.checkWear",
                        )}
                  </h2>

                  <p>
                    {wearBasis(
                        selected.basis,
                    )}{" "}

                    <b>
                      {formatWear(
                          selected.judgedWear,
                      )}{" "}
                      μm
                    </b>
                  </p>

                  <div className="risk-bottom">
                <span>
                  {t(
                      "alerts.occurredAt",
                  )}
                </span>

                    <time>
                      {date(
                          selected.occurredAt,
                      )}{" "}
                      {time(
                          selected.occurredAt,
                      )}
                    </time>
                  </div>
                </article>

                <article className="card action-card">
                  <div>
                    <h2>
                      {t(
                          "alerts.actionTitle",
                      )}
                    </h2>

                    <p>
                      {error
                          ? String(error)
                          : selected.acknowledgedAt
                              ? t(
                                  "alerts.acknowledgedAt",
                                  {
                                    date: date(
                                        selected.acknowledgedAt,
                                    ),
                                    time: time(
                                        selected.acknowledgedAt,
                                    ),
                                  },
                              )
                              : !selected.canAcknowledge
                                  ? t(
                                      "alerts.cannotAcknowledge",
                                  )
                                  : demo
                                      ? t(
                                          "alerts.demoAcknowledge",
                                      )
                                      : t(
                                          "alerts.saveAcknowledge",
                                      )}
                    </p>
                  </div>

                  <div className="detail-actions">
                    <button
                        disabled={
                            !selected.canAcknowledge ||
                            !!selected.acknowledgedAt ||
                            acknowledgingId !==
                            null ||
                            !onAcknowledge
                        }
                        onClick={() =>
                            onAcknowledge(
                                selected,
                            )
                        }
                    >
                      {selected.acknowledgedAt
                          ? t(
                              "alerts.acknowledged",
                          )
                          : acknowledgingId ===
                          selected.id
                              ? t(
                                  "alerts.saving",
                              )
                              : t(
                                  "alerts.acknowledge",
                              )}
                    </button>

                    <button
                        className="primary"
                        onClick={() =>
                            onGoMonitoring(
                                selected,
                            )
                        }
                    >
                      {t(
                          "alerts.goMonitoring",
                      )}
                    </button>
                  </div>
                </article>
              </div>
            </section>
        ) : (
            <div
                className="card no-data"
                role="status"
            >
              {loading
                  ? t("alerts.loadingList")
                  : t("alerts.noAlerts")}
            </div>
        )}

        <section className="card alerts-list">
          <div className="list-heading">
            <h2>
              {t("alerts.allSetAlerts")}{" "}

              <span>
              {total?.toLocaleString(
                      locale,
                  ) ??
                  t("common.loading")}
            </span>
            </h2>

            <button
                onClick={() => {
                  change("set", "all");
                  change("level", "all");
                  change("state", "all");

                  history.changeHistoryPage(
                      0,
                  );

                  history.reloadHistory();
                }}
            >
              {t("alerts.latestAlerts")}
            </button>
          </div>

          <div className="filters">
            <label>
              {t("alerts.filterSet")}{" "}

              <select
                  value={filters.set}
                  onChange={(e) =>
                      change(
                          "set",
                          e.target.value,
                      )
                  }
              >
                <option value="all">
                  {t("alerts.allSets")}
                </option>

                {sets.map((set) => (
                    <option
                        value={set.number}
                        key={set.number}
                    >
                      {getSetName(set.number)}
                    </option>
                ))}
              </select>
            </label>

            <label>
              {t("alerts.filterLevel")}{" "}

              <select
                  value={filters.level}
                  onChange={(e) =>
                      change(
                          "level",
                          e.target.value,
                      )
                  }
              >
                <option value="all">
                  {t(
                      "alerts.allLevels",
                  )}
                </option>

                <option value="danger">
                  {t("status.danger")}
                </option>

                <option value="warning">
                  {t("status.warning")}
                </option>
              </select>
            </label>

            <label>
              {t("alerts.filterState")}{" "}

              <select
                  value={filters.state}
                  onChange={(e) =>
                      change(
                          "state",
                          e.target.value,
                      )
                  }
              >
                <option value="all">
                  {t(
                      "alerts.allStates",
                  )}
                </option>

                <option value="unread">
                  {t("alerts.unread")}
                </option>

                <option value="read">
                  {t(
                      "alerts.acknowledged",
                  )}
                </option>
              </select>
            </label>

            <span className="filter-result">
            {total == null
                ? t(
                    "alerts.filterResultLoading",
                )
                : t(
                    "alerts.filterResult",
                    {
                      count:
                          total.toLocaleString(
                              locale,
                          ),
                    },
                )}
          </span>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
              <tr>
                {tableHeaders.map(
                    (header) => (
                        <th key={header.key}>
                          {header.label}
                        </th>
                    ),
                )}
              </tr>
              </thead>

              <tbody>
              {rows.map((row) => (
                  <tr
                      key={row.id}
                      className={
                        row.id ===
                        selected?.id
                            ? "selected"
                            : ""
                      }
                  >
                    <td className="row-time">
                      {date(
                          row.occurredAt,
                      )}{" "}

                      <b>
                        {time(
                            row.occurredAt,
                        )}
                      </b>
                    </td>

                    <td className="table-set">
                      {getSetName(row.setNumber)}
                    </td>

                    <td>
                    <span
                        className={
                            "level-badge " +
                            row.level
                        }
                    >

                      {t(
                          `status.${row.level}`,
                      )}
                    </span>
                    </td>

                    <td className="value-cell">
                      <b>
                        {formatWear(
                            row.judgedWear,
                        )}
                      </b>

                      <small>μm</small>

                      <span>
                      {wearBasis(
                          row.basis,
                      )}
                    </span>
                    </td>

                    <td>
                    <span
                        className={
                            "read-state" +
                            (row.acknowledgedAt
                                ? " read"
                                : "")
                        }
                    >
                      {row.acknowledgedAt
                          ? t(
                              "alerts.acknowledged",
                          )
                          : t(
                              "alerts.unread",
                          )}
                    </span>
                    </td>

                    <td>
                      <button
                          className="row-select"
                          aria-label={t(
                              "alerts.selectAria",
                              {
                                setNumber: getSetName(row.setNumber),
                                time: time(
                                    row.occurredAt,
                                ),
                              },
                          )}
                          onClick={() =>
                              selectAlertAndScrollToTop(
                                  row.id,
                              )
                          }
                      >
                        {row.id ===
                        selected?.id
                            ? t(
                                "alerts.selected",
                            )
                            : t(
                                "alerts.select",
                            )}
                      </button>
                    </td>
                  </tr>
              ))}
              </tbody>
            </table>

            {!rows.length && (
                <div className="empty-results">
                  {loading
                      ? t(
                          "alerts.loadingListShort",
                      )
                      : t(
                          "alerts.noAlerts",
                      )}
                </div>
            )}
          </div>

          <div className="pagination">
          <span>
            {loading
                ? t("common.loading")
                : total
                    ? t("alerts.range", {
                      start:
                          (current - 1) *
                          pageSize +
                          1,

                      end:
                          (current - 1) *
                          pageSize +
                          rows.length,

                      total:
                          total.toLocaleString(
                              locale,
                          ),
                    })
                    : t("alerts.zero")}
          </span>

            <div>
              <button
                  disabled={
                      loading ||
                      current === 1
                  }
                  onClick={() =>
                      changePageKeepingScroll(
                          current - 2,
                      )
                  }
              >
                {t("alerts.previous")}
              </button>

              <span>
              {t("alerts.page", {
                current,
                max,
              })}
            </span>

              <button
                  disabled={
                      loading ||
                      total == null ||
                      current >= max
                  }
                  onClick={() =>
                      changePageKeepingScroll(
                          current,
                      )
                  }
              >
                {t("alerts.next")}
              </button>
            </div>
          </div>
        </section>

        <Footer page="alerts" />

        {imageExpanded &&
            selected?.image?.url && (
                <ImageModal
                    key={`${selected.id}-${selected.image.url}`}
                    image={selected.image}
                    setNumber={
                      selected.setNumber
                    }
                    onClose={() =>
                        setImageExpanded(false)
                    }
                />
            )}
      </main>
  );
}