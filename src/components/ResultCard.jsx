// 진단 결과 카드 컴포넌트

export default function ResultCard({ title, value, note, color }) {
  return (
    <div className="result-card">
      <span>{title}</span>
      <strong style={{ fontSize: 18, color }}>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
