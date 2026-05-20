/* eslint-disable react/prop-types */
import React, { useMemo, useState } from "react";
import { useLocale } from "../contexts/LocaleContext";

const WIND_KEYS = ["E", "S", "W", "N"];
const WIND_LABELS = {
	zh: { E: "東", S: "南", W: "西", N: "北" },
	en: { E: "E", S: "S", W: "W", N: "N" },
};

const ROUND_MODE_OPTIONS = {
	east: ["E"],
	half: ["E", "S"],
	full: ["E", "S", "W", "N"],
};

const GRID_AREAS_FOUR = `
  ". top ."
  "left center right"
  ". bottom ."
`;

const GRID_AREAS_THREE = `
  ". top ."
  "left center right"
  ". . ."
`;

function cycle(values, current) {
	const idx = values.indexOf(current);
	return values[(idx + 1) % values.length];
}

function SeatWind({ label, rotation, hidden = false }) {
	if (hidden) return null;
	return (
		<div
			style={{ transform: `rotate(${rotation}deg)` }}
			className="flex h-full w-full items-center justify-center">
			<span className="select-none text-black text-[clamp(52px,12vmin,120px)] font-black leading-none">
				{label}
			</span>
		</div>
	);
}

export default function MahjongCentrepiece() {
	const { locale, t } = useLocale();
	const i18nWind = WIND_LABELS[locale] ?? WIND_LABELS.en;

	const [tableMode, setTableMode] = useState("four");
	const [roundMode, setRoundMode] = useState("half");
	const [windIndex, setWindIndex] = useState(0);
	const [roundNumber, setRoundNumber] = useState(1);
	const [honba, setHonba] = useState(0);

	const activeWinds = ROUND_MODE_OPTIONS[roundMode];
	const maxRound = tableMode === "three" ? 3 : 4;

	const centerWind = activeWinds[windIndex];
	const centerWindLabel = i18nWind[centerWind];
	const roundSuffix = locale === "zh" ? "局" : "";
	const honbaSuffix = locale === "zh" ? "本场" : "H";

	const seats = useMemo(() => {
		const base = ["E", "S", "W", "N"];
		const offset = Math.max(0, roundNumber - 1);
		const rotated = base.slice(offset).concat(base.slice(0, offset));
		return tableMode === "three" ? rotated.slice(0, 3) : rotated;
	}, [roundNumber, tableMode]);

	const nextRound = () => {
		if (roundNumber < maxRound) {
			setRoundNumber((prev) => prev + 1);
			setHonba(0);
			return;
		}
		setRoundNumber(1);
		setHonba(0);
		setWindIndex((prev) => (prev + 1) % activeWinds.length);
	};

	const nextHonba = () => setHonba((prev) => prev + 1);

	const reset = () => {
		setWindIndex(0);
		setRoundNumber(1);
		setHonba(0);
	};

	const boardAreaStyle = {
		gridTemplateAreas: tableMode === "four" ? GRID_AREAS_FOUR : GRID_AREAS_THREE,
		gridTemplateColumns: "1fr minmax(0,1.4fr) 1fr",
		gridTemplateRows: "1fr minmax(0,1.4fr) 1fr",
	};

	return (
		<div className="mahjong-black-theme fixed inset-0 z-40 bg-transparent text-black">
			<div className="grid h-[100dvh] w-[100vw] place-items-center overflow-hidden px-3 pb-3 pt-[72px] landscape:p-3">
				<div className="relative h-full w-full">
					<div
						className="absolute left-1/2 top-1/2 grid aspect-square max-h-full max-w-full -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-black bg-white/62 p-2 shadow-[0_16px_46px_rgba(0,0,0,0.12)] backdrop-blur-md"
						style={{
							...boardAreaStyle,
							width: "min(calc(100vw - 1.5rem), calc(100dvh - 5.5rem))",
						}}>
						<div style={{ gridArea: "top" }}>
							<SeatWind label={i18nWind[seats[2 % seats.length]]} rotation={180} hidden={tableMode === "three"} />
						</div>
						<div style={{ gridArea: "left" }}>
							<SeatWind label={i18nWind[seats[1]]} rotation={90} />
						</div>
						<div style={{ gridArea: "right" }}>
							<SeatWind label={i18nWind[seats[tableMode === "three" ? 2 : 3]]} rotation={270} />
						</div>
						<div style={{ gridArea: "bottom" }}>
							<SeatWind label={i18nWind[seats[0]]} rotation={0} hidden={tableMode === "three"} />
						</div>

						<div
							style={{ gridArea: "center" }}
							className="flex flex-col items-center justify-center rounded-xl border border-black bg-white/82 px-2 py-4 text-center">
							<button
								type="button"
								onClick={nextRound}
								className="select-none text-[clamp(42px,13vmin,116px)] font-black leading-none text-blue-700 transition-colors hover:text-black">
								{centerWindLabel}
								{roundNumber}
								{roundSuffix}
							</button>
							<button
								type="button"
								onClick={nextHonba}
								className="mt-2 select-none text-[clamp(26px,7vmin,64px)] font-bold leading-none transition-colors hover:text-blue-700">
								{honba}
								{honbaSuffix}
							</button>
						</div>
					</div>

					<div className="absolute right-2 top-[82px] flex flex-col gap-2 landscape:top-2">
						<button
							type="button"
							onClick={() => setTableMode((prev) => (prev === "four" ? "three" : "four"))}
							className="min-w-20 rounded-md border border-black bg-white/82 px-3 py-2 text-sm font-bold shadow-sm backdrop-blur-sm transition-colors hover:bg-black hover:text-white">
							{t(`mahjongCentrepiece.modes.${tableMode}`)}
						</button>
						<button
							type="button"
							onClick={() => setRoundMode((prev) => cycle(["east", "half", "full"], prev))}
							className="min-w-20 rounded-md border border-black bg-white/82 px-3 py-2 text-sm font-bold shadow-sm backdrop-blur-sm transition-colors hover:bg-black hover:text-white">
							{t(`mahjongCentrepiece.lengths.${roundMode}`)}
						</button>
						<button
							type="button"
							onClick={reset}
							className="min-w-20 rounded-md border border-black bg-white/82 px-3 py-2 text-sm font-bold shadow-sm backdrop-blur-sm transition-colors hover:bg-black hover:text-white">
							{t("mahjongCentrepiece.actions.reset")}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
