import { useTranslation } from "react-i18next";
import "../styles/landing.css";

// Static project introduction only. No backend polling or model invocation occurs here.
const text = {
  ko: {
    languageAction: "English",
    brandSubtitle: "CNC WearPoint · 공구 마모 예측 및 모니터링",
    topicNumber: "01 / 주제",
    topicLineOne: "CNC 공구 마모 예측",
    topicLineTwo: "및 모니터링",
    topicLead: "CNC 가공 이미지와 센서 데이터를 사용해 공구의 마모량과 유형을 예측합니다. 분석 결과와 경고 이력을 한 화면에서 확인할 수 있습니다.",
    dashboardAction: "모니터링 화면 보기",
    teamNumber: "02 / 팀원",
    teamTitle: "AIM 팀원",
    teamDescription: "AIM 팀의 프로젝트 참여 인원입니다.",
    leader: "팀장",
    member: "팀원",
    purposeNumber: "03 / 서비스 목적",
    purposeTitle: "공구 상태와 예측 결과를 한 화면에서",
    purposeLead: "공구 이미지, 센서 신호, 마모 예측 결과를 연결해 상태를 확인하기 쉽도록 구성했습니다.",
    purposeOneTitle: "데이터 확인",
    purposeOneDescription: "공구 이미지와 음향·진동·절삭력 센서 신호를 같은 화면에서 확인합니다.",
    purposeTwoTitle: "마모 상태 파악",
    purposeTwoDescription: "모델이 예측한 마모량, 마모 유형, 정상·경고·위험 상태를 표시합니다.",
    purposeThreeTitle: "기록 조회",
    purposeThreeDescription: "발생한 알림과 당시 저장된 예측 결과를 다시 확인할 수 있습니다.",
    featuresNumber: "04 / 주요 기능",
    featuresTitle: "주요 기능",
    featuresDescription: "자동 모니터링, 직접 업로드, 결과 및 알림 조회를 지원합니다.",
    featureOne: "자동 모니터링",
    featureOneDescription: "서버가 관리하는 Set별 데이터 재생과 추론 결과를 화면에 표시합니다.",
    featureTwo: "수동 파일 분석",
    featureTwoDescription: "공구 이미지와 센서 CSV를 업로드해 마모 예측을 요청할 수 있습니다.",
    featureThree: "마모 예측 결과",
    featureThreeDescription: "예측 마모량과 유형, 정상·경고·위험 상태를 함께 보여줍니다.",
    featureFour: "알림 및 이력 조회",
    featureFourDescription: "경고와 위험 알림을 확인하고 과거 알림의 저장된 예측 결과를 조회합니다.",
    githubNumber: "05 / GitHub 링크",
    githubTitle: "소스 코드",
    githubDescription: "프론트엔드·백엔드·모델팀의 소스 코드를 확인할 수 있습니다.",
    frontend: "Frontend",
    frontendDescription: "React · 화면 구성 · 모니터링 · 알림 조회",
    backend: "Backend",
    backendDescription: "FastAPI · 측정 데이터 · 예측 API · 모니터링 상태",
    ai: "AI 모델",
    aiDescription: "데이터 전처리 · 마모 예측 모델",
    repoAction: "GitHub에서 보기",
    footer: "AIM | CNC WearPoint · 공구 마모 예측 및 모니터링",
  },
  en: {
    languageAction: "한국어",
    brandSubtitle: "CNC WearPoint · Tool Wear Monitoring",
    topicNumber: "01 / TOPIC",
    topicLineOne: "CNC tool wear prediction",
    topicLineTwo: "and monitoring",
    topicLead: "Predict tool wear amount and type using machining images and sensor data. Review predictions and alert history on one screen.",
    dashboardAction: "Open monitoring dashboard",
    teamNumber: "02 / TEAM",
    teamTitle: "Team AIM",
    teamDescription: "The five members who built the project.",
    leader: "Team lead",
    member: "Team member",
    purposeNumber: "03 / PURPOSE",
    purposeTitle: "Tool condition and predictions in one place",
    purposeLead: "The service presents tool images, sensor signals, and prediction results together for easier review.",
    purposeOneTitle: "View the data",
    purposeOneDescription: "Review tool images and acoustic, vibration, and cutting-force sensor signals together.",
    purposeTwoTitle: "Understand wear",
    purposeTwoDescription: "Display predicted wear amount and type, along with normal, warning, and danger statuses.",
    purposeThreeTitle: "Review history",
    purposeThreeDescription: "Look up alerts and the prediction results saved at the time they occurred.",
    featuresNumber: "04 / FEATURES",
    featuresTitle: "Main features",
    featuresDescription: "Automated monitoring, file uploads, predictions, and alerts.",
    featureOne: "Automated monitoring",
    featureOneDescription: "Display server-coordinated playback of tool sets and their inference results.",
    featureTwo: "Manual file analysis",
    featureTwoDescription: "Upload a tool image and sensor CSV to request a wear prediction.",
    featureThree: "Wear prediction results",
    featureThreeDescription: "View predicted wear amount, wear type, and normal, warning, or danger status.",
    featureFour: "Alerts and history",
    featureFourDescription: "Review warnings, danger alerts, and saved historical prediction results.",
    githubNumber: "05 / GITHUB",
    githubTitle: "Source code",
    githubDescription: "Explore the frontend, backend, and AI model repositories.",
    frontend: "Frontend",
    frontendDescription: "React · User interface · Monitoring · Alerts",
    backend: "Backend",
    backendDescription: "FastAPI · Measurements · Prediction API · Monitoring state",
    ai: "AI Model",
    aiDescription: "Data preprocessing · Wear prediction models",
    repoAction: "View on GitHub",
    footer: "AIM | CNC WearPoint · Tool wear prediction and monitoring",
  },
};

