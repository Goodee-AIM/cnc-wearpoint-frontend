// 제목·값·보충 문구를 표시하는 공통 카드. API 조회나 마모 판정은 수행하지 않습니다.
// 진단 결과 카드 컴포넌트

export default function ResultCard({ title, value, note, color }) {
  return (
    <div className="result-card">
      <span>{title}</span>
      <strong style={{ fontSize: 22, color }}>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
