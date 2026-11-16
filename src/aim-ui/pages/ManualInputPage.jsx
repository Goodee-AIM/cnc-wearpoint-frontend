import { getSetName } from "../../utils/setDisplay.js";
import "../styles/manual-upload.css";
import i18n from "../../i18n/index.js";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "../../dashboardConfig.js";
import { parseSensor } from "../../utils/csv.js";
import { imageFiles, sensorFiles, filePath, planPairs, playlistPosition } from "../../utils/manualPlaylist.js";
import { toSensorChannels } from "../adapters.js";
import ManualFilePicker from "../components/ManualFilePicker.jsx";
import DashboardPage from "./DashboardPage.jsx";

const base64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1]);
  reader.onerror = () => reject(new Error(i18n.t("manual.readFailed")));
  reader.readAsDataURL(file);
});
async function request(path, options = {}) {
  const response = await fetch(new URL(path, API_BASE), options);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === "string" ? data.detail : `${i18n.t("manual.requestFailed")} (${response.status})`);
  }
  return response.json();
}
export default function ManualInputPage({ sets, onSelectSet }) {
  const { t } = useTranslation();
  const [images, setImages] = useState([]), [sensors, setSensors] = useState([]);
  const [pairs, setPairs] = useState(null);
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]), [selectedKey, setSelectedKey] = useState("");
  const [loaded, setLoaded] = useState({ key: "", rows: [] });
  const [position, setPosition] = useState(0), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [progress, setProgress] = useState("");
  const cache = useRef(new Map());
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const choices = useMemo(() => {
    const grouped = new Set(groups.flatMap(group => group.item_ids));
    return [...groups.map(group => ({ key: "group:" + group.id, created: group.created_at, name: group.name, items: group.items })),
      ...items.filter(item => !grouped.has(item.id)).map(item => ({ key: item.id, created: item.created_at, name: item.image_name, items: [item] }))]
      .sort((a, b) => b.created.localeCompare(a.created));
  }, [groups, items]);
  const playlist = choices.find(choice => choice.key === selectedKey)?.items || [];
  const { index, elapsed } = playlistPosition(position, playlist);
  const selected = playlist[index];
  const sensorKey = selected?.sensor_url || "";
  const rows = loaded.key === sensorKey ? loaded.rows : [];

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([request("/api/manual-inputs", { signal: controller.signal }), request("/api/manual-inputs/playlists", { signal: controller.signal })])
      .then(([data, batches]) => {
        if (controller.signal.aborted) return;
        setItems(previous => [...new Map([...data.items, ...previous].map(item => [item.id, item])).values()]); setGroups(previous => [...new Map([...batches.items, ...previous].map(item => [item.id, item])).values()]);
        const newest = [...batches.items.map(group => ({ key: "group:" + group.id, created: group.created_at })), ...data.items.map(item => ({ key: item.id, created: item.created_at }))].sort((a,b) => b.created.localeCompare(a.created))[0];
        setSelectedKey(id => id || newest?.key || "");
      }).catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!sensorKey) return;
    const controller = new AbortController();
    const load = async () => {
      if (cache.current.has(sensorKey)) { setLoaded({ key: sensorKey, rows: cache.current.get(sensorKey) }); return; }
      try {
        const response = await fetch(new URL(sensorKey, API_BASE), { signal: controller.signal });
        if (!response.ok) throw new Error(i18n.t("manual.sensorFailed"));
        const data = parseSensor(await response.text());
        if (controller.signal.aborted) return;
        cache.current.set(sensorKey, data);
        if (cache.current.size > 12) cache.current.delete(cache.current.keys().next().value);
        setLoaded({ key: sensorKey, rows: data });
      } catch(err) { if (!controller.signal.aborted) setError(err.message); }
    };
    load();
    return () => controller.abort();
  }, [sensorKey]);
  useEffect(() => {
    if (!rows.length || busy) return;
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(); const delta = now - previous; previous = now;
      setPosition(value => value + delta);
    }, 80);
    return () => clearInterval(timer);
  }, [rows, busy]);

  const select = (files, kind) => {
    const supported = kind === "image" ? imageFiles(files) : sensorFiles(files);
    (kind === "image" ? setImages : setSensors)(supported);
    setPairs(null); setError(supported.length ? "" : t("manual.unsupported")); setProgress("");
  };
  const savePairs = async (selection) => {
    if (selection.some(pair => pair.sensorIndex < 0)) { setError(t("manual.unmatched")); return; }
    setBusy(true); setError(""); setProgress("");
    let savedCount = 0;
    try {
      // Validate every pair before the first network write. Each CSV is parsed once.
      const validated = new Set();
      for (const pair of selection) {
        const sensor = sensors[pair.sensorIndex];
        if (pair.image.size > 8 * 1024 * 1024 || sensor.size > 20 * 1024 * 1024) throw new Error(t("manual.sizeLimit"));
        const bitmap = await createImageBitmap(pair.image); bitmap.close();
        if (!validated.has(sensor)) {
          const data = parseSensor(await sensor.text());
          if (data.length < 2 || data.at(-1).ms <= data[0].ms) throw new Error(t("manual.timeRows") + " " + sensor.name);
          validated.add(sensor);
        }
      }
      const saved = [];
      for (const pair of selection) {
        if (!mounted.current) return;
        setProgress(t("manual.uploadProgress", { current: saved.length + 1, total: selection.length }));
        const sensor = sensors[pair.sensorIndex];
        const [imageData, sensorData] = await Promise.all([base64(pair.image), base64(sensor)]);
        const record = await request("/api/manual-inputs", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_name: pair.image.name, sensor_name: sensor.name, image_base64: imageData, sensor_base64: sensorData }),
        });
        saved.push(record); savedCount++;
        if (mounted.current) setItems(previous => [record, ...previous]);
      }
      if (!mounted.current) return;
      if (saved.length > 1) {
        const group = await request("/api/manual-inputs/playlists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item_ids: saved.map(item => item.id), name: `${images[0]?.webkitRelativePath?.split("/")[0] || getSetName("manual")} (${saved.length})` }) });
        if (!mounted.current) return;
        setGroups(previous => [group, ...previous]); setSelectedKey("group:" + group.id);
      } else setSelectedKey(saved[0].id);
      setPosition(0); setPairs(null); setProgress(t("manual.uploadComplete", { count: saved.length }));
    } catch(err) {
      if (mounted.current) setError((err.message || t("manual.uploadFailed")) + (savedCount ? " " + t("manual.partialSaved", { count: savedCount }) : ""));
    } finally { if (mounted.current) setBusy(false); }
  };
  const upload = (event) => {
    event.preventDefault(); setError("");
    if (!images.length || !sensors.length) { setError(t("manual.selectBoth")); return; }
    if (images.length > 1000) { setError(t("manual.tooMany")); return; }
    const planned = planPairs(images, sensors);
    if (images.length === 1 && sensors.length === 1) savePairs(planned);
    else setPairs(planned);
  };
  const start = rows[0]?.ms ?? 0;
  const visible = rows.filter(row => row.ms >= start + elapsed - 5000 && row.ms <= start + elapsed);
  const measurement = {
    image: selected ? { url: new URL(selected.image_url, API_BASE).href, filename: selected.image_name, sensorTime: visible.at(-1)?.time } : null,
    predictedWear: selected?.predicted_wear ?? null, status: "pending", wearTypeLabel: null,
  };
  const uploadPanel = <section className="manual-upload card" aria-label={t("manual.aria", { name: getSetName("manual") })}>
    <h2>{t("manual.title")}</h2>
    <form onSubmit={upload}>
      <ManualFilePicker label={t("image.toolImage")} accept="image/png,image/jpeg,image/webp" files={images} disabled={busy} onChange={files => select(files, "image")} />
      <ManualFilePicker label={t("manual.sensorCsv")} accept=".csv,text/csv" files={sensors} disabled={busy} onChange={files => select(files, "sensor")} />
      <button type="submit" disabled={busy}>{busy ? t("alerts.saving") : t("manual.upload")}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {progress && <p role="status">{progress}</p>}
    {pairs && <section className="manual-pairing" aria-label={t("manual.pairTitle")}>
      <h3>{t("manual.pairTitle")}</h3><p>{t("manual.pairHelp")}</p>
      <div className="manual-pairing-list">{pairs.map((pair, row) => <label key={filePath(pair.image)}><span>{row + 1}. {filePath(pair.image)}</span><select disabled={busy} aria-label={t("manual.pairFor", { name: filePath(pair.image) })} value={pair.sensorIndex} onChange={event => setPairs(previous => previous.map((item, i) => i === row ? { ...item, sensorIndex: Number(event.target.value) } : item))}>
        <option value={-1}>{t("manual.chooseSensor")}</option>{sensors.map((sensor, i) => <option key={filePath(sensor)} value={i}>{filePath(sensor)}</option>)}
      </select></label>)}</div>
      <button type="button" disabled={busy || pairs.some(pair => pair.sensorIndex < 0)} onClick={() => savePairs(pairs)}>{t("manual.confirmPairs")}</button>
      <button type="button" disabled={busy} onClick={() => setPairs(null)}>{t("manual.cancel")}</button>
    </section>}
    
    {playlist.length > 1 && <p role="status">{t("manual.playingIndex", { current: index + 1, total: playlist.length })}</p>}
  </section>;
  return <DashboardPage sets={sets} selectedSet="manual" onSelectSet={onSelectSet} measurement={measurement}
    channels={toSensorChannels(visible, start)} cursorSeconds={elapsed / 1000}
    playbackStatus="manual" onOpenManual={() => {}} beforeContent={uploadPanel} />;
}
