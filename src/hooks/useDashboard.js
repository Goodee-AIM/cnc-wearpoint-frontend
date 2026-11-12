// 대시보드 상태를 관리, 서버 이미지와 DB 측정 결과를 연결
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE, SETS } from "../dashboardConfig.js";
import { getStatus, numberOrNull, recordKey } from "../utils/wear.js";
import { parseSensor, readTable } from "../utils/csv.js";
import useAlerts from "./useAlerts.js";
import usePageLocation from "./usePageLocation.js";
import useSharedMonitoring from "./useSharedMonitoring.js";
import { loadDashboardData } from "../utils/sharedMonitoring.js";

// 자동 공통 모드와 수동 확인 모드의 상태를 조합합니다. 서버 시간 동기화는 useSharedMonitoring에 위임합니다.
export default function useDashboard() {
  const [unifiedMode, setUnifiedMode] = useState(true);
  const [unifiedLoading, setUnifiedLoading] = useState(false);
  const [unifiedReady, setUnifiedReady] = useState(false);
  const [unifiedMessage, setUnifiedMessage] = useState(
    "서버 데이터를 자동으로 불러오는 중...",
  );
  // 전체 메타데이터 조회의 취소 핸들입니다. 화면 종료 시 미완료 응답이 상태를 갱신하지 않도록 취소합니다.
  const unifiedController = useRef(null);
  useEffect(() => () => unifiedController.current?.abort(), []);

  // 테스트값·사진 인덱스·페이지 선택은 브라우저 내부 상태입니다. 서버 DB의 측정/예측을 덮어쓰지 않습니다.
  const [testValues, setTestValues] = useState({});
  const [testModes, setTestModes] = useState({});
  const [selectedSet, setSelectedSet] = useState(10);
  const [page, setPage] = usePageLocation();
  const shared = useSharedMonitoring(unifiedMode, selectedSet);
  const unifiedPlaying = unifiedMode && shared.connected && shared.state?.status === "running";
  const alertPreview = useRef(null);
  const [imagesBySet, setImagesBySet] = useState({});
  const [indices, setIndices] = useState({});
  const [photoPlayingBySet, setPhotoPlayingBySet] = useState({});
  const photoPlaying = Boolean(photoPlayingBySet[selectedSet]);

  function stopPhoto(set) {
    setPhotoPlayingBySet((previous) => ({
      ...previous,
      [set]: false,
    }));
  }

  function stopAllPhotos() {
    setPhotoPlayingBySet({});
  }

  // 수동 사진 재생만 제어합니다. 서버의 start/pause/reset API를 호출하지 않습니다.
  function startPhoto(set) {
    const list = activeImagesBySet[set] ?? [];

    if (list.length < 2) return;

    setIndices((previous) => ({
      ...previous,
      [set]: (previous[set] ?? 0) >= list.length - 1 ? 0 : (previous[set] ?? 0),
    }));

    setTestValues((previous) => ({
      ...previous,
      [set]: "",
    }));

    setPhotoPlayingBySet((previous) => ({
      ...previous,
      [set]: true,
    }));
  }

  const [useDatabase, setUseDatabase] = useState(false);
  const [databaseRecords, setDatabaseRecords] = useState({});
  const [databaseMessage, setDatabaseMessage] =
    useState("DB 조회 사용을 선택해주세요.");
  const [databaseReload, setDatabaseReload] = useState(0);

  const [useServerImages, setUseServerImages] = useState(false);
  const [serverImagesBySet, setServerImagesBySet] = useState({});
  const [serverImageMessage, setServerImageMessage] =
    useState("서버 이미지 사용을 선택해주세요.");
  const [serverImageReload, setServerImageReload] = useState(0);

  // 수동 모드의 서버 이미지 목록 조회. 출처 변경·재조회·화면 종료 시 이전 요청을 취소합니다.
  useEffect(() => {
    if (unifiedMode || !useServerImages) return;

    const controller = new AbortController();

    async function loadServerImages() {
      setServerImageMessage("서버 이미지 목록 조회 중...");

      try {
        const results = await Promise.all(
          SETS.map(async (set) => {
            const response = await fetch(`${API_BASE}/api/images/set${set}`, {
              signal: controller.signal,
            });

            if (!response.ok) {
              throw new Error(
                `Set${set} 이미지 조회 실패: HTTP ${response.status}`,
              );
            }

            const data = await response.json();

            if (!Array.isArray(data.items)) {
              throw new Error(`Set${set} 이미지 응답 형식 오류`);
            }

            return [
              set,
              data.items.map((item) => ({
                name: item.name,
                url: new URL(item.url, API_BASE).href,
              })),
            ];
          }),
        );

        if (controller.signal.aborted) return;

        const next = Object.fromEntries(results);
        const count = results.reduce(
          (total, [, list]) => total + list.length,
          0,
        );

        setServerImagesBySet(next);
        const preview = alertPreview.current;
        const previewIndex = preview ? (next[preview.set] ?? []).findIndex(
          (image) => recordKey(preview.set, image.name) === recordKey(preview.set, preview.name),
        ) : -1;
        setIndices(previewIndex >= 0 ? { [preview.set]: previewIndex } : {});
        alertPreview.current = null;
        stopAllPhotos();
        setTestValues({});
        setServerImageMessage(`서버 이미지 목록 조회 완료 · 전체 ${count}장`);
      } catch (error) {
        if (controller.signal.aborted) return;

        setServerImagesBySet({});
        setServerImageMessage(`서버 이미지 조회 실패: ${error.message}`);
      }
    }

    loadServerImages();

    return () => controller.abort();
  }, [unifiedMode, useServerImages, serverImageReload]);

  // 수동 모드의 DB 연결 정보 조회. 자동 모드는 아래 loadAllData가 페이지를 끝까지 읽습니다.
  useEffect(() => {
    if (unifiedMode || !useDatabase) return;

    const controller = new AbortController();

    async function loadDatabase() {
      setDatabaseMessage("Set4~11 데이터 조회 중...");
      setDatabaseRecords({});

      try {
        const results = await Promise.all(
          SETS.map(async (set) => {
            const response = await fetch(
              `${API_BASE}/api/sets/${set}/measurements?limit=500`,
              { signal: controller.signal },
            );

            if (!response.ok) {
              throw new Error(`Set${set} 조회 실패: HTTP ${response.status}`);
            }

            const data = await response.json();

            if (!Array.isArray(data.items)) {
              throw new Error(`Set${set} 응답 형식을 확인해주세요.`);
            }

            if (data.total > data.items.length) {
              throw new Error(
                `Set${set}의 일부 데이터만 조회됐습니다. 페이지 조회가 필요합니다.`,
              );
            }

            return { set, items: data.items };
          }),
        );

        const next = {};
        let count = 0;

        for (const { set, items } of results) {
          for (const item of items) {
            // 이미지가 없는 측정은 사진과 연결하지 않습니다.
            if (!item.image_name) continue;

            const key = recordKey(set, item.image_name);

            if (next[key]) {
              throw new Error(
                `이미지 연결 정보 중복: Set${set} ${item.image_name}`,
              );
            }

            next[key] = item;
            count += 1;
          }
        }

        if (controller.signal.aborted) return;

        setDatabaseRecords(next);
        setDatabaseMessage(`DB 조회 완료 · 이미지 연결 정보 ${count}건`);
      } catch (error) {
        if (controller.signal.aborted) return;

        setDatabaseRecords({});
        setDatabaseMessage(
          `DB 조회 실패: ${error.message} · 백엔드 실행과 CORS 설정을 확인해주세요.`,
        );
      }
    }

    loadDatabase();

    return () => controller.abort();
  }, [unifiedMode, useDatabase, databaseReload]);

  const urlsRef = useRef({});

  const [labels, setLabels] = useState({});
  const [predictions, setPredictions] = useState({});
  const [labelMessage, setLabelMessage] = useState("라벨 CSV 선택 대기");
  const [predictionMessage, setPredictionMessage] =
    useState("예측 CSV 선택 대기");
  const [imageMessage, setImageMessage] = useState("");


  const [sensor, setSensor] = useState({
    set: null,
    name: "",
    rows: [],
  });
  const [sensorMessage, setSensorMessage] = useState("센서 CSV 선택 대기");
  const [useServerSensors, setUseServerSensors] = useState(false);
  const [sensorPlaying, setSensorPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);

  const activeImagesBySet = useServerImages ? serverImagesBySet : imagesBySet;

  const groupSensors = shared.entries;
  const groupSensor = groupSensors[selectedSet];
  // 자동 모드의 초기 자료 조회: Set별 이미지 목록과 모든 측정을 읽고 파일명 매칭용 맵을 구성합니다.
  // 이전 요청을 취소하고 로컬 재생을 멈춘 뒤 서버 이미지·DB·센서 출처를 함께 사용하도록 맞춥니다.
  const loadAllData = useCallback(async () => {
    unifiedController.current?.abort();
    const controller = new AbortController();
    unifiedController.current = controller;
    const timeout = setTimeout(() => controller.abort("timeout"), 30000);
    setUnifiedReady(false);
    setUnifiedLoading(true);
    setPhotoPlayingBySet({});
    setSensorPlaying(false);
    setUnifiedMessage("Set4~Set11 DB와 이미지 목록 자동 조회 중...");
    try {
      const results = await loadDashboardData(API_BASE, SETS, controller.signal);
      if (controller.signal.aborted) return;
      const imageMap = {},
        recordMap = {};
      for (const result of results) {
        imageMap[result.set] = result.images;
        for (const item of result.measurements) {
          if (!item.image_name) continue;
          const key = recordKey(result.set, item.image_name);
          if (recordMap[key])
            throw new Error(
              `이미지 연결 중복: Set${result.set} ${item.image_name}`,
            );
          recordMap[key] = item;
        }
      }
      setServerImagesBySet(imageMap);
      setDatabaseRecords(recordMap);
      setUseServerImages(true);
      setUseDatabase(true);
      setUseServerSensors(true);
      setIndices({});
      setTestModes({});
      setTestValues({});
      setUnifiedReady(true);
      setUnifiedMessage(
        `DB ${Object.keys(recordMap).length}건 · 이미지 ${results.reduce((sum, result) => sum + result.images.length, 0)}장 · 서버 기준 자동 모니터링`,
      );
      return true;
    } catch (error) {
      if (!controller.signal.aborted || controller.signal.reason === "timeout")
        setUnifiedMessage(`자동 불러오기 실패: ${controller.signal.reason === "timeout" ? "조회 시간 초과" : error.message} · 자동 재시도 중`);
      return false;
    } finally {
      clearTimeout(timeout);
      if (!controller.signal.aborted || controller.signal.reason === "timeout")
        setUnifiedLoading(false);
    }
  }, [
    setPhotoPlayingBySet, setSensorPlaying, setServerImagesBySet, setDatabaseRecords,
    setUseServerImages, setUseDatabase, setUseServerSensors, setIndices,
    setTestModes, setTestValues,
  ]);

  // 서버 세션을 처음 받거나 세션이 바뀌면 메타데이터를 준비합니다. 실패 시 재시도하고 정리 시 취소합니다.
  // 반복 회차는 같은 세션을 유지하므로 매 회차마다 전체 이미지 목록을 다시 받지 않습니다.
  const sharedSessionId = shared.state?.session_id;
  useEffect(() => {
    if (!unifiedMode || sharedSessionId === undefined) return;
    let disposed = false;
    let retry;
    async function load() {
      const success = await loadAllData();
      if (!success && !disposed) retry = setTimeout(load, 5000);
    }
    void load();
    return () => {
      disposed = true;
      clearTimeout(retry);
      unifiedController.current?.abort();
    };
  }, [unifiedMode, sharedSessionId, loadAllData]);

  // 자동 모드에서는 파일명뿐 아니라 서버가 지정한 measurement_id로 정확한 측정 결과를 찾습니다.
  const databaseRecordsById = useMemo(() => Object.fromEntries(
    Object.values(databaseRecords).map((item) => [item.measurement_id, item]),
  ), [databaseRecords]);

  function sharedImage(set) {
    const item = shared.sets[set];
    if (!item?.image_url || item.status === "empty") return null;
    return { name: item.image_name, url: new URL(item.image_url, API_BASE).href };
  }

  const images = activeImagesBySet[selectedSet] ?? [];
  const imageIndex = indices[selectedSet] ?? 0;
  const currentImage = unifiedMode ? sharedImage(selectedSet) : (images[imageIndex] ?? null);

  // 이미지·라벨·예측을 한 화면 레코드로 조합합니다. Set4~9의 판정은 라벨, Set10·11은 예측 마모량을 사용합니다.
  function getRecord(set) {
    const list = activeImagesBySet[set] ?? [];
    const image = unifiedMode ? sharedImage(set) : (list[indices[set] ?? 0] ?? null);
    const key = image ? recordKey(set, image.name) : "";

    const dbRecord = unifiedMode
      ? (databaseRecordsById[shared.sets[set]?.measurement_id] ?? null)
      : useDatabase ? (databaseRecords[key] ?? null) : null;

    const dbActual = numberOrNull(
      dbRecord?.original_wear_um ?? dbRecord?.actual_wear_um,
    );
    const dbPredicted = numberOrNull(dbRecord?.predicted_wear_um);

    const label = useDatabase || unifiedMode
      ? dbRecord
        ? {
            wear: dbActual,
            type: dbRecord.original_type ?? dbRecord.actual_type,
            sensorName: dbRecord.sensor_name,
            imageTime: dbRecord.image_captured_at,
          }
        : null
      : (labels[key] ?? null);

    const prediction = useDatabase || unifiedMode
      ? dbPredicted !== null
        ? {
            predicted: dbPredicted,
            predictionId: dbRecord.prediction_id,
            actual: dbActual,
            error: dbActual === null ? null : Math.abs(dbActual - dbPredicted),
            sensorName: dbRecord.sensor_name,
          }
        : null
      : (predictions[key] ?? null);
    const testing = Boolean(testModes[set]);

    // Set10·11은 예측 마모량으로만 판정하며, 예측값이 없으면 판정 대기로 표시
    const wear = !image
      ? null
      : testing
        ? numberOrNull(testValues[set])
        : set === 10 || set === 11
          ? (prediction?.predicted ?? null)
          : (label?.wear ?? null);

    return {
      set,
      sessionId: unifiedMode ? shared.state?.session_id : null,
      cycleNumber: unifiedMode ? shared.state?.cycle_number : null,
      image,
      label,
      prediction,
      wear,
      testing,
      source: testing
        ? "테스트 마모량"
        : set === 10 || set === 11
          ? "예측 마모량"
          : "라벨 마모량",
      status: getStatus(wear),
    };
  }

  const current = getRecord(selectedSet);

  const {
    alertHistory,
    alerts,
    setDismissedAlerts,
    selectedAlert,
    acknowledgeAlert,
    confirmingId,
    historyMessage,
    historyCounts,
    historyLoading,
    historyPageNumber,
    historyPageSize,
    historyFilteredTotal,
    changeHistoryPage,
    reloadHistory,
    alertSetFilter,
    setAlertSetFilter,
    alertLevelFilter,
    setAlertLevelFilter,
    alertReadFilter,
    setAlertReadFilter,
    filteredAlerts,
    setSelectedAlertId,
  } = useAlerts(getRecord, activeImagesBySet);

  // 과거 알림 이동은 이 브라우저만 수동 미리보기로 전환합니다. 다른 접속자의 공통 재생은 계속됩니다.
  function showAlertSet(record) {
    alertPreview.current = { set: record.set, name: record.image?.name };
    // 자동 화면이 직접 URL로 표시되는 동안 수동 조회용 데이터 출처는 아직 준비되지 않았을 수 있습니다.
    // 알림 이동 시 서버 이미지·DB·센서 조회를 켜고, 이미 수동 모드여도 대상 사진을 다시 찾습니다.
    setUseServerImages(true);
    setUseDatabase(true);
    setUseServerSensors(true);
    setServerImageReload((value) => value + 1);
    setUnifiedMode(false);
    const list = activeImagesBySet[record.set] ?? [];
    const index = list.findIndex(
      (image) =>
        recordKey(record.set, image.name) ===
        recordKey(record.set, record.image?.name),
    );
    stopPhoto(record.set);
    if (index >= 0)
      setIndices((previous) => ({ ...previous, [record.set]: index }));
    changeSet(record.set);
    setPage("monitoring");
  }

  const matchedCount = images.filter((image) => {
    const key = recordKey(selectedSet, image.name);

    if (useDatabase) {
      const record = databaseRecords[key];

      return selectedSet === 10 || selectedSet === 11
        ? numberOrNull(record?.predicted_wear_um) !== null
        : numberOrNull(record?.original_wear_um ?? record?.actual_wear_um) !==
            null;
    }

    return selectedSet === 10 || selectedSet === 11
      ? Boolean(predictions[key])
      : Boolean(labels[key]);
  }).length;
  useEffect(() => {
    return () => {
      Object.values(urlsRef.current)
        .flat()
        .forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function changeSet(set) {
    setSensorPlaying(false);
    setSelectedSet(set);
    setImageMessage("");
  }

  // 로컬 선택 이미지는 Object URL로 표시합니다. 폴더 교체·언마운트 시 URL을 해제해 메모리를 반환합니다.
  function handleImages(event) {
    const files = Array.from(event.target.files ?? [])
      .filter((file) => /\.(png|jpe?g)$/i.test(file.name))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      );

    if (!files.length) {
      setImageMessage("선택한 폴더에 이미지가 없습니다.");
      return;
    }

    // 폴더명에 Set 번호가 있으면 잘못된 Set 선택을 확인합니다.
    const folderSets = files
      .map((file) =>
        file.webkitRelativePath?.match(
          /(?:^|[\\/])(?:images_)?Set(\d+)(?=[\\/]|$)/i,
        ),
      )
      .filter(Boolean)
      .map((match) => Number(match[1]));

    if (folderSets.some((set) => set !== selectedSet)) {
      setImageMessage(`Set${selectedSet}에 맞는 폴더를 선택해주세요.`);
      return;
    }

    stopPhoto(selectedSet);

    (urlsRef.current[selectedSet] ?? []).forEach((url) =>
      URL.revokeObjectURL(url),
    );

    const loaded = files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));

    urlsRef.current[selectedSet] = loaded.map((image) => image.url);

    setImagesBySet((previous) => ({
      ...previous,
      [selectedSet]: loaded,
    }));
    setIndices((previous) => ({ ...previous, [selectedSet]: 0 }));
    setTestValues((previous) => ({ ...previous, [selectedSet]: "" }));
    setImageMessage(`${loaded.length}장 로드 완료`);
  }

  // 수동 라벨 CSV를 Set+이미지 키로 변환합니다. DB 모드의 CSV 선택 제한은 설정 컴포넌트에서 처리합니다.
  async function handleLabels(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const rows = readTable(await file.text(), [
        "Set",
        "ImageName",
        "wear",
        "type",
      ]);

      const next = {};

      rows.forEach((row) => {
        const set = Number(row.Set);
        const wear = numberOrNull(row.wear);
        if (!SETS.includes(set) || !row.ImageName?.trim() || wear === null)
          return;

        next[recordKey(set, row.ImageName.trim())] = {
          wear,
          type: row.type,
          sensorName: row.SensorName,
          imageTime: row.ImageDateTime,
        };
      });

      setLabels(next);
      setLabelMessage(`전체 라벨 ${Object.keys(next).length}건 로드 완료`);
    } catch (error) {
      setLabels({});
      setLabelMessage(error.message);
    }
  }

  // 수동 예측 CSV의 중복 측정과 비정상 수치를 검사하고, 값이 있는 경우에만 오차를 계산합니다.
  async function handlePredictions(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const rows = readTable(await file.text(), [
        "Set",
        "ImageName",
        "Actual_Wear",
        "Predicted_Wear",
      ]);

      const next = {};

      rows.forEach((row) => {
        const set = Number(row.Set);
        const predicted = numberOrNull(row.Predicted_Wear);
        const actual = numberOrNull(row.Actual_Wear);

        if (!SETS.includes(set) || !row.ImageName?.trim() || predicted === null)
          return;

        const key = recordKey(set, row.ImageName.trim());

        if (next[key]) {
          throw new Error(`중복 예측 행: Set${set} ${row.ImageName}`);
        }

        next[key] = {
          predicted,
          actual,
          error: actual === null ? null : Math.abs(actual - predicted),
          sensorName: String(row.SensorName ?? "").trim(),
        };
      });

      setPredictions(next);
      setPredictionMessage(`예측 결과 ${Object.keys(next).length}건 로드 완료`);
    } catch (error) {
      setPredictions({});
      setPredictionMessage(error.message);
    }
  }

  // 로컬 센서 교체 시 재생 시간을 0으로 돌린 뒤 공통 파서로 6열·숫자·시간순 조건을 검사합니다.
  async function handleSensor(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const targetSet = selectedSet;
    setSensorPlaying(false);
    elapsedRef.current = 0;
    setElapsed(0);
    setSensor({ set: targetSet, name: file.name, rows: [] });

    try {
      const rows = parseSensor(await file.text());
      setSensor({ set: targetSet, name: file.name, rows });
      setSensorMessage(`${file.name} · ${rows.length.toLocaleString()}행`);
    } catch (error) {
      setSensorMessage(error.message);
    }
  }

  // 재생 상태나 이미지 목록이 바뀌어도 타이머가 참조할 최신 값
  const playbackRef = useRef(null);

  useEffect(() => {
    playbackRef.current = {
      playing: photoPlayingBySet,
      lists: activeImagesBySet,
    };
  }, [photoPlayingBySet, activeImagesBySet]);

  // Set마다 마지막 사진에 도달하면 해당 Set만 정지
  useEffect(() => {
    const finishedSets = SETS.filter((set) => {
      if (!photoPlayingBySet[set]) return false;

      const list = activeImagesBySet[set] ?? [];

      return list.length < 2 || (indices[set] ?? 0) >= list.length - 1;
    });

    if (!finishedSets.length) return;

    setPhotoPlayingBySet((previous) => {
      const next = { ...previous };

      finishedSets.forEach((set) => {
        next[set] = false;
      });

      return next;
    });
  }, [indices, photoPlayingBySet, activeImagesBySet]);

  // 재생 중인 모든 Set을 2초마다 진행
  useEffect(() => {
    const timer = window.setInterval(() => {
      const snapshot = playbackRef.current;

      if (!snapshot) return;

      const playingSets = SETS.filter(
        (set) =>
          snapshot.playing[set] && (snapshot.lists[set]?.length ?? 0) >= 2,
      );

      if (!playingSets.length) return;

      setIndices((previous) => {
        const next = { ...previous };
        let changed = false;

        playingSets.forEach((set) => {
          const list = snapshot.lists[set];
          const currentIndex = previous[set] ?? 0;
          const nextIndex = Math.min(currentIndex + 1, list.length - 1);

          if (nextIndex !== currentIndex) {
            next[set] = nextIndex;
            changed = true;
          }
        });

        return changed ? next : previous;
      });
    }, 2000);

    return () => window.clearInterval(timer);
  }, []);

  function movePhoto(index) {
    stopPhoto(selectedSet);

    setIndices((previous) => ({
      ...previous,
      [selectedSet]: index,
    }));

    setTestValues((previous) => ({
      ...previous,
      [selectedSet]: "",
    }));
  }

  // DB 사용 시 예측 결과 유무와 관계없이 측정 정보에서 연결 파일을 찾습니다.
  const currentDatabaseRecord =
    useDatabase && currentImage
      ? databaseRecords[recordKey(selectedSet, currentImage.name)]
      : null;

  const expectedSensor = String(
    useDatabase
      ? (currentDatabaseRecord?.sensor_name ?? "")
      : (current.prediction?.sensorName ?? current.label?.sensorName ?? ""),
  ).trim();

  // 사진이 바뀌면 같은 센서 파일명이어도 재생 위치를 초기화합니다.
  const sensorSourceKey = JSON.stringify([
    selectedSet,
    currentImage?.name ?? "",
    expectedSensor,
  ]);

  // 수동 모드에서 사진에 연결된 센서를 자동 조회합니다. 사진/Set 변경 시 이전 요청을 취소합니다.
  useEffect(() => {
    if (unifiedMode || !useServerSensors) return;

    const controller = new AbortController();

    setSensorPlaying(false);
    elapsedRef.current = 0;
    setElapsed(0);

    setSensor({
      set: selectedSet,
      name: expectedSensor,
      sourceKey: sensorSourceKey,
      rows: [],
    });

    if (!useDatabase) {
      setSensorMessage("자동 센서 조회는 DB 조회 사용을 켜주세요.");
      return () => controller.abort();
    }

    if (!currentImage) {
      setSensorMessage("현재 이미지가 없습니다.");
      return () => controller.abort();
    }

    if (!expectedSensor) {
      setSensorMessage("현재 사진에 연결된 센서 정보가 없습니다.");
      return () => controller.abort();
    }

    async function loadSensor() {
      setSensorMessage(`센서 CSV 조회 중: ${expectedSensor}`);

      try {
        const response = await fetch(
          `${API_BASE}/api/sensors/set${selectedSet}/${encodeURIComponent(expectedSensor)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "서버에 대응하는 센서 CSV 파일이 없습니다."
              : `센서 조회 실패: HTTP ${response.status}`,
          );
        }

        const text = await response.text();

        if (controller.signal.aborted) return;

        const rows = parseSensor(text);

        if (controller.signal.aborted) return;

        setSensor({
          set: selectedSet,
          name: expectedSensor,
          sourceKey: sensorSourceKey,
          rows,
        });

        setSensorMessage(
          `${expectedSensor} · ${rows.length.toLocaleString()}행 · 자동 연결`,
        );

        setSensorPlaying(true);
      } catch (error) {
        if (controller.signal.aborted) return;

        setSensor({
          set: selectedSet,
          name: expectedSensor,
          sourceKey: sensorSourceKey,
          rows: [],
        });

        setSensorMessage(error.message);
      }
    }

    loadSensor();

    // 사진이나 Set을 바꾸면 이전 요청 결과를 적용하지 않습니다.
    return () => controller.abort();
  }, [
    unifiedMode,
    useServerSensors,
    useDatabase,
    selectedSet,
    currentImage?.name,
    expectedSensor,
    sensorSourceKey,
  ]);

  // 자동 모드는 서버 위치에 연결된 센서를, 수동 모드는 현재 Set과 연결 키가 맞는 센서만 표시합니다.
  const sensorRows = unifiedMode
    ? (groupSensor?.rows ?? [])
    : sensor.set === selectedSet &&
        (useServerSensors
          ? useDatabase && sensor.sourceKey === sensorSourceKey
          : !sensor.sourceKey)
      ? sensor.rows
      : [];
  const start = sensorRows[0]?.ms ?? 0;
  const duration = sensorRows.length
    ? sensorRows[sensorRows.length - 1].ms - start
    : 0;

  // 현재 위치까지의 최근 5초만 그립니다. 자동 모드의 시간은 서버 기준, 수동 모드는 로컬 재생 시간입니다.
  const visibleRows = sensorRows.filter((row) => {
    const relative = row.ms - start;
    return (
      relative <= (unifiedMode ? (groupSensor?.elapsed ?? 0) : elapsed) &&
      relative >=
        Math.max(
          0,
          (unifiedMode ? (groupSensor?.elapsed ?? 0) : elapsed) - 5000,
        )
    );
  });

  // 수동 센서 재생 타이머. 일시정지 시 시간을 보관하고 종료·의존성 변경 시 타이머를 해제합니다.
  useEffect(() => {
    if (!sensorPlaying || !sensorRows.length) return;

    const began = performance.now();
    const initial = elapsedRef.current;

    const timer = window.setInterval(() => {
      const next = Math.min(duration, initial + performance.now() - began);

      elapsedRef.current = next;
      setElapsed(next);

      if (next >= duration) setSensorPlaying(false);
    }, 100);

    return () => window.clearInterval(timer);
  }, [sensorPlaying, sensorRows.length, duration, selectedSet]);

  const sensorMatches =
    sensor.set === selectedSet &&
    expectedSensor &&
    sensor.name === expectedSensor;


  // App이 처리 로직에 직접 접근하지 않도록 각 화면 컴포넌트별 props 묶음으로 반환합니다.
  return {
    page,
    selectedSet,
    unifiedMode,
    header: {
      page,
      setPage,
      historyCounts,
    },
    navigation: {
      selectedSet,
      changeSet,
    },
    playback: {
      unifiedLoading,
      unifiedReady,
      unifiedPlaying,
      unifiedMessage,
      unifiedMode,
      groupSensor,
      sharedState: shared.state,
      sharedSets: shared.sets,
      sharedMessage: shared.message,
      sharedConnected: shared.connected,
      changeSet,
      selectedSet,
      setUnifiedMode: (update) => {
        stopAllPhotos();
        setSensorPlaying(false);
        setUnifiedMode(update);
      },
    },
    sources: {
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
    },
    photos: {
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
    },
    sensorSettings: {
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
    },
    monitoring: {
      currentImage,
      visibleRows,
    },
    diagnosis: { current, selectedSet },
    notifications: {
      alerts,
      setDismissedAlerts,
      changeSet,
    },
    alertPage: {
      alertHistory,
      selectedAlert,
      acknowledgeAlert,
      confirmingId,
      historyMessage,
      historyCounts,
      historyLoading,
      historyPageNumber,
      historyPageSize,
      historyFilteredTotal,
      changeHistoryPage,
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
    },
  };
}
