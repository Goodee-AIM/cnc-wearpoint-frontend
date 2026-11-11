// 	Set4~Set11 목록, 그래프 제목, 경고·위험 기준, 백엔드 주소 관리
export const SETS = [4, 5, 6, 7, 8, 9, 10, 11];
// 센서 CSV의 앞 네 숫자 열과 그래프 순서를 고정합니다. 다섯 번째 값은 현재 화면에서 그리지 않습니다.
export const TITLES = ["음향", "가속도", "X축", "Y축"];
export const WARNING = 50;
export const DANGER = 90;
// 로컬 개발은 VITE_API_BASE_URL을 지정합니다. 미지정 시 현재 사이트와 같은 주소로 API를 요청합니다.
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || window.location.origin;