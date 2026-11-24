import { useTranslation } from "react-i18next";
import "../styles/landing.css";

// Static project introduction only. Dashboard polling and analysis remain on /dashboard.
const text = {
  ko: {
    languageAction: "English",
    topicTitle: "AIM (AI-driven Maintenance)",
    topicDescription: "AI를 활용해 공구 이미지와 센서 데이터를 분석하고,\n마모 상태를 예측·모니터링합니다.",
    heroImageAlt: "대시보드 대표 이미지가 들어갈 영역",
    dashboardAction: "모니터링 화면 보기",
    teamTitle: "AIM 팀원",
    footerTeam: "AIM 팀",
    leader: "팀장",
    member: "팀원",
    purposeImageAlt: "공구 이미지 예시가 들어갈 영역",
    sensorImageAlt: "센서 그래프 예시가 들어갈 영역",
    purposeTitle: "이미지·센서 융합 분석",
    purposeSummaryTitle: "공구 마모 상태를 한눈에 파악",
    purposeSummaryDescription: "공구 이미지와 센서 파형을 함께 분석해 마모 상태와 유형을 확인합니다.",
    purposeOneTitle: "마모 상태 파악",
    purposeOneDescription: "마모량과 마모 유형을 표시합니다.",
    purposeTwoTitle: "데이터 확인",
    purposeTwoDescription: "이미지와 센서 신호를 함께 확인합니다.",
    featuresTitle: "주요 기능",
    featureOne: "자동 모니터링",
    featureOneDescription: "Set별 분석 결과를 표시합니다.",
    featureTwo: "수동 파일 분석",
    featureTwoDescription: "이미지·센서 CSV를 분석합니다.",
    featureThree: "기록 조회",
    featureThreeDescription: "알림과 저장된 분석 결과를 조회합니다.",
    featureFour: "마모 예측 결과",
    featureFourDescription: "마모량·유형·상태를 보여줍니다.",
    featureFive: "알림 및 이력 조회",
    featureFiveDescription: "알림과 이전 결과를 확인합니다.",
    featureSix: "상태 구분",
    featureSixDescription: "정상·경고·위험 상태를 구분해 확인합니다.",
    githubTitle: "소스 코드",
    orgDescription: "프론트엔드 · 백엔드 · 모델 저장소",
    repoAction: "GitHub에서 보기",
    footer: "AIM | CNC WearPoint · 공구 마모 예측 및 모니터링",
  },
  en: {
    languageAction: "한국어",
    topicTitle: "AIM (AI-driven Maintenance)",
    topicDescription: "Analyze tool images and sensor data with AI to predict\nand monitor tool wear.",
    heroImageAlt: "Area reserved for the dashboard preview image",
    dashboardAction: "Open monitoring dashboard",
    teamTitle: "Team AIM",
    footerTeam: "Team AIM",
    leader: "Team lead",
    member: "Team member",
    purposeTitle: "Analyze tool condition with images and sensor data",
    purposeImageAlt: "Area reserved for a tool image example",
    sensorImageAlt: "Area reserved for a sensor graph example",
    purposeSummaryTitle: "Understand tool wear through images and sensor graphs",
    purposeSummaryDescription: "Review tool images and sensor signals together.",
    purposeOneTitle: "Review the data",
    purposeOneDescription: "View tool images and sensor signals together.",
    purposeTwoTitle: "Understand tool wear",
    purposeTwoDescription: "Show wear amount and wear type.",
    featuresTitle: "Main features",
    featureOne: "Automated monitoring",
    featureOneDescription: "See analysis results for each Set.",
    featureTwo: "Manual file analysis",
    featureTwoDescription: "Analyze images and sensor CSV files.",
    featureThree: "Record lookup",
    featureThreeDescription: "Review alerts and saved analysis results.",
    featureFour: "Wear prediction results",
    featureFourDescription: "View wear amount, type, and status.",
    featureFive: "Alerts and history",
    featureFiveDescription: "Review alerts and previous results.",
    featureSix: "Status levels",
    featureSixDescription: "Distinguish normal, warning, and danger.",
    githubTitle: "Source code",
    orgDescription: "Frontend · Backend · Model repositories",
    repoAction: "View on GitHub",
    footer: "AIM | CNC WearPoint · Tool wear prediction and monitoring",
  },
};

const members = [
  { ko: "구민석", en: "Koo Min-seok", lead: true },
  { ko: "강지인", en: "Kang Ji-in" },
  { ko: "김정훈", en: "Kim Jeong-hoon" },
  { ko: "신상석", en: "Shin Sang-seok" },
  { ko: "오성일", en: "Oh-sung-il" },
];

