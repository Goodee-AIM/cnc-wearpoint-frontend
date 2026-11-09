import { useEffect, useRef, useState } from "react";
import { API_BASE, SETS } from "../dashboardConfig.js";
import { getStatus, numberOrNull, recordKey } from "../utils/wear.js";
import { parseSensor, readTable } from "../utils/csv.js";
import useAlerts from "./useAlerts.js";
import useSetPlayback from "./useSetPlayback.js";

export default function useDashboard() {
  const [unifiedMode, setUnifiedMode] = useState(true);
  const [unifiedLoading, setUnifiedLoading] = useState(false);
  const [unifiedReady, setUnifiedReady] = useState(false);
  const [unifiedPlaying, setUnifiedPlaying] = useState(false);
  const [unifiedMessage, setUnifiedMessage] = useState(
    "데이터 전체 불러오기를 눌러주세요.",
  );
  const unifiedController = useRef(null);
  useEffect(() => () => unifiedController.current?.abort(), []);

  const [selectedSet, setSelectedSet] = useState(10);
  const [page, setPage] = useState("monitoring");
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
        setIndices({});
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

  const [testValues, setTestValues] = useState({});
  const [testModes, setTestModes] = useState({});

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
  const [columns, setColumns] = useState([0, 1, 2, 3]);

  const activeImagesBySet = useServerImages ? serverImagesBySet : imagesBySet;

  const groupSensors = useSetPlayback(
    unifiedMode && unifiedReady,
    unifiedPlaying,
    activeImagesBySet,
    databaseRecords,
    indices,
    setIndices,
  );
  const groupSensor = groupSensors[selectedSet];
  async function loadAllData() {
    unifiedController.current?.abort();
    const controller = new AbortController();
    unifiedController.current = controller;
    setUnifiedMode(true);
    setUnifiedReady(false);
    setUnifiedLoading(true);
    setUnifiedPlaying(false);
    stopAllPhotos();
    setSensorPlaying(false);
    setUnifiedMessage("Set4~Set11 DB와 이미지 목록 조회 중...");
    try {
      const results = await Promise.all(
        SETS.map(async (set) => {
          async function read(url) {
            const response = await fetch(`${API_BASE}${url}`, {
              signal: controller.signal,
            });
            if (!response.ok)
              throw new Error(`Set${set} 조회 실패: HTTP ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data.items))
              throw new Error(`Set${set} 응답 형식 오류`);
            return data;
          }
          const [images, measurements] = await Promise.all([
            read(`/api/images/set${set}`),
            read(`/api/sets/${set}/measurements?limit=500`),
          ]);
          if (measurements.total > measurements.items.length)
            throw new Error(`Set${set} 측정 데이터가 일부만 조회되었습니다.`);
          return {
            set,
            images: images.items.map((item) => ({
              name: item.name,
              url: new URL(item.url, API_BASE).href,
            })),
            measurements: measurements.items,
          };
        }),
      );
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
        `DB ${Object.keys(recordMap).length}건 · 이미지 ${results.reduce((sum, result) => sum + result.images.length, 0)}장 · 각 Set의 연결 센서 자동 조회`,
      );
    } catch (error) {
      if (!controller.signal.aborted)
        setUnifiedMessage(`전체 불러오기 실패: ${error.message}`);
    } finally {
      if (!controller.signal.aborted) setUnifiedLoading(false);
    }
  }
  const groupHasWork = Object.values(groupSensors).some((entry) =>
    ["ready", "image-only", "loading", "advancing"].includes(entry.status),
  );
  useEffect(() => {
    if (unifiedPlaying && !groupHasWork) setUnifiedPlaying(false);
  }, [unifiedPlaying, groupHasWork]);

  const images = activeImagesBySet[selectedSet] ?? [];
  const imageIndex = indices[selectedSet] ?? 0;
  const currentImage = images[imageIndex] ?? null;

  function getRecord(set) {
    const list = activeImagesBySet[set] ?? [];
    const image = list[indices[set] ?? 0] ?? null;
    const key = image ? recordKey(set, image.name) : "";

    const dbRecord = useDatabase ? (databaseRecords[key] ?? null) : null;

    const dbActual = numberOrNull(
      dbRecord?.original_wear_um ?? dbRecord?.actual_wear_um,
    );
    const dbPredicted = numberOrNull(dbRecord?.predicted_wear_um);

    const label = useDatabase
      ? dbRecord
        ? {
            wear: dbActual,
            type: dbRecord.original_type ?? dbRecord.actual_type,
            sensorName: dbRecord.sensor_name,
            imageTime: dbRecord.image_captured_at,
          }
        : null
      : (labels[key] ?? null);

    const prediction = useDatabase
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
    retrySaveAlert,
    confirmingId,
    historyMessage,
    reloadHistory,
    alertSetFilter,
    setAlertSetFilter,
    alertLevelFilter,
    setAlertLevelFilter,
    alertReadFilter,
    setAlertReadFilter,
    filteredAlerts,
    setSelectedAlertId,
  } = useAlerts(getRecord, page === "alerts", activeImagesBySet);

  function showAlertSet(record) {
    setUnifiedPlaying(false);
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

  const actualWear = current.prediction?.actual ?? current.label?.wear ?? null;

  return {
    page,
    selectedSet,
    unifiedMode,
    header: {
      page,
      setPage,
      alertHistory,
    },
    navigation: {
      selectedSet,
      changeSet,
    },
    playback: {
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
      columns,
      setColumns,
    },
    diagnosis: {
      current,
      selectedSet,
      currentImage,
      useDatabase,
      actualWear,
    },
    notifications: {
      alerts,
      setDismissedAlerts,
      changeSet,
    },
    alertPage: {
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
    },
  };
}
