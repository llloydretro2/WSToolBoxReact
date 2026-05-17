import React, { useEffect, useState, useRef } from "react";
import { useLocale } from "../contexts/LocaleContext";
import {
	Box,
	Container,
	Typography,
	Paper,
	Slider,
	IconButton,
	Skeleton,
	Tooltip,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import RepeatIcon from "@mui/icons-material/Repeat";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import { apiRequest } from "../utils/api.js";

const BACKEND_URL =
	import.meta.env.VITE_BACKEND_URL || "https://api.cardtoolbox.org";

function friendlyName(filename) {
	return decodeURIComponent(filename)
		.replace(/\.[^.]+$/, "")
		.replace(/[_-]/g, " ")
		.trim();
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

// Animated equalizer bars shown on the active playing card
function EqBars() {
	const delays = ["0s", "0.18s", "0.09s", "0.27s"];
	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "flex-end",
				gap: "2.5px",
				height: 16,
				flexShrink: 0,
			}}>
			{delays.map((delay, i) => (
				<Box
					key={i}
					sx={{
						width: 3,
						borderRadius: "2px",
						backgroundColor: "var(--text)",
						animation: `eq-bounce 0.55s ${delay} ease-in-out infinite alternate`,
					}}
				/>
			))}
		</Box>
	);
}

// Shared slider sx for progress and volume
const sliderSx = {
	color: "var(--primary-dark)",
	height: 3,
	padding: "10px 0",
	"& .MuiSlider-thumb": {
		width: 12,
		height: 12,
		transition: "box-shadow 0.15s",
		"&:hover, &.Mui-focusVisible": {
			boxShadow: "0 0 0 7px rgba(166,206,182,0.28)",
		},
	},
	"& .MuiSlider-rail": {
		opacity: 0.25,
		backgroundColor: "var(--text)",
	},
	"& .MuiSlider-track": {
		border: "none",
	},
};

const iconBtnSx = {
	color: "var(--text)",
	"&:hover": { backgroundColor: "rgba(166,206,182,0.22)" },
};

