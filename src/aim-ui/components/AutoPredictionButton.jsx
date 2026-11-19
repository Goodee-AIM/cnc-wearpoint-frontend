import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../dashboardConfig.js";
import { planPairs } from "../../utils/manualPlaylist.js";
import "../styles/auto-prediction-dialog.css";

function parseProblem(status, detail, english, retryRequest = false) {
  const messages = {
    413: ["파일 크기 제한을 초과했습니다. 이미지 8MB, CSV 20MB 이하로 선택해 주세요.", "File too large. Maximum: image 8 MB, CSV 20 MB."],
    422: ["이미지 또는 센서 CSV의 형식이 올바르지 않습니다.", "Invalid image or sensor CSV format."],
    429: ["다른 AI 분석이 진행 중입니다. 잠시 후 다시 시도해 주세요.", "Another analysis is in progress. Try again shortly."],
    403: retryRequest
      ? ["재추론 권한이 만료됐거나 이 브라우저에 없습니다. 파일을 다시 업로드해 주세요.", "Retry access expired or is missing. Please upload again."]
      : ["이 주소에서는 추론 요청을 허용하지 않습니다. 사이트 주소를 확인해 주세요.", "Prediction is not permitted from this origin."],
    409: ["이미 분석 중이거나 완료된 데이터입니다. 중복 추론을 실행하지 않습니다.", "Already processing or completed. Duplicate inference is blocked."],
    502: ["AI 분석에 실패했습니다. 저장된 파일로 다시 추론할 수 있습니다.", "AI inference failed. You can retry with saved files."],
    503: ["AI 분석 서비스를 일시적으로 이용할 수 없습니다. 관리자에게 문의해 주세요.", "AI inference is temporarily unavailable. Contact the administrator."],
  };
  return messages[status]?.[english ? 1 : 0] ||
    (typeof detail === "string" ? detail : (typeof detail?.message === "string" ? detail.message :
      (english ? "The request failed. Please try again." : "요청에 실패했습니다. 다시 시도해 주세요.")));
}

const urlFor = (path) => new URL(path, API_BASE).href;

async function callPrediction(path, options) {
  let response;
  try {
    response = await fetch(urlFor(path), { credentials: "same-origin", ...options });
  } catch {
    throw { status: 0, detail: null };
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw { status: response.status, detail: payload.detail };
  return payload;
}

// Integrates with the existing ManualInputPage file pickers. No second login,
// no X-Prediction-Token, and no access to the HttpOnly retry cookie from JS.
export default function AutoPredictionButton({ images, sensors, disabled = false, onResult, onBusyChange }) {
  const { i18n } = useTranslation();
  const english = i18n.resolvedLanguage?.startsWith("en") ?? false;
  const tr = (ko, en) => english ? en : ko;
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [modal, setModal] = useState(null);

  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  const fail = (error, pair = null, plan = null, index = -1, retryRequest = false) => {
    const id = Number(error?.detail?.measurement_id);
    const canRetry = error?.status === 502 && Number.isSafeInteger(id) && id > 0;
    setModal({
      title: tr("AI 분석 안내", "AI analysis"),
      message: parseProblem(error?.status, error?.detail, english, retryRequest),
      measurementId: canRetry ? id : null,
      pair,
      plan,
      index,
    });
  };

  async function runPlan(plan, startIndex = 0) {
    for (let index = startIndex; index < plan.length; index += 1) {
      const pair = plan[index];
      const sensor = sensors[pair.sensorIndex];
      const form = new FormData();
      form.append("image", pair.image);
      form.append("sensor_csv", sensor);
      setProgress(tr(`AI 분석 중 (${index + 1}/${plan.length})`, `Analyzing (${index + 1}/${plan.length})`));
      try {
        const data = await callPrediction("/api/measurements/auto-predict", { method: "POST", body: form });
        await onResult(data, pair.image, sensor);
      } catch (error) {
        fail(error, pair, plan, index);
        return;
      }
    }
    setProgress(tr("AI 분석 완료", "AI analysis complete"));
  }

  const analyze = async () => {
    if (running || disabled) return;
    if (!images.length || !sensors.length) {
      setModal({ title: tr("파일을 선택해 주세요", "Select files"), message: tr("이미지와 센서 CSV가 모두 필요합니다.", "Both an image and sensor CSV are required.") });
      return;
    }
    const plan = planPairs(images, sensors);
    if (plan.some(pair => pair.sensorIndex < 0)) {
      setModal({ title: tr("파일 연결 확인", "File pairing"), message: tr("이미지와 센서 CSV 파일 이름을 일치시켜 주세요. 단일 이미지와 단일 CSV는 자동으로 연결됩니다.", "Match image and CSV filenames. A single image and CSV pair automatically.") });
      return;
    }
    setModal(null);
    setRunning(true);
    onBusyChange?.(true);
    try {
      await runPlan(plan);
    } finally {
      setRunning(false);
      onBusyChange?.(false);
    }
  };

  const retry = async () => {
    if (running || !modal?.measurementId) return;
    const previous = modal;
    setRunning(true);
    onBusyChange?.(true);
    setProgress(tr("재추론 중...", "Retrying inference..."));
    try {
      const data = await callPrediction(`/api/measurements/${previous.measurementId}/retry`, { method: "POST" });
      await onResult(data, previous.pair.image, sensors[previous.pair.sensorIndex]);
      setModal(null);
      if (previous.plan && previous.index + 1 < previous.plan.length) {
        await runPlan(previous.plan, previous.index + 1);
      } else {
        setProgress(tr("재추론 완료", "Retry complete"));
      }
    } catch (error) {
      fail(error, previous.pair, previous.plan, previous.index, true);
    } finally {
      setRunning(false);
      onBusyChange?.(false);
    }
  };

  return <>
    <div className="auto-inference-actions">
      <button type="button" className="manual-action manual-action-upload"
        onClick={analyze} disabled={disabled || running}>
        {running ? tr("AI 분석 중...", "Analyzing...") : tr("AI 자동 추론", "AI auto prediction")}
      </button>
      {progress && <span role="status">{progress}</span>}
    </div>
    {modal && <div className="auto-inference-backdrop" role="presentation">
      <section className="auto-inference-dialog" role="alertdialog" aria-modal="true"
        aria-label={modal.title}>
        <h3>{modal.title}</h3>
        <p>{modal.message}</p>
        {modal.measurementId && <p className="auto-inference-record-id">Measurement ID: {modal.measurementId}</p>}
        <div className="auto-inference-dialog-actions">
          {modal.measurementId && <button type="button" onClick={retry} disabled={running}>
            {running ? tr("재추론 중...", "Retrying...") : tr("재추론", "Retry inference")}
          </button>}
          <button type="button" onClick={() => setModal(null)} disabled={running}>
            {tr("닫기", "Close")}
          </button>
        </div>
      </section>
    </div>}
  </>;
}
