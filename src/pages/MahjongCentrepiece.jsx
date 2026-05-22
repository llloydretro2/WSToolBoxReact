/* eslint-disable react/prop-types */
import React, { useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useLocale } from "../contexts/LocaleContext";

const WIND_TON = 0;
const WIND_NAN = 1;
const WIND_SHAA = 2;
const WIND_PEI = 3;

const PLAYER_DEFAULT = 4;
const PLAYER_SANMA = 3;

const ROUND_TONPUUSEN = 1;
const ROUND_HANCHAN = 2;
const ROUND_IICHAN = 4;

const POSITIONS = ["bottom", "right", "top", "left"];
const WIND_KEYS = ["E", "S", "W", "N"];
const WIND_LABELS = {
	zh: ["东", "南", "西", "北"],
	en: ["E", "S", "W", "N"],
};

const POSITION_STYLE = {
	bottom: { gridArea: "bottom", rotation: 0 },
	right: { gridArea: "right", rotation: 270 },
	top: { gridArea: "top", rotation: 180 },
	left: { gridArea: "left", rotation: 90 },
};

function isStart({ round, wind, honba }) {
	return round === 1 && wind === WIND_TON && honba === 0;
}

function Seat({ position, label, isDealer, hidden }) {
	if (hidden || !position) return null;
	const { gridArea, rotation } = POSITION_STYLE[position];

	return (
		<div
			style={{ gridArea, transform: `rotate(${rotation}deg)` }}
			className="grid place-items-center self-center justify-self-center">
			<p
				className={[
					"m-0 select-none text-center font-black leading-none",
					"text-[clamp(4.8rem,20vmin,10rem)]",
					isDealer ? "text-[#ff5555]" : "text-current",
				].join(" ")}>
				{label}
			</p>
		</div>
	);
}

function OptionButton({ children, onClick, title }) {
	return (
		<button
			type="button"
			title={title}
			onClick={onClick}
			className="grid min-h-14 min-w-14 place-items-center border-0 bg-transparent p-1 text-[clamp(2rem,6vmin,3.5rem)] font-bold leading-none text-[#aaaaaa] shadow-none outline-none">
			{children}
		</button>
	);
}

function PlayerCountButton({ players }) {
	return (
		<span>
			<span className={players === PLAYER_SANMA ? "font-black text-[#55dd55]" : ""}>3</span>
			<span className={players === PLAYER_DEFAULT ? "font-black text-[#55dd55]" : ""}>4</span>
		</span>
	);
}

function GameTypeButton({ maxRounds, locale }) {
	const labels = locale === "zh"
		? [
				{ value: ROUND_TONPUUSEN, label: "东" },
				{ value: ROUND_HANCHAN, label: "半" },
				{ value: ROUND_IICHAN, label: "一" },
			]
		: [
				{ value: ROUND_TONPUUSEN, label: "T" },
				{ value: ROUND_HANCHAN, label: "H" },
				{ value: ROUND_IICHAN, label: "I" },
			];

	return (
		<span>
			{labels.map((item) => (
				<span
					key={item.value}
					className={maxRounds === item.value ? "font-black text-[#55dd55]" : ""}>
					{item.label}
				</span>
			))}
		</span>
	);
}

