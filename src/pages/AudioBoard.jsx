import React, { useEffect, useState, useRef } from "react";
import { useLocale } from "../contexts/LocaleContext";
import {
	Play, Pause, SkipBack, SkipForward,
	Repeat, Volume2, VolumeX, Music,
} from "lucide-react";
import { apiRequest } from "../utils/api.js";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://api.cardtoolbox.org";

function friendlyName(filename) {
	return decodeURIComponent(filename).replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").trim();
}
function fileFormat(filename) {
	const ext = filename.split(".").pop();
	return ext ? ext.toUpperCase() : "AUDIO";
}
function formatTime(sec) {
	if (!sec || isNaN(sec) || !isFinite(sec)) return "0:00";
	const m = Math.floor(sec / 60);
	const s = Math.floor(sec % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

// EQ animation bars
function EqBars() {
	return (
		<div className="flex items-end gap-[2.5px] h-4 shrink-0">
			{["0s", "0.18s", "0.09s", "0.27s"].map((delay, i) => (
				<div key={i} className="w-[3px] rounded-sm bg-[var(--text-muted)]"
					style={{ animation: `eq-bounce 0.55s ${delay} ease-in-out infinite alternate` }} />
			))}
		</div>
	);
}

// Range input (progress / volume)
function RangeInput({ value, min = 0, max = 1, step = 0.01, onChange, onMouseDown, onTouchStart, className = "" }) {
	const pct = max > 0 ? ((value - min) / (max - min)) * 100 : 0;
	return (
		<input
			type="range"
			value={value}
			min={min}
			max={max}
			step={step}
			onChange={(e) => onChange(parseFloat(e.target.value))}
			onMouseDown={onMouseDown}
			onTouchStart={onTouchStart}
			className={`ws-range ${className}`}
			style={{ "--pct": `${pct}%` }}
		/>
	);
}

export default function AudioBoardV2() {
	const { t } = useLocale();
	const [tracks, setTracks] = useState([]);
	const [loading, setLoading] = useState(true);
	const [trackDurations, setTrackDurations] = useState({});
	const [playingIdx, setPlayingIdx] = useState(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(0.8);
	const [loop, setLoop] = useState(true);

	const audioRef = useRef(null);
	const isSeekingRef = useRef(false);
	const volumeRef = useRef(0.8);
	const loopRef = useRef(true);

	// Fetch tracks
	useEffect(() => {
		let mounted = true;
		apiRequest("/api/audios")
			.then((r) => r.json())
			.then((list) => { if (mounted && Array.isArray(list)) setTracks(list); })
			.catch(() => {})
			.finally(() => { if (mounted) setLoading(false); });
		return () => {
			mounted = false;
			if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
		};
	}, []);

	// Prefetch durations
	useEffect(() => {
		if (!tracks.length) return;
		const probes = [];
		tracks.forEach((track) => {
			const a = new Audio();
			a.preload = "metadata";
			a.onloadedmetadata = () => {
				const d = isFinite(a.duration) ? a.duration : null;
				setTrackDurations((prev) => ({ ...prev, [track.name]: d }));
				a.src = "";
			};
			a.onerror = () => { a.src = ""; };
			a.src = `${BACKEND_URL}${track.url}`;
			probes.push(a);
		});
		return () => probes.forEach((a) => { a.src = ""; });
	}, [tracks]);

	// Playback
	const loadAndPlay = (idx) => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.ontimeupdate = null;
			audioRef.current.onloadedmetadata = null;
			audioRef.current.onplay = null;
			audioRef.current.onpause = null;
			audioRef.current.onended = null;
		}
		const track = tracks[idx];
		const audio = new Audio(`${BACKEND_URL}${track.url}`);
		audio.volume = volumeRef.current;
		audio.loop = loopRef.current;
		audio.ontimeupdate = () => { if (!isSeekingRef.current) setCurrentTime(audio.currentTime); };
		audio.onloadedmetadata = () => setDuration(audio.duration);
		audio.onplay = () => setIsPlaying(true);
		audio.onpause = () => setIsPlaying(false);
		audio.onended = () => { if (!loopRef.current) { setIsPlaying(false); setCurrentTime(0); } };
		audioRef.current = audio;
		setPlayingIdx(idx);
		setCurrentTime(0);
		setDuration(0);
		setIsPlaying(true);
		audio.play().catch(() => {});
	};

	const handleTrackClick = (idx) => {
		if (playingIdx === idx) {
			if (isPlaying) audioRef.current.pause();
			else audioRef.current.play().catch(() => {});
			return;
		}
		loadAndPlay(idx);
	};

	const handlePrev = () => { if (playingIdx !== null && tracks.length) loadAndPlay((playingIdx - 1 + tracks.length) % tracks.length); };
	const handleNext = () => { if (playingIdx !== null && tracks.length) loadAndPlay((playingIdx + 1) % tracks.length); };
	const handleTogglePlay = () => {
		if (!audioRef.current) return;
		if (isPlaying) audioRef.current.pause();
		else audioRef.current.play().catch(() => {});
	};
	const handleSeekChange = (val) => setCurrentTime(val);
	const handleSeekCommit = (e) => {
		isSeekingRef.current = false;
		if (audioRef.current) audioRef.current.currentTime = parseFloat(e.target.value);
	};
	const handleVolumeChange = (val) => {
		volumeRef.current = val;
		setVolume(val);
		if (audioRef.current) audioRef.current.volume = val;
	};
	const handleMuteToggle = () => handleVolumeChange(volume > 0 ? 0 : 0.8);
	const handleLoopToggle = () => {
		const next = !loopRef.current;
		loopRef.current = next;
		setLoop(next);
		if (audioRef.current) audioRef.current.loop = next;
	};

	const hasPlayer = playingIdx !== null;

	return (
		<>
			{/* Range input styles */}
			<style>{`
				.ws-range {
					-webkit-appearance: none;
					appearance: none;
					height: 3px;
					border-radius: 2px;
					outline: none;
					cursor: pointer;
					background: linear-gradient(
						to right,
						var(--primary-dark) 0%,
						var(--primary-dark) var(--pct),
						rgba(0,0,0,0.15) var(--pct),
						rgba(0,0,0,0.15) 100%
					);
				}
				.ws-range::-webkit-slider-thumb {
					-webkit-appearance: none;
					width: 12px; height: 12px;
					border-radius: 50%;
					background: var(--primary-dark);
					cursor: pointer;
					transition: box-shadow 0.15s;
				}
				.ws-range::-webkit-slider-thumb:hover {
					box-shadow: 0 0 0 6px rgba(166,206,182,0.3);
				}
				.ws-range::-moz-range-thumb {
					width: 12px; height: 12px;
					border: none;
					border-radius: 50%;
					background: var(--primary-dark);
					cursor: pointer;
				}
			`}</style>

			<div className={`max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 ${hasPlayer ? "pb-36" : ""}`}>

				{/* Title */}
				<div className="mb-8">
					<h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text)] leading-none mb-2">
						{t("audio.title")}
					</h1>
					<p className="text-sm text-[var(--text-secondary)]">{t("audio.subtitle")}</p>
				</div>

				{/* Loading skeletons */}
				{loading && (
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						{Array(6).fill(0).map((_, i) => (
							<div key={i} className="h-16 rounded-2xl bg-[var(--card-background)] animate-pulse" />
						))}
					</div>
				)}

				{/* Empty */}
				{!loading && tracks.length === 0 && (
					<p className="text-center text-[var(--text-muted)] py-12">{t("audio.empty")}</p>
				)}

				{/* Track grid */}
				{!loading && tracks.length > 0 && (
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						{tracks.map((track, idx) => {
							const active = playingIdx === idx;
							const playing = active && isPlaying;
							return (
								<button
									key={track.name}
									type="button"
									onClick={() => handleTrackClick(idx)}
									className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left
									            transition-all duration-150 select-none
									            ${active
									              ? "border-[var(--primary)] bg-[rgba(166,206,182,0.15)] shadow-sm"
									              : "border-[var(--border)] bg-white/70 backdrop-blur-md hover:border-[var(--primary)] hover:bg-[rgba(166,206,182,0.08)]"
									            }`}
								>
									{/* Left indicator */}
									<div className="w-5 shrink-0 flex items-center justify-center">
										{playing ? (
											<EqBars />
										) : active ? (
											<Pause size={15} className="text-[var(--text-muted)]" />
										) : (
											<Play size={15} className="text-[var(--text-muted)] opacity-40" />
										)}
									</div>

									{/* Info */}
									<div className="flex-1 min-w-0">
										<p className={`text-sm leading-tight truncate ${active ? "font-bold text-[var(--text)]" : "font-medium text-[var(--text)]"}`}>
											{friendlyName(track.name)}
										</p>
										<div className="flex items-center gap-1.5 mt-0.5">
											<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[rgba(166,206,182,0.25)] text-[var(--text-secondary)]">
												{fileFormat(track.name)}
											</span>
											<span className="text-[11px] text-[var(--text-muted)] tabular-nums">
												{trackDurations[track.name] != null ? formatTime(trackDurations[track.name]) : "—"}
											</span>
										</div>
									</div>
								</button>
							);
						})}
					</div>
				)}
			</div>

			{/* ── Fixed Player Bar ───────────────────────────────────────────── */}
			{hasPlayer && (
				<div className="fixed bottom-0 left-0 right-0 z-50
				                bg-white/85 backdrop-blur-xl border-t border-[var(--border)]
				                shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">

					{/* Progress bar (full width, top of bar) */}
					<div className="flex items-center gap-2 px-4 pt-3 pb-1">
						<span className="text-[11px] tabular-nums text-[var(--text-muted)] w-9 text-right shrink-0">
							{formatTime(currentTime)}
						</span>
						<RangeInput
							value={currentTime}
							min={0}
							max={duration || 1}
							step={0.5}
							className="flex-1"
							onMouseDown={() => { isSeekingRef.current = true; }}
							onTouchStart={() => { isSeekingRef.current = true; }}
							onChange={handleSeekChange}
							onMouseUp={handleSeekCommit}
						/>
						<span className="text-[11px] tabular-nums text-[var(--text-muted)] w-9 shrink-0">
							{formatTime(duration)}
						</span>
					</div>

					{/* Controls row */}
					<div className="flex items-center px-4 pb-4 gap-2">

						{/* Track name */}
						<div className="flex items-center gap-1.5 flex-1 min-w-0">
							<Music size={13} className="text-[var(--text-muted)] shrink-0" />
							<span className="text-sm font-bold text-[var(--text)] truncate">
								{friendlyName(tracks[playingIdx].name)}
							</span>
						</div>

						{/* Playback controls (centered) */}
						<div className="flex items-center gap-1 shrink-0">
							<button type="button" onClick={handlePrev} title={t("audio.prev")}
								className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--card-background)] transition-colors">
								<SkipBack size={16} />
							</button>
							<button type="button" onClick={handleTogglePlay}
								className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--text-muted)] text-white hover:bg-[var(--text-secondary)] transition-colors">
								{isPlaying ? <Pause size={18} /> : <Play size={18} />}
							</button>
							<button type="button" onClick={handleNext} title={t("audio.next")}
								className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--card-background)] transition-colors">
								<SkipForward size={16} />
							</button>
						</div>

						{/* Loop + Volume */}
						<div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
							<button type="button" onClick={handleLoopToggle} title={t("audio.loop")}
								className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
									loop
										? "text-[var(--text-muted)] bg-[rgba(166,206,182,0.3)]"
										: "text-[var(--text-muted)] opacity-40 hover:opacity-70"
								}`}>
								<Repeat size={14} />
							</button>
							<button type="button" onClick={handleMuteToggle} title={t("audio.volume")}
								className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--card-background)] transition-colors shrink-0">
								{volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
							</button>
							<RangeInput
								value={volume}
								min={0}
								max={1}
								step={0.02}
								className="w-16 sm:w-24 shrink-0"
								onChange={handleVolumeChange}
							/>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
