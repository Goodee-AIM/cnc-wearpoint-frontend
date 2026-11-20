import { useTranslation } from "react-i18next";
import { useState } from "react";

/** samples: {time:number,value:number}[], time/cursor are seconds on the same timeline. */
export function SensorChart({
                                channel,
                                cursorSeconds,
                            }) {
    const { t } = useTranslation();
    const [cuttingHovered, setCuttingHovered] = useState(false);

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
    // 현재 화면에 보이는 절삭 구간만 계산합니다.
const [cutStart, cutEnd] = channel.changeMarkers ?? [];

const visibleCutStart = Math.max(start, cutStart);
const visibleCutEnd = Math.min(end, cutEnd);

const showCuttingArea =
    points.length > 0 &&
    Number.isFinite(cutStart) &&
    Number.isFinite(cutEnd) &&
    cutEnd > cutStart &&
    visibleCutEnd > visibleCutStart;

const cuttingX =
    28 + ((visibleCutStart - start) / 5) * 516;

const cuttingWidth =
    ((visibleCutEnd - visibleCutStart) / 5) * 516;
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
    aria-label={t("sensor.recentWaveform", { label })}
>
    {/* 파형 뒤에 옅은 빨간 배경 */}
    {showCuttingArea && (
    <rect
        x={cuttingX}
        y="20"
        width={cuttingWidth}
        height="130"
        style={{
            fill: "#ef2929",
            fillOpacity: 0.045,
            stroke: "none",
            pointerEvents: "none",
        }}
    />
)}

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

    {/* 절삭 시작·종료 경계선 */}
    {points.length > 0 &&
        (channel.changeMarkers ?? [])
            .filter(
                (time) =>
                    Number.isFinite(time) &&
                    time >= start &&
                    time <= end,
            )
            .map((time) => {
                const x =
                    28 + ((time - start) / 5) * 516;

                return (
                    <line
                        key={time}
                        x1={x}
                        x2={x}
                        y1="20"
                        y2="150"
                        stroke="#ef2929"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                        pointerEvents="none"
                    />
                );
            })}

    {/* 파형 위에서도 마우스 안내가 나오도록 투명 영역 배치 */}
    {showCuttingArea && (
    <rect
        x={cuttingX}
        y="20"
        width={cuttingWidth}
        height="130"
        style={{
            fill: "transparent",
            stroke: "none",
            pointerEvents: "all",
        }}
        onPointerEnter={() => setCuttingHovered(true)}
        onPointerLeave={() => setCuttingHovered(false)}
    />
)}
</svg>
{showCuttingArea && cuttingHovered && (
    <div className="cutting-area-tooltip" role="tooltip">
        실제 절삭 구간
    </div>
)}

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
