import React, { useEffect, useState, useRef } from "react";
import { Box, Button, Typography } from "@mui/material";

const BACKEND_URL = "https://api.cardtoolbox.org";

function friendlyName(filename) {
	return decodeURIComponent(filename)
		.replace(/\.mp3$/i, "")
		.replace(/[_\-]/g, " ")
		.trim();
}

export default function AudioBoard() {
	const [tracks, setTracks] = useState([]);
	const current = useRef(null);
	const [currentName, setCurrentName] = useState(null);

	useEffect(() => {
		let mounted = true;
		fetch(`${BACKEND_URL}/api/audios`)
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
		<Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
			<Box sx={{ width: "100%", maxWidth: 920 }}>
				<Typography
					variant="h5"
					gutterBottom>
					音效面板
				</Typography>
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
							<Button
								key={t.name}
								onClick={() => playTrack(t)}
								aria-pressed={playing}
								sx={{
									width: "100%",
									minHeight: 64,
									px: 2,
									borderRadius: 2,
									textTransform: "none",
									fontWeight: 600,
									fontSize: 15,
									justifyContent: "center",
									backgroundColor: playing ? "var(--primary)" : "transparent",
									color: "var(--text)",
									border: "1px solid var(--border)",
									boxShadow: playing
										? "0 6px 14px -8px rgba(0,0,0,0.45)"
										: "none",
									"&:hover": {
										backgroundColor: playing
											? "rgba(0,0,0,0.06)"
											: "rgba(255,255,255,0.03)",
									},
								}}>
								{friendlyName(t.name)}
							</Button>
						);
					})}
				</Box>
			</Box>
		</Box>
	);
}
