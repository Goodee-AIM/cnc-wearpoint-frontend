// 사진 설정 화면

import { boxStyle, controlsStyle } from "./settingsStyles.js";
import { SETS, WARNING, DANGER } from "../dashboardConfig.js";

export default function PhotoSettings({
  selectedSet,
  useServerImages,
  handleImages,
  imageMessage,
  images,
  matchedCount,
  useDatabase,
  handlePredictions,
  predictionMessage,
  handleLabels,
  labelMessage,
  imageIndex,
  movePhoto,
  photoPlaying,
  startPhoto,
  stopPhoto,
  photoPlayingBySet,
  stopAllPhotos,
  testModes,
  setTestModes,
  setTestValues,
  testValues,
  currentImage,
}) {
  return (
    <section style={boxStyle}>
      <label style={{ display: "block", marginBottom: 14 }}>
        Set{selectedSet} 이미지 폴더
        <input
          key={`images-${selectedSet}`}
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          disabled={useServerImages}
          onChange={handleImages}
          style={{ display: "block", marginTop: 8 }}
        />
      </label>

      <p style={{ fontSize: 12, marginBottom: 14 }} role="status">
        {imageMessage}
        {" · "}사진 {images.length}장 / 결과 매칭 {matchedCount}장
      </p>

      <label style={{ display: "block", marginBottom: 14 }}>
        예측 결과 CSV — rf_test_predictions.csv
        <input
          type="file"
          accept=".csv"
          disabled={useDatabase}
          onChange={handlePredictions}
          style={{ display: "block", marginTop: 8 }}
        />
      </label>
      <p style={{ fontSize: 12, marginBottom: 14 }} role="status">
        {predictionMessage}
      </p>

      <label style={{ display: "block", marginBottom: 14 }}>
        정답 라벨 CSV — 선택 사항
        <input
          type="file"
          accept=".csv"
          disabled={useDatabase}
          onChange={handleLabels}
          style={{ display: "block", marginTop: 8 }}
        />
      </label>
      <p style={{ fontSize: 12, marginBottom: 14 }} role="status">
        {labelMessage}
      </p>

      <div style={controlsStyle}>
        <button
          disabled={!images.length || imageIndex === 0}
          onClick={() => movePhoto(imageIndex - 1)}
        >
          이전 사진
        </button>

        <button
          disabled={images.length < 2 || photoPlaying}
          onClick={() => startPhoto(selectedSet)}
        >
          사진 자동 재생
        </button>

        <button disabled={!photoPlaying} onClick={() => stopPhoto(selectedSet)}>
          사진 정지
        </button>

        <button
          disabled={!SETS.some((set) => photoPlayingBySet[set])}
          onClick={stopAllPhotos}
        >
          전체 사진 정지
        </button>
        <p style={{ marginTop: 10, fontSize: 12 }} role="status">
          재생 중:{" "}
          {SETS.filter((set) => photoPlayingBySet[set])
            .map((set) => `Set${set}`)
            .join(", ") || "없음"}
        </p>
        <button
          disabled={!images.length || imageIndex === images.length - 1}
          onClick={() => movePhoto(imageIndex + 1)}
        >
          다음 사진
        </button>
      </div>

      <p style={{ marginTop: 10, fontSize: 12 }}>
        {images.length ? imageIndex + 1 : 0} / {images.length}장{" · "}2초 간격
      </p>

      <label style={{ display: "block", marginTop: 16, fontSize: 13 }}>
        <input
          type="checkbox"
          checked={Boolean(testModes[selectedSet])}
          onChange={(event) => {
            setTestModes((previous) => ({
              ...previous,
              [selectedSet]: event.target.checked,
            }));
            setTestValues((previous) => ({
              ...previous,
              [selectedSet]: "",
            }));
          }}
        />{" "}
        색상 확인용 테스트 값 사용
      </label>

      {testModes[selectedSet] && (
        <input
          aria-label="테스트 마모량"
          type="number"
          min="0"
          step="0.1"
          placeholder="예: 25"
          value={testValues[selectedSet] ?? ""}
          disabled={photoPlaying || !currentImage}
          onChange={(event) =>
            setTestValues((previous) => ({
              ...previous,
              [selectedSet]: event.target.value,
            }))
          }
          style={{ marginTop: 8, width: 120, padding: 6 }}
        />
      )}

      <p style={{ marginTop: 12, fontSize: 11, color: "#64748b" }}>
        정상: {WARNING}μm 미만 / 경고: {WARNING}μm 이상 {DANGER}μm 미만 / 위험:{" "}
        {DANGER}μm 이상
        <br />
        저장된 예측 결과를 재생합니다. 실시간 AI 호출 전입니다.
      </p>
    </section>
  );
}
