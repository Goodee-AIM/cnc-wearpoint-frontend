import i18n from "../../i18n/index.js";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../../dashboardConfig.js";
import { parseSensor } from "../../utils/csv.js";
import { toSensorChannels } from "../adapters.js";
import DashboardPage from "./DashboardPage.jsx";

const base64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1]);
  reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
  reader.readAsDataURL(file);
});
async function request(path, options = {}) {
  const response = await fetch(new URL(path, API_BASE), options);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === "string" ? data.detail : `서버 요청 실패 (${response.status})`);
  }
  return response.json();
}
export default function ManualInputPage({ sets, onSelectSet }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [rows, setRows] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [restart, setRestart] = useState(0);
  const imageInput = useRef(null), sensorInput = useRef(null);
  const selected = items.find((item) => item.id === selectedId);

  useEffect(() => {
    const controller = new AbortController();
    request("/api/manual-inputs", { signal: controller.signal }).then((data) => {
      setItems(data.items);
      setSelectedId((id) => id || data.items[0]?.id || "");
    }).catch((err) => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    setRows([]); setElapsed(0);
    if (!selected) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch(new URL(selected.sensor_url, API_BASE), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(i18n.t("manual.sensorFailed"));
        return parseSensor(await response.text());
      }).then((data) => { if (!controller.signal.aborted) setRows(data); })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selected]);
  useEffect(() => {
    if (!rows.length || !playing) return;
    const duration = Math.max(1, rows.at(-1).ms - rows[0].ms);
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(), delta = now - previous;
      previous = now;
      setElapsed((value) => (value + delta) % duration);
    }, 80);
    return () => clearInterval(timer);
  }, [rows, playing, restart]);

  const upload = async (event) => {
    event.preventDefault();
    const image = imageInput.current.files[0], sensor = sensorInput.current.files[0];
    if (!image || !sensor) { setError(t("manual.selectBoth")); return; }
    if (image.size > 8 * 1024 * 1024 || sensor.size > 20 * 1024 * 1024) {
      setError(t("manual.sizeLimit")); return;
    }
    setBusy(true); setError("");
    try {
      const data = parseSensor(await sensor.text());
      if (data.length < 2 || data.at(-1).ms <= data[0].ms) throw new Error(t("manual.timeRows"));
      const bitmap = await createImageBitmap(image); bitmap.close();
      const [imageData, sensorData] = await Promise.all([base64(image), base64(sensor)]);
      const saved = await request("/api/manual-inputs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_name: image.name, sensor_name: sensor.name, image_base64: imageData, sensor_base64: sensorData }),
      });
      setItems((previous) => [saved, ...previous]); setSelectedId(saved.id); setPlaying(true);
    } catch (err) { setError(err.message || t("manual.uploadFailed")); }
    finally { setBusy(false); }
  };
  const start = rows[0]?.ms ?? 0;
  const visible = rows.filter((row) => row.ms >= start + elapsed - 5000 && row.ms <= start + elapsed);
  const measurement = {
    image: selected ? { url: new URL(selected.image_url, API_BASE).href, filename: selected.image_name, sensorTime: visible.at(-1)?.time } : null,
    predictedWear: selected?.predicted_wear ?? null, status: "pending", wearTypeLabel: null,
  };
  const uploadPanel = <section className="manual-upload card" aria-label={t("manual.aria")}>
      <h2>{t("manual.title")}</h2>
      <form onSubmit={upload}>
        <label>{t("image.toolImage")}<input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" required disabled={busy} /></label>
        <label>{t("manual.sensorCsv")}<input ref={sensorInput} type="file" accept=".csv,text/csv" required disabled={busy} /></label>
        <button type="submit" disabled={busy}>{busy ? t("alerts.saving") : t("manual.upload")}</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>;
  return <DashboardPage sets={sets} selectedSet="manual" onSelectSet={onSelectSet} measurement={measurement}
      channels={toSensorChannels(visible, start)} cursorSeconds={elapsed / 1000}
      playbackStatus="manual" onOpenManual={() => {}} beforeContent={uploadPanel} />;
}
