// 수동 센서 파일 선택과 재생 제어 UI. 서버 자동 연결을 켜면 해당 사진의 연결 CSV를 사용합니다.
// 센서 설정 화면

import { boxStyle, controlsStyle } from "./settingsStyles.js";

export default function SensorSettings({
  useServerSensors,
  setSensorPlaying,
  elapsedRef,
  setElapsed,
  setSensor,
  setSensorMessage,
  setUseServerSensors,
  selectedSet,
  handleSensor,
  sensor,
  sensorMessage,
  sensorRows,
  sensorPlaying,
  duration,
  elapsed,
  expectedSensor,
  sensorMatches,
}) {
  return (
    <section style={boxStyle}>
      <div style={{ marginBottom: 14 }}>
        <button
          type="button"
          aria-pressed={useServerSensors}
          onClick={() => {
            const next = !useServerSensors;

            setSensorPlaying(false);
            elapsedRef.current = 0;
            setElapsed(0);

            setSensor({
              set: null,
              name: "",
              rows: [],
            });

            setSensorMessage(
              next ? "센서 자동 연결 준비 중..." : "센서 CSV 선택 대기",
            );

            setUseServerSensors(next);
          }}
        >
          {useServerSensors
            ? "서버 센서 자동 연결 끄기"
            : "서버 센서 자동 연결 켜기"}
        </button>

        <p style={{ marginTop: 8, fontSize: 12 }} role="status">
          자동 연결: {useServerSensors ? "켜짐" : "꺼짐"}
        </p>
      </div>
      <label>
        Set{selectedSet} 센서 CSV — 선택 사항
        <input
          key={`sensor-${selectedSet}`}
          type="file"
          accept=".csv"
          disabled={useServerSensors}
          onChange={handleSensor}
          style={{ display: "block", marginTop: 8 }}
        />
      </label>

      <p
        style={{ margin: "10px 0", fontSize: 12, overflowWrap: "anywhere" }}
        role="status"
      >
        {sensor.set === selectedSet
          ? sensorMessage
          : "현재 Set의 센서 CSV를 선택해주세요."}
      </p>

      <div style={controlsStyle}>
        <button
          disabled={!sensorRows.length || sensorPlaying}
          onClick={() => {
            if (elapsedRef.current >= duration) {
              elapsedRef.current = 0;
              setElapsed(0);
            }
            setSensorPlaying(true);
          }}
        >
          센서 재생
        </button>
        <button
          disabled={!sensorPlaying}
          onClick={() => setSensorPlaying(false)}
        >
          일시정지
        </button>
        <button
          disabled={!sensorRows.length}
          onClick={() => {
            setSensorPlaying(false);
            elapsedRef.current = 0;
            setElapsed(0);
          }}
        >
          처음부터
        </button>
        <span style={{ fontSize: 12 }}>
          {(sensorRows.length ? elapsed / 1000 : 0).toFixed(1)}초 /{" "}
          {(duration / 1000).toFixed(1)}초
        </span>
      </div>

      <p style={{ marginTop: 10, fontSize: 11, color: "#64748b" }}>
        {useServerSensors
          ? "최근 5초 표시 · 사진 변경 시 대응 센서로 전환하고 처음부터 재생"
          : "최근 5초 표시 · 사진과 별도 재생"}
      </p>
      <p style={{ marginTop: 8, fontSize: 11, overflowWrap: "anywhere" }}>
        사진에 대응하는 센서: {expectedSensor || "정보 없음"}
        <br />
        {sensorRows.length && expectedSensor
          ? sensorMatches
            ? "선택한 센서 파일과 매칭됩니다."
            : "현재 사진과 선택한 센서 파일이 다릅니다."
          : ""}
      </p>
    </section>
  );
}
