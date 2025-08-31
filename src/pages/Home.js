import React from "react";
import { Container, Typography, Link, Box } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import EmailIcon from "@mui/icons-material/Email";

function Home() {
	return (
		<Container maxWidth="sm" sx={{ textAlign: "center", pt: 8 }}>
			<Typography variant="h2" gutterBottom>
				WS工具箱
			</Typography>
			<Typography variant="body1" color="text.secondary">
				提供各种WS相关的小工具和链接合集，开发中
			</Typography>

			{/* 链接 */}
			<Box mt={4} sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
				<Link
					href="https://github.com/llloydretro2/WSToolBoxReact"
					target="_blank"
					rel="noopener"
					underline="hover"
					sx={{
						color: "gray",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: 1,
					}}
				>
					<GitHubIcon fontSize="small" />
					GitHub
				</Link>

				<Link
					href="https://space.bilibili.com/13365744"
					target="_blank"
					rel="noopener"
					underline="hover"
					sx={{
						color: "gray",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: 1,
					}}
				>
					<img src="bilibili.svg" alt="Bilibili" width={20} height={20} />
					Bilibili
				</Link>

				<Link
					href="mailto:lloydretro2@example.com"
					underline="hover"
					sx={{
						color: "gray",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: 1,
					}}
				>
					<EmailIcon fontSize="small" />
					Email
				</Link>
			</Box>
		</Container>
	);
}

export default Home;
