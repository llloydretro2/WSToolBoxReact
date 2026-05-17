import React, { useEffect, useState, useRef } from "react";
import { useLocale } from "../contexts/LocaleContext";
import { Box, Container, Typography } from "@mui/material";
import { apiRequest } from "../utils/api.js";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://api.cardtoolbox.org";

function friendlyName(filename) {
	return decodeURIComponent(filename)
		.replace(/\.mp3$/i, "")
		.replace(/[_-]/g, " ")
		.trim();
}

export default function AudioBoard() {
	const { locale } = useLocale();
	const [tracks, setTracks] = useState([]);
	const current = useRef(null);
	const [currentName, setCurrentName] = useState(null);

	useEffect(() => {
		let mounted = true;
		apiRequest("/api/audios")
			.then((r) => r.json())
			.then((list) => {
				if (mounted && Array.isArray(list)) setTracks(list);
			})
			.catch(() => {});
		return () => {
			mounted = false;
			if (current.current) {
				current.current.pause();
				current.current = null;
			}
		};
	}, []);

	const playTrack = (track) => {
		if (current.current && current.current.datasetName === track.name) {
			// toggle off
			current.current.pause();
			current.current = null;
			setCurrentName(null);
			return;
		}
		if (current.current) {
			current.current.pause();
			current.current = null;
		}
		const a = new Audio(`${BACKEND_URL}${track.url}`);
		a.loop = true;
		a.datasetName = track.name;
		a.play().catch((e) => {
			console.warn("play failed", e);
		});
		current.current = a;
		setCurrentName(track.name);
	};

	// clicking a button toggles playback; volume/stop controls are removed

	return (
		<Container maxWidth="md" sx={{ py: 3 }}>
			<Box textAlign="center" mb={4}>
				<Typography variant="h4" fontWeight={700} color="var(--text)" gutterBottom>
					{locale === 'zh' ? '音效面板' : 'Audio Board'}
				</Typography>
			</Box>
			{/* 三列等分布局：移动端单列，平板/桌面三列 */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
					gap: 2,
				}}>
				{tracks.length === 0 && (
					<Typography color="textSecondary">暂无音频文件</Typography>
				)}
				{tracks.map((t) => {
					const playing = currentName === t.name;
					return (
						<Box
							key={t.name}
							component="button"
							onClick={() => playTrack(t)}
							aria-pressed={playing}
							sx={{
								width: "100%",
								minHeight: 64,
								px: 2,
								borderRadius: 2,
								fontWeight: 600,
								fontSize: 15,
								cursor: "pointer",
								fontFamily: "inherit",
								border: "1px solid var(--border)",
								backgroundColor: playing ? "var(--primary)" : "transparent",
								color: "var(--text)",
								boxShadow: playing ? "0 6px 14px -8px rgba(0,0,0,0.45)" : "none",
								transition: "background-color 0.15s, box-shadow 0.15s",
								"&:hover": {
									backgroundColor: playing
										? "var(--primary-hover)"
										: "rgba(166,206,182,0.12)",
								},
							}}>
							{friendlyName(t.name)}
						</Box>
					);
				})}
			</Box>
		</Container>
	);
}
