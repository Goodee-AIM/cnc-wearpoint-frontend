// 공유 센서 파일의 완료 결과와 진행 중 요청을 함께 보관합니다.
// Set 전환은 요청을 취소하지 않습니다. 모니터링 종료/언마운트 때만 모두 정리합니다.
export function createSensorCache({ load, onChange = () => {}, capacity = 12 }) {
  const entries = new Map();
  let closed = false;
  function trim() {
    for (const [key, entry] of entries) {
      if (entries.size <= capacity) break;
      if (entry.status !== "loading") entries.delete(key);
    }
  }
  return {
    peek(key) {
      const entry = entries.get(key);
      if (entry) { entries.delete(key); entries.set(key, entry); }
      return entry;
    },
    read(key, url) {
      if (closed) return Promise.resolve(null);
      const existing = entries.get(key);
      if (existing && existing.status !== "error") return existing.promise;
      const controller = new AbortController();
      const entry = { status: "loading", rows: [], message: "센서 데이터 불러오는 중…", controller };
      entries.set(key, entry);
      entry.promise = Promise.resolve().then(() => load(url, controller.signal)).then(
        (rows) => {
          if (closed) return null;
          Object.assign(entry, { status: "ready", rows, message: "" });
          trim();
          onChange(new Map(entries));
          return rows;
        },
        (error) => {
          if (closed) return null;
          Object.assign(entry, { status: "error", rows: [], message: error.message });
          trim();
          onChange(new Map(entries));
          return null;
        },
      );
      return entry.promise;
    },
    close() {
      closed = true;
      for (const entry of entries.values()) entry.controller.abort();
      entries.clear();
    },
  };
}
