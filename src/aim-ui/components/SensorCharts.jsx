import { useTranslation } from "react-i18next";

/** samples: {time:number,value:number}[], time/cursor are seconds on the same timeline. */
export function SensorChart({
                                channel,
                                cursorSeconds,
                            }) {
    const { t } = useTranslation();

    const end = Number.isFinite(cursorSeconds)
        ? cursorSeconds
        : 0;

    const start = end - 5;

    const points = (channel.samples || [])
        .filter(
            (p) =>
                Number.isFinite(p.time) &&
                Number.isFinite(p.value) &&
                p.time >= start &&
                p.time <= end,
        )
        .sort((a, b) => a.time - b.time);

    const label = channel.labelKey
        ? t(`sensor.channels.${channel.labelKey}`)
        : channel.label || channel.id;

    // 원시 파형을 유지하며 기존 그래프와 같은 최솟값·최댓값 범위로 표시합니다.
    // 현재 5초 구간 대신 센서 파일 전체 범위를 사용합니다.
const min = channel.yRange?.min ?? -1;
const max = channel.yRange?.max ?? 1;

    const path = points
        .map(
            (p, i) =>
                `${i ? "L" : "M"}${(
                    28 +
                    ((p.time - start) / 5) * 516
                ).toFixed(2)},${(
                    min === max
                        ? 85
                        : 150 -
                        ((p.value - min) /
                            (max - min)) *
                        130
                ).toFixed(2)}`,
        )
        .join(" ");

    const timelineLabels = [
        "−5 s",
        "−4 s",
        "−3 s",
        "−2 s",
        "−1 s",
        t("common.now"),
    ];

    return (
        <article className="card sensor">
            <div className="sensor-heading">
                <h2>
                    {label}
                </h2>
            </div>

            <svg
                className="chart"
                viewBox="0 0 560 170"
                preserveAspectRatio="none"
                role="img"
                aria-label={t(
                    "sensor.recentWaveform",
                    { label },
                )}
            >
                <path
                    d="M28 20H548 M28 52H548 M28 85H548 M28 118H548 M28 150H548"
                    stroke="#e8edf5"
                    strokeDasharray="4 4"
                    fill="none"
                />

                {path && (
                    <path
                        className="signal"
                        d={path}
                    />
                )}
            </svg>

            {!points.length && (
                <span className="chart-empty">
          {t("sensor.waiting")}
        </span>
            )}

            <div
                className="chart-bottom"
                aria-label={t(
                    "sensor.recentFiveSeconds",
                )}
            >
                {timelineLabels.map((item) => (
                    <span key={item}>
            {item}
          </span>
                ))}
            </div>
        </article>
    );
}

export default function SensorCharts({
                                         channels = [],
                                         cursorSeconds = 0,
                                     }) {
    return (
        <div className="sensor-grid">
            {channels.map((channel) => (
                <SensorChart
                    key={channel.id}
                    channel={channel}
                    cursorSeconds={cursorSeconds}
                />
            ))}
        </div>
    );
}