export default function LandingPage() {
  const { i18n, t: translate } = useTranslation();
  const language = i18n.resolvedLanguage?.startsWith("en") ? "en" : "ko";
  const t = text[language];

  async function changeLanguage() {
    const next = language === "ko" ? "en" : "ko";
    await i18n.changeLanguage(next);
    localStorage.setItem("language", next);
  }

  const features = [
    [t.featureOne, t.featureOneDescription],
    [t.featureTwo, t.featureTwoDescription],
    [t.featureThree, t.featureThreeDescription],
    [t.featureFour, t.featureFourDescription],
    [t.featureFive, t.featureFiveDescription],
    [t.featureSix, t.featureSixDescription],
  ];

  return (
    <div className="wp-landing" lang={language}>
      <a className="wp-landing-skip" href="#wp-landing-main">
        {language === "ko" ? "본문으로 이동" : "Skip to content"}
      </a>

      <header className="wp-landing-header">
        <div className="wp-landing-header-inner">
          <a
            className="brand"
            href="/"
            aria-label={language === "ko" ? "AIM 프로젝트 소개로 이동" : "Go to AIM project introduction"}
          >
            <span className="logo" translate="no">AIM</span>
            <span className="brand-separator" aria-hidden="true">|</span>
            <span className="brand-name">{translate("app.title")}</span>
          </a>
          <button type="button" className="wp-landing-language" onClick={changeLanguage}>
            {t.languageAction}
          </button>
        </div>
      </header>

      <main id="wp-landing-main" className="wp-landing-main">
        <section className="wp-landing-hero" id="topic" aria-labelledby="wp-landing-title">
          <div className="wp-landing-hero-copy">
            <h1 id="wp-landing-title">{t.topicTitle}</h1>
            <p className="wp-landing-hero-description">{t.topicDescription}</p>
            <a href="/dashboard" className="wp-landing-primary">
              {t.dashboardAction}<span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="wp-landing-hero-frame">
  <img
    className="wp-landing-hero-media"
    src="/aim-ui/landing/dashboard-preview.png"
    alt={t.heroImageAlt}
  />
</div>
        </section>

        <section
  className="wp-landing-section wp-landing-purpose"
  id="purpose"
  aria-labelledby="wp-landing-purpose-title"
>
  <h2 id="wp-landing-purpose-title">{t.purposeTitle}</h2>

  <div className="wp-landing-purpose-content">
    <div className="wp-landing-purpose-images">
      <div className="wp-landing-purpose-image">
        <img
          src="/aim-ui/landing/tool-image-sample.png"
          alt={t.purposeImageAlt}
        />
      </div>

      <div className="wp-landing-purpose-image">
        <img
          src="/aim-ui/landing/sensor-graph-sample.png"
          alt={t.sensorImageAlt}
        />
      </div>
    </div>

    <div className="wp-landing-purpose-summary">
      <h3>{t.purposeSummaryTitle}</h3>
      <p>{t.purposeSummaryDescription}</p>
    </div>
  </div>
</section>

        <section className="wp-landing-section wp-landing-features" id="features" aria-labelledby="wp-landing-features-title">
          <h2 id="wp-landing-features-title">{t.featuresTitle}</h2>
          <div className="wp-landing-feature-grid">
            {features.map(([title, description]) => (
              <article key={title} className="wp-landing-feature">
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="wp-landing-section wp-landing-github" id="github" aria-labelledby="wp-landing-github-title">
          <h2 id="wp-landing-github-title">{t.githubTitle}</h2>
          <a className="wp-landing-repo" href="https://github.com/Goodee-AIM/" target="_blank" rel="noopener noreferrer">
            <span className="wp-landing-repo-info">
              <strong>github.com/Goodee-AIM</strong>
              <span>{t.orgDescription}</span>
            </span>
            <span className="wp-landing-repo-action">{t.repoAction}<span aria-hidden="true">↗</span></span>
          </a>
        </section>

        <section className="wp-landing-section wp-landing-team" id="team" aria-labelledby="wp-landing-team-title">
          <h2 id="wp-landing-team-title">{t.teamTitle}</h2>
          <div className="wp-landing-team-grid">
            {members.map((person) => (
              <div className="wp-landing-member" key={person.ko}>
                <span className="wp-landing-member-role">{person.lead ? t.leader : t.member}</span>
                <strong>{person[language]}</strong>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="wp-landing-footer">
        <div className="wp-landing-footer-inner">
          <span>{t.footer}</span>
          <span>{t.footerTeam}</span>
        </div>
      </footer>
    </div>
  );
}
