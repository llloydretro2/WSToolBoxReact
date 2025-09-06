import { Container, Typography, Button, Box } from "@mui/material";
import React, { useState } from "react";

function FirstSecond() {
	const [order, setOrder] = useState("");

	const decideOrder = () => {
		const randomZeroOne = Math.floor(Math.random() * 2);
		var result = randomZeroOne === 1 ? "先攻" : "後攻";
		setOrder(result);
	};

	return (
		<Container maxWidth="sm" sx={{ mt: 8, textAlign: "center" }}>
			<Typography variant="h4" gutterBottom>
				先后攻
			</Typography>
			<Typography variant="body1" gutterBottom>
				点击生成先攻或者后攻
			</Typography>

			{order && (
				<Box
					sx={{
						mt: 5,
						mb: 5,
						bgcolor: order === "先攻" ? "red" : "blue",
						color: "white",
						p: 3,
						borderRadius: 2,
					}}
				>
					<Typography variant="h2">{order}</Typography>
				</Box>
			)}

			<Button
				variant="contained"
				size="large"
				onClick={decideOrder}
				sx={{
					px: 6,
					py: 1.5,
					backgroundColor: "#a6ceb6",
					"&:hover": { backgroundColor: "#95bfa5" },
				}}
			>
				决定
			</Button>
		</Container>
	);
}

export default FirstSecond;
