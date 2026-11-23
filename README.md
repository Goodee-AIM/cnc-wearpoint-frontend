# AIM 공구 마모 진단 프론트엔드

MATWI 공구 이미지와 센서 데이터를 재생하고, AI 모델의 마모량·마모 유형 예측 결과에 따라 교체 경고를 표시하는 웹 대시보드입니다.

백엔드(FastAPI)가 정한 공통 재생 상태를 따라 Set 1~8을 자동 모니터링하고, 백엔드를 거쳐 AI 모델 Serving의 추론 결과를 표시합니다. 프론트엔드에서 AI 모델을 직접 실행하지 않습니다.

## 사용 기술

- React, JavaScript, JSX
- Vite
- CSS
- SVG 기반 센서 그래프
- Papa Parse
- i18next, react-i18next (한국어·영어)
- Oxlint
- Node 내장 테스트 러너 (`node --test`)
- Docker, Nginx

## 주요 기능

- Set 1~8 자동 모니터링 (원본 MATWI Set4~Set11을 Set 1~8로 표시)
- 서버 기준 공통 재생: 같은 Set을 선택한 브라우저는 서버가 정한 동일 측정과 재생 위치를 표시
- 추론 대기 재생: 이미지·센서 재생 → AI 추론 결과 대기 → 결과 3초 표시 → 다음 측정
- 센서 그래프 4개(최근 5초 파형)와 절삭 구간 표시
- 예측 마모량·예측 마모 유형·정상/경고/위험 상태와 조치 안내 표시
- Set test: 이미지 1개와 센서 CSV 1개를 업로드해 AI 추론 확인
- 하단 분석 시작 버튼으로 Set 1~8 전체 재시작
- 경고·위험 발생 시 실시간 알림 토스트
- 알림 이력 페이지: 필터, 페이지 이동, 확인 시각 저장, 과거 알림 조회
- 한국어·영어 화면 전환

## 화면 구성

| 영역 | 내용 |
|---|---|
| 상단 | AIM 로고와 서비스 제목, 알림 이력 버튼(미확인 건수), 언어 전환 |
| 왼쪽 | Set 이름, 재생·추론 진행 상태, Set 1~8과 Set test 선택 |
| 본문 상단 | 현재 마모 상태, 예측 마모량, 예측 마모 유형 |
| 본문 하단 | 공구 이미지(확대 보기)와 센서 그래프 4개 |
| 하단 | 팀 정보, 일반 Set의 분석 시작 버튼 또는 Set test의 파일 입력 버튼 |
| 오른쪽 위 | 경고·위험 알림 토스트 |

센서 그래프는 ACOUSTIC, ACCELEROMETER, FORCE X, FORCE Y 4개 채널을 표시합니다.

## 실행 방법

Node.js와 npm이 설치된 환경에서 실행합니다.

```bash
git clone https://github.com/Goodee-AIM/cnc-wearpoint-frontend.git
cd cnc-wearpoint-frontend
npm install
npm run dev
```

터미널에 표시된 주소를 브라우저에서 엽니다.

로컬 개발에서는 백엔드 주소를 `VITE_API_BASE_URL`로 지정합니다. 지정하지 않으면 현재 사이트와 같은 주소로 API를 요청합니다.

Windows PowerShell에서 npm 실행이 차단되면 다음 명령을 사용합니다.

```powershell
$env:VITE_API_BASE_URL = "http://127.0.0.1:8001"
npm.cmd install
npm.cmd run dev
```

자세한 로컬 확인 절차는 docs/shared-monitoring.md를 참고합니다.

## 백엔드 API

API 주소는 `VITE_API_BASE_URL` 또는 현재 사이트 주소를 사용합니다. 화면에서 사용하는 주요 API는 다음과 같습니다.

- `GET /api/monitoring/state`: 공통 재생 상태를 약 1초 간격으로 조회합니다.
- `GET /api/monitoring/inference/current`: 추론 대기 재생에서 현재 AI 추론 결과를 조회합니다.
- `POST /api/monitoring/restart`: 분석 시작 버튼으로 Set 1~8을 처음부터 다시 재생합니다.
- `GET /api/images/set{n}`, `GET /api/sets/{n}/measurements`: Set별 이미지와 측정 정보를 조회합니다.
- `GET /api/sensors/set{n}/{파일명}`과 `/cutting-segment`: 센서 CSV와 절삭 구간을 조회합니다.
- `POST /api/sensors/cutting-segment`: Set test CSV의 절삭 구간을 조회합니다.
- `POST /api/measurements/auto-predict`: Set test 이미지·CSV 업로드와 AI 추론을 요청합니다.
- `POST /api/measurements/{id}/replay-predict`, `POST /api/measurements/{id}/retry`: Set test 다시 재생·재추론을 요청합니다.
- `GET /api/monitoring/alerts`, `/api/monitoring/alerts/{id}/acknowledge`: 알림 이력 조회와 확인 시각 저장에 사용합니다.

