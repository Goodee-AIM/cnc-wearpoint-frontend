// 수동 모드에서 설정 접근과 공통 모니터링 복귀를 제공합니다. App은 자동 모드에서 이 패널을 숨깁니다.
// 서버의 공통 재생 상태와 Set별 현재 위치를 표시합니다.
import { SETS } from "../dashboardConfig.js";

const STATUS_LABELS = {
  idle: "서버 재생 대기",
  running: "공통 재생 중",
  paused: "서버 일시정지",
  completed: "전체 재생 완료",
};

export default function PlaybackControls({
  unifiedLoading,
  unifiedReady,
  unifiedPlaying,
  unifiedMessage,
  unifiedMode,
  groupSensor,
  sharedState,
  sharedSets,
  sharedMessage,
  sharedConnected,
  changeSet,
  selectedSet,
  setUnifiedMode,
}) {
  return (
    <section className="unified-controls" aria-label="전체 Set 모니터링">
      {unifiedMode && (
        <>
          <p role="status">
            {sharedMessage || STATUS_LABELS[sharedState?.status] || "공통 재생 상태 조회 중..."}
          </p>
          {sharedState?.cycle_number > 0 && (
            <p>반복 재생 {sharedState.cycle_number}회차 · 모든 Set이 끝나면 함께 처음부터 재생합니다.</p>
          )}
          <p role="status">{unifiedMessage}</p>
          {sharedState?.status === "idle" ? (
            <p>운영자가 서버에서 재생을 시작하면 이미지와 센서 그래프가 자동으로 표시됩니다.</p>
          ) : (
            <p>모든 접속자가 서버의 현재 측정 위치를 기준으로 모니터링합니다.</p>
          )}
          <div className="set-playback-status">
            {SETS.map((set) => {
              const item = sharedSets[set];
              const empty = !item || item.status === "empty";
              let label = "일시정지";
              if (empty) label = "재생 일정 없음";
              else if (!sharedConnected) label = "연결 대기";
              else if (item.status === "completed") label = "완료";
              else if (unifiedPlaying) label = item.playback_mode === "image_only" ? "사진만 재생" : "재생 중";
              return (
                <button key={set} onClick={() => changeSet(set)} aria-pressed={selectedSet === set}>
                  Set{set} · {empty ? "0/0" : `${item.position + 1}/${item.total}`} · {label}
                </button>
              );
            })}
          </div>
          {sharedState?.status !== "idle" && (
            <p role="status">
              Set{selectedSet}: {groupSensor?.message ?? "센서 조회 중"} ·{" "}
              {((groupSensor?.elapsed ?? 0) / 1000).toFixed(1)} /{" "}
              {((groupSensor?.duration ?? 0) / 1000).toFixed(1)}초
            </p>
          )}
          {(unifiedLoading || !unifiedReady) && <p>측정·라벨·예측 정보를 준비하고 있습니다.</p>}
        </>
      )}
      <button onClick={() => setUnifiedMode((value) => !value)}>
        {unifiedMode ? "개별 수동 설정 열기" : "공통 모니터링으로 돌아가기"}
      </button>
    </section>
  );
}
