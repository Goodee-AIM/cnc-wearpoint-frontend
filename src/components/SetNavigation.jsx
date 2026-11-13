// Set 탭 선택은 현재 브라우저의 보기만 바꿉니다. 서버의 공통 재생 위치는 바꾸지 않습니다.
// Set 선택 네비게이션 컴포넌트
import { SETS } from "../dashboardConfig.js";

export default function SetNavigation({ selectedSet, changeSet, locked = false }) {
  return (
    <nav
      className="set-navigation"
      aria-label="Set 선택"
      style={{
        display: "flex",
        overflowX: "auto",
      }}
    >
      {SETS.map((set) => (
        <button
          key={set}
          type="button"
          disabled={locked}
          title={locked ? "과거 알림 조회 중에는 Set을 변경할 수 없습니다." : undefined}
          className={selectedSet === set ? "set-button active" : "set-button"}
          style={{ flex: "1 0 70px" }}
          onClick={() => changeSet(set)}
          aria-pressed={selectedSet === set}
        >
          Set{set}
        </button>
      ))}
    </nav>
  );
}