## Set 1~8 자동 모니터링

접속하면 버튼 조작 없이 서버의 현재 재생 위치를 표시합니다. 다른 Set을 선택해도 서버 재생과 다른 접속자 화면에는 영향을 주지 않습니다.

서버가 추론 대기 재생을 사용하면 측정마다 다음 순서로 진행하고, 화면 위 문구로 단계를 표시합니다.

| 문구 | 의미 |
|---|---|
| 재생 중 · AI 추론 진행 | 이미지·센서를 재생하며 AI 추론이 진행 중 |
| AI 추론 완료 대기 중 | 재생이 끝나 추론 결과를 기다리는 중 |
| 추론 결과 표시 중 · 3초 | 해당 측정의 결과를 3초 동안 표시 |
| AI 추론 실패 | 추론이 실패하거나 취소됨 |
| AI 추론 실패 · 모델이 입력 데이터를 처리할 수 없음 | Serving이 입력을 거부함(`INPUT_REJECTED`) |

- 추론 결과는 세션, 재생 세대, 회차, Set, 위치, 측정 ID가 모두 같은 측정에만 표시합니다. 정답 라벨을 AI 예측으로 표시하지 않습니다.
- 추론 상태 응답이 늦게 도착해도 더 새로운 응답이 이미 반영되지 않았다면 그대로 반영합니다.
- 재생 속도는 서버가 알려준 속도를 따릅니다.
- 각 Set의 현재 센서 파일은 캐시에서 제거하지 않고, 선택한 Set의 센서가 없으면 다시 불러옵니다. 센서 CSV 조회 시간 제한은 30초입니다.
- 파형을 먼저 표시하고 절삭 구간 표시는 별도로 불러와 나중에 그립니다.
- 연결 오류가 나면 화면 시계가 멈추고 자동 재연결을 시도합니다.

분석 시작 버튼은 하단에 있으며 Set test와 과거 알림 조회 화면에서는 숨깁니다. 이 버튼은 다른 접속자 화면에도 적용됩니다.

## Set test

Set test를 선택하면 업로드 팝업이 열립니다. 팝업은 오른쪽 위 × 버튼으로 닫고, 파일 입력 버튼으로 언제든 다시 열 수 있습니다. AI 추론 중에도 열 수 있습니다.

| 데이터 | 조건 |
|---|---|
| 공구 이미지 | PNG 또는 JPEG 1개, 8MB 이하 |
| 센서 CSV | 1개, 20MB 이하, 헤더 없는 숫자 5열과 시간 1열 |

센서 CSV는 시간이 증가하는 행이 두 개 이상 있어야 합니다.

1. Set test를 선택합니다.
2. 팝업에서 이미지 1개와 센서 CSV 1개를 선택합니다.
3. 업로드하면 이미지·센서 재생과 AI 추론이 동시에 시작됩니다.
4. 재생이 끝난 뒤 예측 결과를 표시합니다.

- 팝업이 열려 있는 동안 이미지·그래프 재생을 일시정지하고, 닫으면 같은 위치부터 이어서 재생합니다.
- 파일을 선택하는 것만으로는 진행 중인 분석이 바뀌지 않습니다. 새 파일을 업로드하면 기존 재생을 교체하고 이전 요청의 결과는 표시하지 않습니다.
- 다른 데이터를 분석하려면 화면 하단 오른쪽의 파일 입력 버튼을 눌러 새 이미지와 센서 CSV를 업로드합니다.
- Set 1~8, 알림 이력 등 다른 화면으로 이동하면 이미지·CSV 재생과 대기 중인 결과를 초기화합니다.
- 새로고침하면 진행 중이던 추론 요청은 이어지지 않습니다. 브라우저에 저장된 파일로 화면은 복구하지만 완료되지 않은 결과는 복구하지 않으므로 필요하면 다시 업로드합니다.
- 추론 요청은 200초가 지나면 시간 초과로 처리합니다.
- 422는 서버가 알려준 구체적인 사유(업로드 검증 또는 `INPUT_REJECTED`)를 표시합니다. 재추론 버튼은 502에서만 표시합니다. 504, 시간 초과, 네트워크 오류는 각각 안내 문구를 표시합니다.

Set test와 과거 알림 조회의 재생은 2배속입니다(`src/utils/playbackRate.js`의 `PLAYBACK_RATE`).

## 상태 판정 기준

| 상태 | 예측 마모량 | 색상 |
|---|---|---|
| 정상 | 150μm 미만 | 초록 |
| 경고 | 150μm 이상, 200μm 미만 | 노랑 |
| 위험 | 200μm 이상 | 빨강 |
| 판정 대기 | 유효한 결과 없음 | 회색 |

