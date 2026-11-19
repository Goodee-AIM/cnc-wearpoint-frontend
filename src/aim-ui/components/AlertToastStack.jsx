import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createLiveAlertDetector, mergeAlertToasts } from "../../utils/alertToastFeed.js";
import { getSetName } from "../../utils/setDisplay.js";
import { wearAdviceKey } from "../../utils/wearAdvice.js";
import "../styles/alert-toasts.css";

const DISPLAY_MS = 8000;

function AlertToast({ item, onClose, onOpenSet }) {
  const { t, i18n } = useTranslation();
  const english = i18n.resolvedLanguage?.startsWith("en");
  const { row, count } = item;
  const remaining = useRef(DISPLAY_MS);
  const timer = useRef(null);
  const began = useRef(0);
  const hovered = useRef(false);
  const focused = useRef(false);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  const pause = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
      remaining.current = Math.max(0, remaining.current - (performance.now() - began.current));
    }
  };
  const resume = () => {
    if (timer.current !== null || hovered.current || focused.current) return;
    began.current = performance.now();
    timer.current = setTimeout(() => closeRef.current(), remaining.current);
  };
  useEffect(() => {
    remaining.current = DISPLAY_MS;
    resume();
    return pause;
  }, []);

  const wear = row.judged_wear_um == null ? NaN : Number(row.judged_wear_um);
  const time = new Date(row.created_at);
  const timeText = Number.isNaN(time.getTime()) ? "" : new Intl.DateTimeFormat(
    english ? "en-GB" : "ko-KR",
    { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false },
  ).format(time);

  return (
    <article
      className={`alert-toast alert-toast-${row.level}`}
      onMouseEnter={() => { hovered.current = true; pause(); }}
      onMouseLeave={() => { hovered.current = false; resume(); }}
      onFocusCapture={() => { focused.current = true; pause(); }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focused.current = false;
          resume();
        }
      }}
    >
      <div className="alert-toast-top">
        <strong>{getSetName(row.set_number)} · {t(`status.${row.level}`)}</strong>
        <button type="button" className="alert-toast-close" onClick={onClose}
          aria-label={english ? "Dismiss notification" : "토스트 닫기"}>×</button>
      </div>
      <p className="alert-toast-message">{t(wearAdviceKey(row.level, row.original_type))}</p>
      <div className="alert-toast-meta">
        <span>{Number.isFinite(wear) ? `${wear.toFixed(2)} μm` : "—"}</span>
        {count > 1 && <span>{english ? `${count} new alerts` : `새 알림 ${count}건`}</span>}
        <time dateTime={row.created_at}>{english ? "Detected " : "감지 "}{timeText}</time>
      </div>
      <button type="button" className="alert-toast-link" onClick={() => {
        onOpenSet(row.set_number);
        onClose();
      }}>{english ? "View this Set →" : "해당 Set 보기 →"}</button>
    </article>
  );
}

export default function AlertToastStack({ source, onOpenSet }) {
  const { i18n } = useTranslation();
  const english = i18n.resolvedLanguage?.startsWith("en");
  const [items, setItems] = useState([]);

  const detector = useRef(null);
  useEffect(() => {
    if (!source) return;
    if (!detector.current) detector.current = createLiveAlertDetector();
    const incoming = detector.current.scan(source);
    if (incoming.length) setItems((previous) => mergeAlertToasts(previous, incoming));
  }, [source]);

  const dismiss = (setNumber) => setItems((previous) => previous.filter((item) => item.row.set_number !== setNumber));
  return (
    <section className="alert-toast-stack" aria-label={english ? "New alerts" : "새 알림"}
      aria-live="polite" aria-relevant="additions text" aria-atomic="false">
      {items.slice(0, 3).map((item) => (
        <AlertToast key={`${item.row.set_number}:${item.row.id}:${item.count}`}
          item={item} onClose={() => dismiss(item.row.set_number)} onOpenSet={onOpenSet} />
      ))}
      {items.length > 3 && <p className="alert-toast-queued">
        {english ? `${items.length - 3} more Sets waiting` : `다른 Set ${items.length - 3}개 알림 대기 중`}
      </p>}
    </section>
  );
}
