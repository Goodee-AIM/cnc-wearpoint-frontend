// Set4~Set11 목록, 그래프 제목, 경고·위험 기준, 백엔드 주소 관리
export const SETS = [4, 5, 6, 7, 8, 9, 10, 11];
export const TITLES = ["음향", "가속도", "X축", "Y축"];
export const WARNING = 50;
export const DANGER = 90;
export const API_BASE =
    import.meta.env.VITE_API_BASE_URL || window.location.origin;
