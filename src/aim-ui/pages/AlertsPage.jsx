import { useLayoutEffect, useRef, useState } from "react";
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
  // 이 화면의 목록은 이미 서버에서 필터와 페이지 처리를 마친 결과입니다.
  const filters = { set: history.alertSetFilter, level: history.alertLevelFilter, state: history.alertReadFilter };
  const selected = alerts.find((alert) => alert.id === selectedAlertId) || alerts[0];
  const rows = alerts;
  const pageSize = history.historyPageSize;
  const total = history.historyFilteredTotal;
  const current = history.historyPageNumber;
  const max = Math.max(1, Math.ceil((total ?? 0) / pageSize));
  const loading = history.historyLoading;
  const [imageExpanded, setImageExpanded] = useState(false);

  // 이전/다음 페이지에서는 목록 스크롤 위치를 유지합니다.
  const pendingPageScroll = useRef(null);
  const pendingFilterScroll = useRef(null);
  const [reservedPageHeight, setReservedPageHeight] = useState(null);
  const changePageKeepingScroll = (pageIndex) => {
    pendingPageScroll.current = {
      page: pageIndex + 1,
      x: window.scrollX,
      y: window.scrollY,
    };
    history.changeHistoryPage(pageIndex);
  };

  useLayoutEffect(() => {
    const pending = pendingPageScroll.current;
    if (!pending || loading || current !== pending.page) return;
    window.scrollTo({ left: pending.x, top: pending.y, behavior: "instant" });
    pendingPageScroll.current = null;
  }, [current, loading]);

  // 목록의 '선택'은 해당 알림의 상세 화면으로 이동합니다.
  const selectAlertAndScrollToTop = (id) => {
    pendingPageScroll.current = null;
    pendingFilterScroll.current = null;
    setReservedPageHeight(null);
    onSelectAlert(id);
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };
  // 필터 변경은 선택 버튼과 달리 화면 위치를 그대로 유지합니다.
  // 조회 중 상세 카드가 사라지더라도 문서 높이가 줄어 스크롤이 튀지 않도록 합니다.
  const change = (key, value) => {
    if (filters[key] === value) return;
    pendingPageScroll.current = null;
    pendingFilterScroll.current = { x: window.scrollX, y: window.scrollY };
    setReservedPageHeight(document.documentElement.scrollHeight);
    ({ set: history.setAlertSetFilter, level: history.setAlertLevelFilter, state: history.setAlertReadFilter })[key](value);
  };

  useLayoutEffect(() => {
    const pending = pendingFilterScroll.current;
    if (!pending) return;
    window.scrollTo({ left: pending.x, top: pending.y, behavior: "instant" });
    if (loading) return;
    pendingFilterScroll.current = null;
    // 필터 결과가 짧아져도 화면이 위로 밀리지 않도록 높이를 유지합니다.
    // 알림을 선택하거나 다른 화면으로 나갈 때 예약 높이가 해제됩니다.
  }, [filters.set, filters.level, filters.state, loading, rows.length]);
  const formatWear = (value) => value == null ? "—" : value.toFixed(2);
  const time = (v) => !v ? "—" :
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(v));
  const date = (v) => !v ? "—" :
    new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" })
      .format(new Date(v))
      .replaceAll("-", ".");
  return (
    <main className="alerts-main" style={reservedPageHeight == null ? undefined : { minHeight: `${reservedPageHeight}px` }}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">TOOL CONDITION ALERTS</div>
          <h1>
            경고·위험 알림{" "}
            {demo && <span className="small-badge">예시 데이터</span>}
          </h1>
        </div>
        <div className="alert-count">
          {history.historyCounts ? <>현재 세션 전체 <b>{history.historyCounts.total.toLocaleString()}</b>건 <span /> 미확인 <b>{history.historyCounts.unread.toLocaleString()}</b>건</> : "알림 건수 조회 중"}
        </div>
      </div>
      {history.historyMessage && <p className="request-message" role="status">{history.historyMessage}</p>}
      {selected && (
        <h2 className={"selected-alert-heading " + selected.level}>
          [Set{selected.setNumber}] {selected.level === "danger" ? "위험 · 공구 교체 필요" : "경고 · 마모 상태 확인"}
        </h2>
      )}
      {selected ? (
        <section className="alert-detail">
          <ImageCard
            image={selected.image}
            caption="공구 이미지"
            setNumber={selected.setNumber}
            onExpand={() => setImageExpanded(true)}
            alert
          />
          <div className="alert-insight">
            <div className="insight-metrics">
              <PredictionCard value={selected.predictedWear} />
              <WearTypeCard
                label={selected.wearTypeLabel}
                type={selected.wearType}
              />
            </div>
            <article className={"risk-card " + selected.level}>
              <div className="risk-top">
                <span>Set {selected.setNumber}</span>
                <span className="severity-tag">
                  {selected.level === "danger" ? "위험" : "경고"}
                </span>
                <span className="detail-status">
                  {selected.acknowledgedAt ? "확인 완료" : "미확인"}{selected.cycleNumber ? ` · ${selected.cycleNumber}회차` : ""}
                </span>
              </div>
              <h2>
                {selected.level === "danger"
                  ? "공구 교체 필요"
                  : "마모 상태 확인"}
              </h2>
              <p>
                {selected.basis === "prediction" ? "예측" : "라벨"} 마모량{" "}
                <b>{formatWear(selected.judgedWear)} μm</b>
              </p>
              <div className="risk-bottom">
                <span>알림 발생 시각</span>
                <time>
                  {date(selected.occurredAt)} {time(selected.occurredAt)}
                </time>
              </div>
            </article>
            <article className="card action-card">
              <div>
                <h2>알림 확인 및 상세 조회</h2>
                <p>
                  {error
                    ? String(error)
                    : selected.acknowledgedAt
                      ? `확인 시각: ${date(selected.acknowledgedAt)} ${time(selected.acknowledgedAt)}`
                      : !selected.canAcknowledge
                        ? "예측 결과가 없어 확인 시각을 저장할 수 없습니다."
                        : demo
                          ? "확인하면 이 미리보기에서 확인 완료로 표시됩니다."
                          : "확인 시각을 저장합니다."}
                </p>
              </div>
              <div className="detail-actions">
                <button
                  disabled={
                    !selected.canAcknowledge ||
                    !!selected.acknowledgedAt ||
                    acknowledgingId !== null ||
                    !onAcknowledge
                  }
                  onClick={() => onAcknowledge(selected)}
                >
                  {selected.acknowledgedAt
                    ? "확인 완료"
                    : acknowledgingId === selected.id
                      ? "저장 중…"
                      : "확인"}
                </button>
                <button
                  className="primary"
                  onClick={() => onGoMonitoring(selected)}
                >
                  모니터링으로 이동 ↗
                </button>
              </div>
            </article>
          </div>
        </section>
      ) : (
        <div className="card no-data" role="status">{loading ? "알림 목록을 불러오는 중입니다." : "조건에 맞는 알림이 없습니다."}</div>
      )}
      <section className="card alerts-list">
        <div className="list-heading">
          <h2>
            전체 Set 알림 <span>{total?.toLocaleString() ?? "조회 중"}</span>
          </h2>
          <button
            onClick={() => {
              change("set", "all");
              change("level", "all");
              change("state", "all");
              history.changeHistoryPage(0);
              history.reloadHistory();
            }}
          >
            최신 알림 ↗
          </button>
        </div>
        <div className="filters">
          <label>
            Set{" "}
            <select
              value={filters.set}
              onChange={(e) => change("set", e.target.value)}
            >
              <option value="all">전체 Set</option>
              {sets.map((s) => (
                <option value={s.number} key={s.number}>
                  Set {s.number}
                </option>
              ))}
            </select>
          </label>
          <label>
            단계{" "}
            <select
              value={filters.level}
              onChange={(e) => change("level", e.target.value)}
            >
              <option value="all">전체 단계</option>
              <option value="danger">위험</option>
              <option value="warning">경고</option>
            </select>
          </label>
          <label>
            확인 상태{" "}
            <select
              value={filters.state}
              onChange={(e) => change("state", e.target.value)}
            >
              <option value="all">전체</option>
              <option value="unread">미확인</option>
              <option value="read">확인 완료</option>
            </select>
          </label>
          <span className="filter-result">
            조건에 맞는 알림 {total?.toLocaleString() ?? "조회 중"}{total == null ? "" : "건"}
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "알림 시각",
                  "Set",
                  "단계",
                  "판정 마모량",
                  "확인 상태",
                  "상세",
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={r.id === selected?.id ? "selected" : ""}
                  >
                    <td className="row-time">
                      {date(r.occurredAt)} <b>{time(r.occurredAt)}</b>
                    </td>
                    <td className="table-set">Set {r.setNumber}</td>
                    <td>
                      <span className={"level-badge " + r.level}>
                        <i />
                        {r.level === "danger" ? "위험" : "경고"}
                      </span>
                    </td>
                    <td className="value-cell">
                      <b>{formatWear(r.judgedWear)}</b>
                      <small>μm</small>
                      <span>
                        {r.basis === "prediction" ? "예측" : "라벨"} 마모량
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          "read-state" + (r.acknowledgedAt ? " read" : "")
                        }
                      >
                        {r.acknowledgedAt ? "확인 완료" : "미확인"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="row-select"
                        aria-label={`Set ${r.setNumber} ${time(r.occurredAt)} 알림 선택`}
                        onClick={() => selectAlertAndScrollToTop(r.id)}
                      >
                        {r.id === selected?.id ? "선택됨" : "선택"}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!rows.length && (
            <div className="empty-results">{loading ? "알림 목록 조회 중" : "조건에 맞는 알림이 없습니다."}</div>
          )}
        </div>
        <div className="pagination">
          <span>
            {loading ? "조회 중" : total
              ? `${(current - 1) * pageSize + 1}–${(current - 1) * pageSize + rows.length} / ${total.toLocaleString()}건`
              : "0건"}
          </span>
          <div>
            <button
              disabled={loading || current === 1}
              onClick={() => changePageKeepingScroll(current - 2)}
            >
              ← 이전
            </button>
            <span>
              {current} / {max} 페이지
            </span>
            <button
              disabled={loading || total == null || current >= max}
              onClick={() => changePageKeepingScroll(current)}
            >
              다음 →
            </button>
          </div>
        </div>
      </section>
      <Footer page="alerts" />
      {imageExpanded && selected?.image?.url && (
        <ImageModal
          key={`${selected.id}-${selected.image.url}`}
          image={selected.image}
          setNumber={selected.setNumber}
          onClose={() => setImageExpanded(false)}
        />
      )}
    </main>
  );
}
