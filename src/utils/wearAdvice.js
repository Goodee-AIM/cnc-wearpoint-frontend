// 화면에 쓰는 유형 표기와 상태별 조치 안내를 한 곳에서 결정합니다.
export function wearTypeKey(value) {
  const type = String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (type === "flank" || type === "flank_wear") return "flank_wear";
  if (type === "adhesion") return "adhesion";
  if (["adhesion+flank", "flank+adhesion", "adhesion+flank_wear", "flank_wear+adhesion"].includes(type)) {
    return "adhesion_flank";
  }
  return type;
}

export function wearAdviceKey(status, type) {
  if (status === "normal") return "statusCaption.normal";
  if (status !== "warning" && status !== "danger") return "statusCaption.pending";
  const key = wearTypeKey(type);
  if (key === "adhesion" || key === "adhesion_flank") return "statusCaption.inspect";
  if (key === "flank_wear") {
    return status === "danger" ? "statusCaption.danger" : "statusCaption.slowDown";
  }
  // 유형이 없거나 지원하지 않는 값이면 교체·감속으로 단정하지 않습니다.
  return "statusCaption.warning";
}
