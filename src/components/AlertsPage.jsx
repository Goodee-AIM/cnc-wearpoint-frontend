// 알림 이력 화면

import ToolImage from "./ToolImage.jsx";
import ResultCard from "./ResultCard.jsx";
import { SETS, WARNING, DANGER } from "../dashboardConfig.js";
import { alertTime, formatWear, wearType } from "../utils/wear.js";

export default function AlertsPage({
  alertHistory,
  selectedAlert,
  acknowledgeAlert,
  retrySaveAlert,
  confirmingId,
  historyMessage,
  reloadHistory,
  showAlertSet,
  alertSetFilter,
  setAlertSetFilter,
  alertLevelFilter,
  setAlertLevelFilter,
  alertReadFilter,
  setAlertReadFilter,
  filteredAlerts,
  setSelectedAlertId,
}) {
  return (
    <div className="alerts-page">
      <main className="alerts-main">
        <div className="alerts-title">
          <h2>경고·위험 알림</h2>
          <span>
            전체 {alertHistory.length}건 · 미확인{" "}
            {alertHistory.filter((record) => !record.acknowledgedAt).length}건
          </span>
        </div>
        <p className="alerts-session-note">
          DB에 저장된 알림 이력과 현재 접속 중 관측한 알림을 표시합니다.
        </p>
        {historyMessage && <p role="status">{historyMessage}</p>}
        <button type="button" onClick={reloadHistory}>
          DB 이력 새로고침
        </button>
        {selectedAlert ? (
          <section className="alert-preview">
            <div>
              <h3 style={{ color: selectedAlert.status.color }}>
                [Set{selectedAlert.set}] {selectedAlert.status.label}
              </h3>
              <ToolImage image={selectedAlert.image} />
            </div>
            <div className="alert-preview-results">
              <div className="alert-wear-summary">
                <ResultCard
                  title="예측 마모량"
                  value={formatWear(selectedAlert?.prediction?.predicted)}
                  note="저장된 모델 예측 결과"
                />

                <ResultCard
                  title="마모 유형"
                  value={wearType(selectedAlert?.label?.type)}
                  note="정답 라벨 기준"
                />
              </div>
              <div
                className="alert-status-box"
                style={{
                  borderColor: selectedAlert.status.color,
                  background: selectedAlert.status.background,
                }}
              >
                <strong style={{ color: selectedAlert.status.color }}>
                  {selectedAlert.status.label}
                </strong>
                <p>
                  {selectedAlert.source}: {formatWear(selectedAlert.wear)}
                </p>
                <small>
                  {selectedAlert.testing ? "테스트 입력값" : "저장 데이터 기준"}
                </small>
              </div>
              <section
                className="alert-preview-actions"
                aria-label="확인 및 이동"
              >
                <div className="alert-preview-action-buttons">
                  <button
                    type="button"
                    disabled={
                      !selectedAlert.dbAlertId ||
                      Boolean(selectedAlert.acknowledgedAt) ||
                      confirmingId !== null
                    }
                    onClick={() => acknowledgeAlert(selectedAlert.id)}
                  >
                    {selectedAlert.acknowledgedAt ? "확인 완료" : "확인"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Set${selectedAlert.set} 모니터링으로 이동`}
                    onClick={() => showAlertSet(selectedAlert)}
                  >
                    이동
                  </button>
                </div>
                <p role="status">
                  {selectedAlert.acknowledgedAt
                    ? `DB에 확인 기록이 저장되었습니다. 확인 시각 ${alertTime(selectedAlert.acknowledgedAt)}`
                    : selectedAlert.testing ||
                        !selectedAlert.prediction?.predictionId
                      ? "이 알림은 DB 확인 기록을 저장할 수 없습니다."
                      : selectedAlert.saveError
                        ? selectedAlert.saveError
                        : !selectedAlert.dbAlertId
                          ? "알림을 DB에 등록하는 중입니다."
                          : "아직 확인하지 않은 알림입니다."}
                </p>
                {selectedAlert.saveError && (
                  <button
                    type="button"
                    onClick={() => retrySaveAlert(selectedAlert)}
                  >
                    알림 등록 다시 시도
                  </button>
                )}
                <small>
                  이동하면 전체 재생을 일시정지하고 Set{selectedAlert.set}의
                  알림 사진으로 이동합니다.
                </small>
              </section>
            </div>
          </section>
        ) : (
          <p className="alerts-empty" role="status">
            조건에 맞는 알림이 없습니다. 전체 모니터링에서 데이터를 불러오고
            사진을 확인해주세요.
          </p>
        )}
        <section className="alert-list-section">
          <h3>전체 Set 알림</h3>
          <div className="alert-filters">
            <label>
              Set{" "}
              <select
                value={alertSetFilter}
                onChange={(event) => setAlertSetFilter(event.target.value)}
              >
                <option value="all">전체 Set</option>
                {SETS.map((set) => (
                  <option key={set} value={set}>
                    Set{set}
                  </option>
                ))}
              </select>
            </label>
            <label>
              단계{" "}
              <select
                value={alertLevelFilter}
                onChange={(event) => setAlertLevelFilter(event.target.value)}
              >
                <option value="all">전체 단계</option>
                <option value="warning">경고</option>
                <option value="danger">위험</option>
              </select>
            </label>
            <label>
              확인 상태{" "}
              <select
                value={alertReadFilter}
                onChange={(event) => setAlertReadFilter(event.target.value)}
              >
                <option value="all">전체</option>
                <option value="unread">미확인</option>
                <option value="read">확인</option>
              </select>
            </label>
          </div>
          <div className="alert-table-scroll">
            <table className="alert-table">
              <caption>
                알림 {filteredAlerts.length}건 · 선택 버튼으로 상세 조회
              </caption>
              <thead>
                <tr>
                  <th scope="col">알림 시각</th>
                  <th scope="col">Set</th>
                  <th scope="col">단계</th>
                  <th scope="col">판정 마모량</th>
                  <th scope="col">확인 상태</th>
                  <th scope="col">상세</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((record) => (
                  <tr
                    key={record.id}
                    className={
                      selectedAlert?.id === record.id ? "is-selected" : ""
                    }
                  >
                    <td>{alertTime(record.observedAt)}</td>
                    <td>Set{record.set}</td>
                    <td style={{ color: record.status.color }}>
                      {record.status.level === "danger" ? "위험" : "경고"}
                    </td>
                    <td>
                      {formatWear(record.wear)}
                      <small>{record.source}</small>
                    </td>
                    <td>{record.acknowledgedAt ? "확인" : "미확인"}</td>
                    <td>
                      <button
                        type="button"
                        aria-pressed={selectedAlert?.id === record.id}
                        onClick={() => setSelectedAlertId(record.id)}
                      >
                        선택
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <aside className="alert-details">
        <section>
          <h3>알림 상세</h3>
          {selectedAlert ? (
            <dl>
              <dt>Set</dt>
              <dd>Set{selectedAlert.set}</dd>
              <dt>알림 시각</dt>
              <dd>{alertTime(selectedAlert.observedAt)}</dd>
              <dt>이미지</dt>
              <dd>{selectedAlert.image?.name ?? "정보 없음"}</dd>
              <dt>센서</dt>
              <dd>
                {selectedAlert.prediction?.sensorName ||
                  selectedAlert.label?.sensorName ||
                  "정보 없음"}
              </dd>
              <dt>판정 기준</dt>
              <dd>
                경고 {WARNING}μm 이상 · 위험 {DANGER}μm 이상
              </dd>
              <dt>판정에 사용한 값</dt>
              <dd>{selectedAlert.source}</dd>
            </dl>
          ) : (
            <p>알림을 선택해주세요.</p>
          )}
        </section>
      </aside>
    </div>
  );
}
