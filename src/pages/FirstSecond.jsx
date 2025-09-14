import { Container, Typography, Button, Box } from "@mui/material";
import React, { useState } from "react";
import firstCard from "../assets/ims_s.png";
import secondCard from "../assets/ims_k.png";

function FirstSecond() {
	const [order, setOrder] = useState("");

	const decideOrder = () => {
		const randomZeroOne = Math.floor(Math.random() * 2);
		var result = randomZeroOne === 1 ? "先攻" : "後攻";
		setOrder(result);
	};

	return (
		<Container maxWidth="sm" sx={{ mt: 4, textAlign: "center" }} >
			<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
				<Typography variant="h4" gutterBottom>
				先后攻
			</Typography>
			<Typography variant="body1" gutterBottom>
				点击生成先攻或者后攻
			</Typography>

			{order && (
				<img
					src={order === "先攻" ? firstCard : secondCard}
					alt={order}
					style={{ width: "100%", maxWidth: 400 }}
				/>
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
			</Box>
			
		</Container>
	);
}

export default FirstSecond;
