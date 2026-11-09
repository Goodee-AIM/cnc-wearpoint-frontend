// 라벨·예측 CSV를 읽고, 센서 CSV를 검증해 그래프에서 사용할 데이터로 변환
import Papa from "papaparse";

export function readTable(text, required) {
  const result = Papa.parse(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  if (
    result.errors.length ||
    !required.every((name) => result.meta.fields?.includes(name))
  ) {
    throw new Error(`필요한 열: ${required.join(", ")}`);
  }

  return result.data;
}

export function parseSensor(text) {
  const result = Papa.parse(text.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
  });

  if (result.errors.length) throw new Error("센서 CSV 형식 오류");

  let previous = -Infinity;

  const rows = result.data.map((cells, index) => {
    const values = cells.slice(0, 5).map(Number);
    const time = String(cells[5] ?? "").trim();
    const ms = Date.parse(time.replace(" ", "T").slice(0, 23));

    if (
      cells.length !== 6 ||
      cells.slice(0, 5).some((v) => String(v).trim() === "") ||
      values.some((v) => !Number.isFinite(v)) ||
      !Number.isFinite(ms) ||
      ms < previous
    ) {
      throw new Error(`센서 CSV ${index + 1}행 확인 필요`);
    }

    previous = ms;
    return { values, time, ms };
  });

  if (!rows.length) throw new Error("센서 데이터가 없습니다.");
  return rows;
}
