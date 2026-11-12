import { useSyncExternalStore } from "react";

// URL을 화면 상태로 사용해 새로고침과 브라우저 뒤로/앞으로 이동을 지원합니다.
function subscribe(onChange) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readPage() {
  return window.location.hash === "#alerts" ? "alerts" : "monitoring";
}

function navigate(page) {
  window.location.hash = page === "alerts" ? "alerts" : "monitoring";
}

export default function usePageLocation() {
  const page = useSyncExternalStore(subscribe, readPage, () => "monitoring");
  return [page, navigate];
}
