import React from "react";
import { Container, Typography, Link, Box } from "@mui/material";

function Home() {
	return (
		<Container maxWidth="sm" sx={{ textAlign: "center", pt: 8 }}>
			<Typography variant="h1" gutterBottom>
				WS工具箱
			</Typography>
			<Typography variant="body1" color="text.secondary">
				提供各种WS相关的小工具和链接合集，开发中
			</Typography>
			<Box mt={4}>
				<Link
					href="https://github.com/llloydretro2/WSToolBoxReact"
					target="_blank"
					rel="noopener"
					underline="hover"
					sx={{ color: "gray" }}
				>
					GitHub 链接
				</Link>
			</Box>
		</Container>
	);
}

export default Home;