export default function MahjongCentrepiece() {
	const { locale, t } = useLocale();
	const windLabels = WIND_LABELS[locale] ?? WIND_LABELS.en;
	const [darkMode, setDarkMode] = useState(false);
	const [players, setPlayers] = useState(PLAYER_DEFAULT);
	const [maxRounds, setMaxRounds] = useState(ROUND_HANCHAN);
	const [round, setRound] = useState(1);
	const [wind, setWind] = useState(WIND_TON);
	const [honba, setHonba] = useState(0);
	const start = isStart({ round, wind, honba });

	const seatPositions = useMemo(() => {
		const positions = POSITIONS.slice(0, players);
		for (let i = 0; i < round - 1; i += 1) {
			positions.push(positions.shift());
		}
		return positions;
	}, [players, round]);

	const reset = () => {
		setRound(1);
		setWind(WIND_TON);
		setHonba(0);
	};

	const nextRound = () => {
		if (round === players) {
			setRound(1);
			setWind((prev) => (prev + 1) % maxRounds);
			setHonba(0);
			return;
		}
		setRound((prev) => prev + 1);
		setHonba(0);
	};

	const nextHonba = () => {
		setHonba((prev) => prev + 1);
	};

	const togglePlayerCount = () => {
		if (!start) {
			reset();
			return;
		}
		setPlayers((prev) => (prev === PLAYER_DEFAULT ? PLAYER_SANMA : PLAYER_DEFAULT));
	};

	const toggleGameType = () => {
		if (!start) {
			reset();
			return;
		}
		setMaxRounds((prev) => {
			if (prev === ROUND_TONPUUSEN) return ROUND_HANCHAN;
			if (prev === ROUND_HANCHAN) return ROUND_IICHAN;
			return ROUND_TONPUUSEN;
		});
	};

	const text = darkMode ? "#e8e6e3" : "#333333";
	const navbarOffset = "clamp(64px, 9dvh, 80px)";

	return (
		<div
			className="mahjong-black-theme fixed inset-x-0 bottom-0 overflow-hidden"
			style={{
				top: navbarOffset,
				backgroundColor: "transparent",
				color: text,
			}}>
			<div
				className="grid h-full w-full overflow-hidden"
				style={{
					gridTemplateAreas: `
						"darkmode top playercount"
						"left center right"
						"gametype bottom reset"
					`,
					gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr)",
					gridTemplateRows: "minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr)",
				}}>
				<Seat
					position={seatPositions[0]}
					label={windLabels[WIND_TON]}
					isDealer
				/>
				<Seat
					position={seatPositions[1]}
					label={windLabels[WIND_NAN]}
				/>
				<Seat
					position={seatPositions[2]}
					label={windLabels[WIND_SHAA]}
				/>
				<Seat
					position={seatPositions[3]}
					label={windLabels[WIND_PEI]}
					hidden={players === PLAYER_SANMA}
				/>

				<div
					style={{ gridArea: "center" }}
					className="self-center justify-self-center text-center">
					<button
						type="button"
						onClick={nextRound}
						className="block border-0 bg-transparent p-0 font-black leading-none text-[#5555ff]"
						style={{ fontSize: "clamp(3.8rem, 10vmin, 7rem)" }}>
						<span>{windLabels[wind]}</span>
						<span>{round}</span>
						<span>{locale === "zh" ? "局" : ""}</span>
					</button>
					<button
						type="button"
						onClick={nextHonba}
						className="mt-1 block border-0 bg-transparent p-0 leading-none text-current"
						style={{ fontSize: "clamp(3rem, 8vmin, 5.5rem)" }}>
						<span>{honba}</span>
						<span>{locale === "zh" ? "本场" : "H"}</span>
					</button>
				</div>

				<div style={{ gridArea: "darkmode" }} className="self-center justify-self-center">
					<OptionButton
						title={darkMode ? "Light mode" : "Dark mode"}
						onClick={() => setDarkMode((prev) => !prev)}>
						{darkMode ? <Sun size="1em" /> : <Moon size="1em" />}
					</OptionButton>
				</div>

				<div style={{ gridArea: "playercount" }} className="self-center justify-self-center">
					<OptionButton
						title={t("mahjongCentrepiece.labels.playerCount")}
						onClick={togglePlayerCount}>
						{start ? <PlayerCountButton players={players} /> : "↻"}
					</OptionButton>
				</div>

				<div style={{ gridArea: "gametype" }} className="self-center justify-self-center">
					<OptionButton
						title={t("mahjongCentrepiece.labels.gameType")}
						onClick={toggleGameType}>
						{start ? <GameTypeButton maxRounds={maxRounds} locale={locale} /> : "↻"}
					</OptionButton>
				</div>

				<div style={{ gridArea: "reset" }} className="self-center justify-self-center">
					<OptionButton title={t("mahjongCentrepiece.actions.reset")} onClick={reset}>
						↻
					</OptionButton>
				</div>
			</div>
		</div>
	);
}