const members = [
  { name: "구민석", lead: true },
  { name: "강지인" },
  { name: "김정훈" },
  { name: "신상석" },
  { name: "오성일" },
];

const repositories = [
  {
    key: "frontend",
    name: "cnc-wearpoint-frontend",
    href: "https://github.com/Goodee-AIM/cnc-wearpoint-frontend",
  },
  {
    key: "backend",
    name: "cnc-wearpoint-backend",
    href: "https://github.com/Goodee-AIM/cnc-wearpoint-backend",
  },
  {
    key: "ai",
    name: "cnc-wearpoint-AI",
    href: "https://github.com/Goodee-AIM/cnc-wearpoint-AI",
  },
];

export default function LandingPage() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage?.startsWith("en") ? "en" : "ko";
  const t = text[language];

  async function changeLanguage() {
    const next = language === "ko" ? "en" : "ko";
    await i18n.changeLanguage(next);
    localStorage.setItem("language", next);
  }

  return (
    <div className="wp-landing">
      <a className="wp-landing-skip" href="#wp-landing-main">
        {language === "ko" ? "본문으로 이동" : "Skip to content"}
      </a>
      <header className="wp-landing-header">
        <div className="wp-landing-header-inner">
          <a href="/" className="wp-landing-brand" aria-label="AIM">
            <strong>AIM</strong>
            <span>{t.brandSubtitle}</span>
          </a>
          <button type="button" className="wp-landing-language" onClick={changeLanguage}>
            {t.languageAction}
          </button>
        </div>
      </header>

      <main id="wp-landing-main" className="wp-landing-main">
        <section className="wp-landing-hero" id="topic" aria-labelledby="wp-landing-title">
          <div className="wp-landing-container wp-landing-hero-grid">
            <div>
              <p className="wp-landing-hero-index">{t.topicNumber}</p>
              <h1 id="wp-landing-title">
                {t.topicLineOne}
                <span>{t.topicLineTwo}</span>
              </h1>
              <p className="wp-landing-hero-lead">{t.topicLead}</p>
              <a href="/dashboard" className="wp-landing-primary">{t.dashboardAction}</a>
            </div>
          </div>
        </section>

        <section className="wp-landing-section wp-landing-team" id="team" aria-labelledby="wp-landing-team-title">
          <div className="wp-landing-container">
            <p className="wp-landing-section-index">{t.teamNumber}</p>
            <h2 id="wp-landing-team-title">{t.teamTitle}</h2>
            <p className="wp-landing-section-lead">{t.teamDescription}</p>
            <div className="wp-landing-team-grid">
              {members.map((person) => (
                <div className="wp-landing-member" key={person.name}>
                  <span className="wp-landing-member-role">{person.lead ? t.leader : t.member}</span>
                  <strong>{person.name}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="wp-landing-section wp-landing-purpose" id="purpose" aria-labelledby="wp-landing-purpose-title">
          <div className="wp-landing-container wp-landing-purpose-grid">
            <div>
              <p className="wp-landing-section-index">{t.purposeNumber}</p>
              <h2 id="wp-landing-purpose-title">{t.purposeTitle}</h2>
              <p className="wp-landing-section-lead">{t.purposeLead}</p>
            </div>
            <ol className="wp-landing-purpose-list">
              {[
                [t.purposeOneTitle, t.purposeOneDescription],
                [t.purposeTwoTitle, t.purposeTwoDescription],
                [t.purposeThreeTitle, t.purposeThreeDescription],
              ].map(([title, description], index) => (
                <li key={title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><strong>{title}</strong><p>{description}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="wp-landing-section wp-landing-features" id="features" aria-labelledby="wp-landing-features-title">
          <div className="wp-landing-container">
            <p className="wp-landing-section-index">{t.featuresNumber}</p>
            <h2 id="wp-landing-features-title">{t.featuresTitle}</h2>
            <p className="wp-landing-section-lead">{t.featuresDescription}</p>
            <div className="wp-landing-feature-grid">
              {[
                [t.featureOne, t.featureOneDescription],
                [t.featureTwo, t.featureTwoDescription],
                [t.featureThree, t.featureThreeDescription],
                [t.featureFour, t.featureFourDescription],
              ].map(([title, description], index) => (
                <article key={title} className="wp-landing-feature">
                  <span className="wp-landing-feature-number">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="wp-landing-section wp-landing-github" id="github" aria-labelledby="wp-landing-github-title">
          <div className="wp-landing-container">
            <p className="wp-landing-section-index">{t.githubNumber}</p>
            <h2 id="wp-landing-github-title">{t.githubTitle}</h2>
            <p className="wp-landing-section-lead">{t.githubDescription}</p>
            <div className="wp-landing-repo-grid">
              {repositories.map((repo) => (
                <a className="wp-landing-repo" key={repo.key} href={repo.href} target="_blank" rel="noopener noreferrer">
                  <div>
                    <span className="wp-landing-repo-type">{t[repo.key]}</span>
                    <strong>Goodee-AIM / {repo.name}</strong>
                    <p>{t[`${repo.key}Description`]}</p>
                  </div>
                  <span className="wp-landing-repo-action">{t.repoAction}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="wp-landing-footer">
        <div className="wp-landing-container">
          <span>{t.footer}</span>
          <span>Team AIM</span>
        </div>
      </footer>
    </div>
  );
}