export default function AudioBoard() {
	const { t } = useLocale();

	const [tracks, setTracks] = useState([]);
	const [loading, setLoading] = useState(true);
	// { [track.name]: number } — populated by preload="metadata" probes
	const [trackDurations, setTrackDurations] = useState({});

	const [playingIdx, setPlayingIdx] = useState(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(0.8);
	const [loop, setLoop] = useState(true);

	// Refs so closures inside Audio callbacks always read the latest values
	const audioRef = useRef(null);
	const isSeekingRef = useRef(false);
	const volumeRef = useRef(0.8);
	const loopRef = useRef(true);

	// ── Fetch track list ────────────────────────────────────────────────────────

	useEffect(() => {
		let mounted = true;
		apiRequest("/api/audios")
			.then((r) => r.json())
			.then((list) => {
				if (mounted && Array.isArray(list)) setTracks(list);
			})
			.catch(() => {})
			.finally(() => { if (mounted) setLoading(false); });
		return () => {
			mounted = false;
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current = null;
			}
		};
	}, []);

	// ── Prefetch durations via preload="metadata" ──────────────────────────────
	// Only fetches the file header (a few KB), not the full audio.

	useEffect(() => {
		if (tracks.length === 0) return;
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

	// ── Playback helpers ────────────────────────────────────────────────────────

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

		audio.ontimeupdate = () => {
			if (!isSeekingRef.current) setCurrentTime(audio.currentTime);
		};
		audio.onloadedmetadata = () => setDuration(audio.duration);
		audio.onplay = () => setIsPlaying(true);
		audio.onpause = () => setIsPlaying(false);
		audio.onended = () => {
			if (!loopRef.current) {
				setIsPlaying(false);
				setCurrentTime(0);
			}
		};

		audioRef.current = audio;
		setPlayingIdx(idx);
		setCurrentTime(0);
		setDuration(0);
		setIsPlaying(true);
		audio.play().catch((e) => console.warn("play failed", e));
	};

	const handleTrackClick = (idx) => {
		if (playingIdx === idx) {
			if (isPlaying) {
				audioRef.current.pause();
			} else {
				audioRef.current.play().catch(() => {});
			}
			return;
		}
		loadAndPlay(idx);
	};

	const handlePrev = () => {
		if (playingIdx === null || tracks.length === 0) return;
		loadAndPlay((playingIdx - 1 + tracks.length) % tracks.length);
	};

	const handleNext = () => {
		if (playingIdx === null || tracks.length === 0) return;
		loadAndPlay((playingIdx + 1) % tracks.length);
	};

	const handleTogglePlay = () => {
		if (!audioRef.current) return;
		if (isPlaying) {
			audioRef.current.pause();
		} else {
			audioRef.current.play().catch(() => {});
		}
	};

	const handleSeekStart = () => { isSeekingRef.current = true; };
	const handleSeekChange = (_, val) => setCurrentTime(val);
	const handleSeekCommit = (_, val) => {
		isSeekingRef.current = false;
		if (audioRef.current) audioRef.current.currentTime = val;
	};

	const handleVolumeChange = (_, val) => {
		volumeRef.current = val;
		setVolume(val);
		if (audioRef.current) audioRef.current.volume = val;
	};

	const handleMuteToggle = () => {
		const next = volume > 0 ? 0 : 0.8;
		handleVolumeChange(null, next);
	};

	const handleLoopToggle = () => {
		const next = !loopRef.current;
		loopRef.current = next;
		setLoop(next);
		if (audioRef.current) audioRef.current.loop = next;
	};

	// ── Render ──────────────────────────────────────────────────────────────────

	return (
		<Container maxWidth="md" sx={{ py: 3 }}>
			{/* Header */}
			<Box textAlign="center" mb={4}>
				<Typography variant="h4" fontWeight={700} color="var(--text)" gutterBottom>
					{t("audio.title")}
				</Typography>
				<Typography variant="body1" color="text.secondary">
					{t("audio.subtitle")}
				</Typography>
			</Box>

			{/* Loading skeletons */}
			{loading && (
				<>
					<Typography
						variant="body2"
						color="text.secondary"
						textAlign="center"
						mb={2}
						sx={{ opacity: 0.7 }}>
						{t("audio.loading")}
					</Typography>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
							gap: 2,
						}}>
						{Array(6).fill(0).map((_, i) => (
							<Skeleton
								key={i}
								variant="rounded"
								height={72}
								animation="wave"
								sx={{ borderRadius: 2 }}
							/>
						))}
					</Box>
				</>
			)}

			{/* Empty state */}
			{!loading && tracks.length === 0 && (
				<Typography color="text.secondary" textAlign="center">
					{t("audio.empty")}
				</Typography>
			)}

			{/* Track grid */}
			{!loading && tracks.length > 0 && (
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
						gap: 2,
					}}>
					{tracks.map((track, idx) => {
						const active = playingIdx === idx;
						const activeAndPlaying = active && isPlaying;
						return (
							<Paper
								key={track.name}
								onClick={() => handleTrackClick(idx)}
								elevation={0}
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 1.5,
									px: 2,
									minHeight: 72,
									cursor: "pointer",
									borderRadius: 2,
									border: "1px solid",
									borderColor: active ? "var(--primary-dark)" : "var(--border)",
									backgroundColor: active
										? "linear-gradient(135deg, var(--primary-light), var(--primary))"
										: "var(--surface)",
									background: active
										? "linear-gradient(135deg, var(--primary-light), var(--primary))"
										: "var(--surface)",
									boxShadow: active
										? "0 4px 14px rgba(80,140,106,0.18)"
										: "none",
									transition: "all 0.18s ease",
									userSelect: "none",
									"&:hover": {
										borderColor: "var(--primary-dark)",
										backgroundColor: active
											? undefined
											: "rgba(166,206,182,0.08)",
										background: active
											? undefined
											: "rgba(166,206,182,0.08)",
										boxShadow: "0 2px 10px rgba(80,140,106,0.12)",
									},
								}}>
								{/* Left icon area */}
								<Box sx={{ width: 20, flexShrink: 0, display: "flex", alignItems: "center" }}>
									{activeAndPlaying ? (
										<EqBars />
									) : active ? (
										<PauseIcon sx={{ fontSize: 18, color: "var(--text)", opacity: 0.7 }} />
									) : (
										<PlayArrowIcon sx={{ fontSize: 18, color: "var(--text)", opacity: 0.25 }} />
									)}
								</Box>

								{/* Track name + metadata */}
								<Box sx={{ flex: 1, minWidth: 0 }}>
									<Typography
										variant="body2"
										fontWeight={active ? 600 : 400}
										color="var(--text)"
										noWrap
										sx={{ fontSize: "0.875rem", lineHeight: 1.3 }}>
										{friendlyName(track.name)}
									</Typography>
									<Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.3 }}>
										<Typography
											component="span"
											sx={{
												fontSize: "0.65rem",
												fontWeight: 600,
												letterSpacing: "0.06em",
												px: 0.75,
												py: 0.1,
												borderRadius: "3px",
												backgroundColor: active
													? "rgba(0,0,0,0.12)"
													: "rgba(166,206,182,0.25)",
												color: "var(--text-secondary)",
												lineHeight: 1.6,
											}}>
											{fileFormat(track.name)}
										</Typography>
										<Typography
											component="span"
											sx={{
												fontSize: "0.7rem",
												color: "var(--text-muted)",
												fontVariantNumeric: "tabular-nums",
											}}>
											{trackDurations[track.name] != null
												? formatTime(trackDurations[track.name])
												: "—"}
										</Typography>
									</Box>
								</Box>
							</Paper>
						);
					})}
				</Box>
			)}

			{/* ── Player bar ───────────────────────────────────────────────────── */}
			{playingIdx !== null && (
				<Paper
					elevation={0}
					sx={{
						mt: 4,
						p: { xs: 2, sm: 2.5 },
						borderRadius: 3,
						border: "1px solid var(--border)",
						background:
							"linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%)",
					}}>

					{/* Track name row */}
					<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
						<MusicNoteIcon
							sx={{ fontSize: 15, color: "var(--text)", opacity: 0.55, flexShrink: 0 }}
						/>
						<Typography
							variant="body2"
							fontWeight={600}
							color="var(--text)"
							noWrap>
							{friendlyName(tracks[playingIdx].name)}
						</Typography>
					</Box>

					{/* Progress bar */}
					<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
						<Typography
							variant="caption"
							color="var(--text-secondary)"
							sx={{ minWidth: 34, fontVariantNumeric: "tabular-nums" }}>
							{formatTime(currentTime)}
						</Typography>
						<Slider
							value={currentTime}
							min={0}
							max={duration || 1}
							step={0.5}
							onMouseDown={handleSeekStart}
							onTouchStart={handleSeekStart}
							onChange={handleSeekChange}
							onChangeCommitted={handleSeekCommit}
							sx={{ ...sliderSx, flex: 1 }}
						/>
						<Typography
							variant="caption"
							color="var(--text-secondary)"
							sx={{ minWidth: 34, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
							{formatTime(duration)}
						</Typography>
					</Box>

					{/* Controls row */}
					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							gap: 0.5,
							mt: 0.5,
						}}>
						{/* Prev */}
						<Tooltip title={t("audio.prev")} arrow>
							<IconButton size="small" onClick={handlePrev} sx={iconBtnSx}>
								<SkipPreviousIcon fontSize="small" />
							</IconButton>
						</Tooltip>

						{/* Play / Pause */}
						<IconButton
							onClick={handleTogglePlay}
							sx={{
								...iconBtnSx,
								mx: 0.5,
								backgroundColor: "rgba(255,255,255,0.35)",
								"&:hover": { backgroundColor: "rgba(255,255,255,0.55)" },
							}}>
							{isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
						</IconButton>

						{/* Next */}
						<Tooltip title={t("audio.next")} arrow>
							<IconButton size="small" onClick={handleNext} sx={iconBtnSx}>
								<SkipNextIcon fontSize="small" />
							</IconButton>
						</Tooltip>

						{/* Loop */}
						<Tooltip title={t("audio.loop")} arrow>
							<IconButton
								size="small"
								onClick={handleLoopToggle}
								sx={{
									...iconBtnSx,
									ml: 0.5,
									opacity: loop ? 1 : 0.3,
									backgroundColor: loop ? "rgba(255,255,255,0.3)" : "transparent",
									"&:hover": {
										backgroundColor: loop
											? "rgba(255,255,255,0.45)"
											: "rgba(166,206,182,0.22)",
									},
								}}>
								<RepeatIcon fontSize="small" />
							</IconButton>
						</Tooltip>

						{/* Volume */}
						<Box
							sx={{
								ml: "auto",
								display: "flex",
								alignItems: "center",
								gap: 0.5,
							}}>
							<Tooltip title={t("audio.volume")} arrow>
								<IconButton size="small" onClick={handleMuteToggle} sx={iconBtnSx}>
									{volume === 0 ? (
										<VolumeOffIcon fontSize="small" />
									) : (
										<VolumeUpIcon fontSize="small" />
									)}
								</IconButton>
							</Tooltip>
							<Slider
								value={volume}
								min={0}
								max={1}
								step={0.02}
								onChange={handleVolumeChange}
								sx={{
									...sliderSx,
									width: { xs: 60, sm: 88 },
									flexShrink: 0,
								}}
							/>
						</Box>
					</Box>
				</Paper>
			)}
		</Container>
	);
}
