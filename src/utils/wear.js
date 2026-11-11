// Set 번호와 이미지 파일명으로 매칭 키 생성 후
// 마모 상태를 판정하며, 마모량·유형·알림 시각을 표시 형식 변환
import { WARNING, DANGER } from "../dashboardConfig.js";

// 경로와 JPG/PNG 확장자를 제외해 같은 이미지의 파일명 기반 연결 키를 만듭니다.
export function fileKey(name) {
  return String(name ?? "")
    .split(/[\\/]/)
    .pop()
    .replace(/\.(png|jpe?g)$/i, "");
}

export function recordKey(set, name) {
  return `${set}:${fileKey(name)}`;
}

// 누락·빈 문자열·음수·NaN은 0으로 판정하지 않고 결과 없음(null)으로 구분합니다.
export function numberOrNull(value) {
  if (value == null || String(value).trim() === "") return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : null;
}

// 화면의 기본 판정은 위험 기준을 먼저 비교합니다. 알림 상세 임계값은 발생 당시 서버 기록을 따로 표시합니다.
export function getStatus(wear) {
  if (wear === null) {
    return {
      level: "waiting",
      label: "판정 대기",
      color: "#64748b",
      background: "#f1f5f9",
    };
  }

  if (wear >= DANGER) {
    return {
      level: "danger",
      label: "위험 · 공구 교체 필요",
      color: "#b91c1c",
      background: "#fef2f2",
    };
  }

  if (wear >= WARNING) {
    return {
      level: "warning",
      label: "경고 · 마모 상태 확인",
      color: "#a16207",
      background: "#fefce8",
    };
  }

  return {
    level: "normal",
    label: "정상",
    color: "#15803d",
    background: "#f0fdf4",
  };
}

export function wearType(value) {
  if (value === "flank_wear") return "플랭크 마모";
  if (value === "adhesion") return "응착";
  return value || "—";
}

export function formatWear(value) {
  return value === null || value === undefined ? "—" : `${value.toFixed(2)} μm`;
}

export function alertTime(value) {
  return value
    ? new Date(value).toLocaleString("ko-KR", { hour12: false })
    : "—";
}
