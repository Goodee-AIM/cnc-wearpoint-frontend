import { useTranslation } from "react-i18next";
import "../styles/landing.css";

// Static project introduction only. No backend polling or model invocation occurs here.
const text = {
  ko: {
    languageAction: "English",
    topicTitle: "공구 마모 예측과 모니터링을 하나로",
    dashboardAction: "모니터링 화면 보기",
    teamNumber: "팀원",
    teamTitle: "AIM 팀원",
    teamDescription: "AIM 팀의 프로젝트 참여 인원입니다.",
    footerTeam: "AIM 팀",
    leader: "팀장",
    member: "팀원",
    purposeNumber: "서비스 목적",
    purposeTitle: "이미지와 센서 데이터로 공구 상태를 분석하다",
    purposeLead: "공구 이미지, 센서 신호, 마모 예측 결과를 연결해 상태를 확인하기 쉽도록 구성했습니다.",
    purposeOneTitle: "데이터 확인",
    purposeOneDescription: "이미지와 센서 신호를 함께 확인합니다.",
    purposeTwoTitle: "마모 상태 파악",
    purposeTwoDescription: "마모량과 마모 유형을 표시합니다.",
    purposeThreeTitle: "기록 조회",
    purposeThreeDescription: "알림과 저장된 분석 결과를 조회합니다.",
    purposeFourTitle: "상태 구분",
    purposeFourDescription: "정상·경고·위험 상태를 구분해 확인합니다.",
    featuresNumber: "주요 기능",
    featuresTitle: "주요 기능",
    featuresDescription: "자동 모니터링, 직접 업로드, 결과 및 알림 조회를 지원합니다.",
    featureOne: "자동 모니터링",
    featureOneDescription: "Set별 분석 결과를 표시합니다.",
    featureTwo: "수동 파일 분석",
    featureTwoDescription: "이미지·센서 CSV를 분석합니다.",
    featureThree: "마모 예측 결과",
    featureThreeDescription: "마모량·유형·상태를 보여줍니다.",
    featureFour: "알림 및 이력 조회",
    featureFourDescription: "알림과 이전 결과를 확인합니다.",
    githubNumber: "GitHub",
    githubTitle: "소스 코드",
    githubDescription: "AIM 팀의 프로젝트 저장소를 한곳에서 확인할 수 있습니다.",
    orgLabel: "AIM 팀 GitHub",
    orgDescription: "프론트엔드 · 백엔드 · 모델 저장소",
    repoAction: "GitHub에서 보기",
    footer: "AIM | CNC WearPoint · 공구 마모 예측 및 모니터링",
  },
  en: {
    languageAction: "한국어",
    topicTitle: "CNC tool wear prediction and monitoring",
    dashboardAction: "Open monitoring dashboard",
    teamNumber: "TEAM",
    teamTitle: "Team AIM",
    teamDescription: "The five members who built the project.",
    footerTeam: "Team AIM",
    leader: "Team lead",
    member: "Team member",
    purposeNumber: "PURPOSE",
    purposeTitle: "Tool condition and predictions in one place",
    purposeLead: "The service presents tool images, sensor signals, and prediction results together for easier review.",
    purposeOneTitle: "View the data",
    purposeOneDescription: "View tool images and sensor signals.",
    purposeTwoTitle: "Understand wear",
    purposeTwoDescription: "Show predicted wear amount and type.",
    purposeThreeTitle: "Review history",
    purposeThreeDescription: "Review alerts and saved results.",
    purposeFourTitle: "Status levels",
    purposeFourDescription: "Distinguish normal, warning, and danger.",
    featuresNumber: "FEATURES",
    featuresTitle: "Main features",
    featuresDescription: "Automated monitoring, file uploads, predictions, and alerts.",
    featureOne: "Automated monitoring",
    featureOneDescription: "See results for each tool set.",
    featureTwo: "Manual file analysis",
    featureTwoDescription: "Analyze an image and sensor CSV.",
    featureThree: "Wear prediction results",
    featureThreeDescription: "View wear amount, type, and status.",
    featureFour: "Alerts and history",
    featureFourDescription: "Review alerts and past results.",
    githubNumber: "GITHUB",
    githubTitle: "Source code",
    githubDescription: "Browse the AIM team repositories in one place.",
    orgLabel: "AIM Team GitHub",
    orgDescription: "Frontend · Backend · Model repositories",
    repoAction: "View on GitHub",
    footer: "AIM | CNC WearPoint · Tool wear prediction and monitoring",
  },
};

// English names are display romanizations; confirm preferred spellings with each member.
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
          <div className="wp-landing-container wp-landing-hero-grid">
            <div>
              <h1 id="wp-landing-title">{t.topicTitle}</h1>
              <a href="/dashboard" className="wp-landing-primary">{t.dashboardAction}</a>
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
                [t.purposeFourTitle, t.purposeFourDescription],
              ].map(([title, description]) => (
                <li key={title}>
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
              ].map(([title, description]) => (
                <article key={title} className="wp-landing-feature">
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
              <a
                className="wp-landing-repo"
                href="https://github.com/Goodee-AIM/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div>
                  <span className="wp-landing-repo-type">{t.orgLabel}</span>
                  <strong>github.com/Goodee-AIM</strong>
                  <p>{t.orgDescription}</p>
                </div>
                <span className="wp-landing-repo-action">{t.repoAction}</span>
              </a>
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
                <div className="wp-landing-member" key={person.ko}>
                  <span className="wp-landing-member-role">{person.lead ? t.leader : t.member}</span>
                  <strong>{person[language]}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <footer className="wp-landing-footer">
        <div className="wp-landing-container">
          <span>{t.footer}</span>
          <span>{t.footerTeam}</span>
        </div>
      </footer>
    </div>
  );
}
