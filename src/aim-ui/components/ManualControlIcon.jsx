// 업로드 패널 전용 아이콘입니다. 외부 아이콘 패키지는 사용하지 않습니다.
export default function ManualControlIcon({ name }) {
  const shapes = {
    folder: <path d="M3 7V5a2 2 0 0 1 2-2h5l3 4h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
    play: <path d="m8 4 13 8-13 8Z" fill="currentColor" strokeLinejoin="round" />,
    replay: <><path d="M20 8a9 9 0 1 0 1 8M20 3v6h-6" /></>,
  };
  return <svg className="manual-control-icon" width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[name]}</svg>;
}
