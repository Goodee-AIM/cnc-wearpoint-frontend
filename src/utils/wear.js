import { WARNING, DANGER } from "../dashboardConfig.js";

export function fileKey(name) {
  return String(name ?? "")
    .split(/[\\/]/)
    .pop()
    .replace(/\.(png|jpe?g)$/i, "");
}

export function recordKey(set, name) {
  return `${set}:${fileKey(name)}`;
}

export function numberOrNull(value) {
  if (value == null || String(value).trim() === "") return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : null;
}

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