프런트엔드 판정 기준은 `src/dashboardConfig.js`에서 설정합니다.
기준 변경 시 `src/aim-ui/pages/DashboardPage.jsx`의 카드 안내 문구와 백엔드 알림 기준도 함께 확인해야 합니다.

```javascript
export const WARNING = 150;
export const DANGER = 200;
```

추론 대기 재생에서는 AI 예측 결과로만 판정합니다. 예측이 없으면 판정 대기로 표시합니다.
경고·위험 안내 문구는 예측 마모 유형(플랭크 마모, 응착, 응착 + 플랭크 마모)에 따라 달라집니다.

## 공통 알림

- 경고·위험 결과가 나오면 화면 오른쪽 위에 알림 토스트를 표시합니다. 토스트는 3초 뒤 닫히며(마우스를 올리면 유지), × 버튼으로 닫거나 해당 Set 보기 버튼으로 이동합니다.
- 알림 이력 페이지는 서버에 기록된 현재 세션의 알림을 조회하며 5초 간격으로 갱신합니다.
- Set·단계·확인 상태로 필터링하고 페이지 단위로 이동합니다.
- 확인 버튼을 누르면 확인 시각을 서버에 저장합니다.
- 모니터링으로 이동을 누르면 해당 알림의 사진과 센서를 과거 알림 조회 화면으로 표시합니다. 이 화면은 해당 브라우저에만 적용되며, 현재 자동 모니터링으로 돌아가기 버튼으로 서버의 현재 위치에 다시 연결합니다.

## 주요 파일

| 파일 | 역할 |
|---|---|
| src/App.jsx | 데이터 hook과 화면 연결, 추론 결과 매칭 |
| src/aim-ui/components/AimUI.jsx | 화면 전환(모니터링, Set test, 알림) |
| src/aim-ui/pages/DashboardPage.jsx | Set 1~8 모니터링 화면 |
| src/aim-ui/pages/ManualInputPage.jsx | Set test 업로드·재생·추론 |
| src/aim-ui/pages/AlertsPage.jsx | 알림 이력 페이지 |
| src/hooks/useDashboard.js | 데이터 조회, 과거 알림 조회, 알림 상태 연결 |
| src/hooks/useSharedMonitoring.js | 공통 재생 상태·추론 결과 조회, 센서 캐시 |
| src/hooks/useAlerts.js | 알림 이력 조회와 확인 |
| src/utils/monitoringRunIdentity.js | 추론 결과와 표시 중인 측정의 일치 확인 |
| src/utils/sensorCache.js | 센서 CSV 캐시 |
| src/utils/playbackRate.js | 재생 속도 |
| src/dashboardConfig.js | Set 목록, 경고·위험 기준, API 주소 |
| src/i18n/ | 한국어·영어 번역 |
| tests/ | Node 회귀 테스트 |
| docs/shared-monitoring.md | 공통 모니터링 동작과 로컬 확인 절차 |
| Dockerfile, nginx.conf | 운영 이미지 빌드와 정적 파일 서비스 |
| .gitlab-ci.yml | 코드 검사, 이미지 빌드·승격, 운영 배포 |

src/components/의 파일은 이전 화면 컴포넌트이며 현재 화면은 src/aim-ui/를 사용합니다.

## 빌드와 코드 검사

```bash
npm run build
npm run preview
npm run lint
node --test tests/*.test.js
```

빌드 결과는 dist 폴더에 생성됩니다. 테스트는 npm 스크립트가 없으므로 `node --test`로 실행합니다.

빌드·테스트 통과와 별도로 실제 백엔드와 연결해 재생·추론·알림 동작을 확인해야 합니다.

## 배포

- GitHub Actions(`.github/workflows/sync-to-gitlab.yml`)가 main 브랜치와 `v*` 태그를 GitLab으로 동기화합니다.
- GitLab CI(`.gitlab-ci.yml`)는 main에서 lint와 Node 회귀 테스트를 실행하고, 통과하면 커밋 SHA 태그의 Docker 이미지를 빌드해 Quay에 push합니다.
- `vX.Y.Z` 태그를 push하면 해당 SHA 이미지를 버전 태그와 latest로 승격하고 운영 VM에 Docker Compose로 배포합니다.
- 태그는 main의 SHA 이미지가 만들어진 뒤에 push합니다.

## 현재 구현 범위

- 백엔드를 거쳐 AI 모델 Serving의 추론 결과를 표시합니다.
- 프론트엔드에서 AI 모델을 직접 실행하지 않습니다.
- 재생 위치와 회차는 서버가 결정하며 브라우저가 독립적으로 진행하지 않습니다.
- 알림 이력과 확인 시각은 서버에 저장합니다.
- 실시간 센서 수집이 아니라 저장된 MATWI 이미지·센서 데이터를 재생합니다.

## 향후 개발

- 실시간 데이터 수신과 화면 갱신
