// Set 선택 네비게이션 컴포넌트
import { SETS } from "../dashboardConfig.js";

export default function SetNavigation({ selectedSet, changeSet }) {
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
