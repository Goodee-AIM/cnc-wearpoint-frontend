// 전체 Set 데이터 및 재생 제어 컴포넌트

import { SETS } from "../dashboardConfig.js";

export default function PlaybackControls({
  unifiedLoading,
  loadAllData,
  unifiedReady,
  groupHasWork,
  unifiedPlaying,
  setUnifiedPlaying,
  setUnifiedReady,
  setIndices,
  unifiedMessage,
  unifiedMode,
  groupSensors,
  changeSet,
  selectedSet,
  indices,
  activeImagesBySet,
  groupSensor,
  setUnifiedMode,
}) {
  return (
    <section className="unified-controls" aria-label="전체 Set 데이터 및 재생">
      <div className="unified-actions">
        <button disabled={unifiedLoading} onClick={loadAllData}>
          {unifiedLoading ? "데이터 불러오는 중..." : "데이터 전체 불러오기"}
        </button>
        <button
          disabled={
            !unifiedReady || unifiedLoading || !groupHasWork || unifiedPlaying
          }
          onClick={() => setUnifiedPlaying(true)}
        >
          전체 Set 동시 재생
        </button>
        <button
          disabled={!unifiedPlaying}
          onClick={() => setUnifiedPlaying(false)}
        >
          전체 일시정지
        </button>
        <button
          disabled={!unifiedReady || unifiedLoading}
          onClick={() => {
            setUnifiedPlaying(false);
            setUnifiedReady(false);
            setTimeout(() => {
              setIndices({});
              setUnifiedReady(true);
            }, 0);
          }}
        >
          전체 처음부터
        </button>
      </div>
      <p role="status">{unifiedMessage}</p>
      <p>
        Set4~Set11의 사진과 연결 센서를 함께 재생합니다. 각 센서가 끝나면 해당
        Set의 다음 사진으로 이동합니다. 센서가 없거나 오류가 있으면 사진만 2초
        표시한 뒤 계속합니다.
      </p>
      {unifiedMode && unifiedReady && (
        <div className="set-playback-status">
          {SETS.map((set) => {
            const entry = groupSensors[set];
            return (
              <button
                key={set}
                onClick={() => changeSet(set)}
                aria-pressed={selectedSet === set}
              >
                Set{set} · {(indices[set] ?? 0) + 1}/
                {activeImagesBySet[set]?.length ?? 0} ·{" "}
                {entry?.status === "image-only"
                  ? "사진만 재생"
                  : entry?.status === "finished"
                    ? "완료"
                    : entry?.status === "ready"
                      ? unifiedPlaying
                        ? "재생 중"
                        : "준비"
                      : "조회 중"}
              </button>
            );
          })}
        </div>
      )}
      {unifiedMode && unifiedReady && (
        <p role="status">
          Set{selectedSet}: {groupSensor?.message ?? "센서 조회 중"} ·{" "}
          {((groupSensor?.elapsed ?? 0) / 1000).toFixed(1)} /{" "}
          {((groupSensor?.duration ?? 0) / 1000).toFixed(1)}초
        </p>
      )}
      <button
        onClick={() => {
          setUnifiedPlaying(false);
          setUnifiedMode((value) => !value);
        }}
      >
        {" "}
        {unifiedMode ? "개별 수동 설정 열기" : "전체 Set 설정으로 돌아가기"}
      </button>
    </section>
  );
}
