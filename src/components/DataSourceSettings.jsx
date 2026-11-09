import { boxStyle, controlsStyle } from "./settingsStyles.js";

export default function DataSourceSettings({
  useServerImages,
  stopAllPhotos,
  setIndices,
  setTestValues,
  setUseServerImages,
  serverImageMessage,
  setServerImageReload,
  useDatabase,
  setUseDatabase,
  databaseMessage,
  setDatabaseReload,
}) {
  return (
    <>
      <section style={boxStyle}>
        <label style={controlsStyle}>
          <input
            type="checkbox"
            checked={useServerImages}
            onChange={(event) => {
              stopAllPhotos();
              setIndices({});
              setTestValues({});
              setUseServerImages(event.target.checked);
            }}
          />
          서버 이미지 자동 불러오기
        </label>

        <p role="status" style={{ marginTop: 10, fontSize: 12 }}>
          {useServerImages
            ? serverImageMessage
            : "직접 선택한 이미지 폴더를 사용합니다."}
        </p>

        <button
          type="button"
          disabled={!useServerImages}
          onClick={() => setServerImageReload((previous) => previous + 1)}
          style={{ marginTop: 10 }}
        >
          서버 이미지 다시 조회
        </button>
      </section>
      <section style={boxStyle}>
        <label style={controlsStyle}>
          <input
            type="checkbox"
            checked={useDatabase}
            onChange={(event) => {
              stopAllPhotos();
              setUseDatabase(event.target.checked);
            }}
          />
          DB 조회 사용
        </label>

        <p role="status" style={{ marginTop: 10, fontSize: 12 }}>
          {useDatabase
            ? databaseMessage
            : "로컬 CSV의 정답·예측 정보를 사용합니다."}
        </p>

        <button
          type="button"
          disabled={!useDatabase}
          onClick={() => setDatabaseReload((previous) => previous + 1)}
          style={{ marginTop: 10 }}
        >
          DB 다시 조회
        </button>

        <p style={{ marginTop: 10, fontSize: 12 }}>
          DB 사용 시 정답·예측 정보는 서버에서 조회합니다. 센서 자동 연결을 켜면
          현재 사진에 대응하는 센서 CSV도 서버에서 불러옵니다.
        </p>
      </section>
    </>
  );
}
