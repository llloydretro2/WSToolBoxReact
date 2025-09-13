import React from "react";
import { Container, Typography, Button, Grid } from "@mui/material";

function RandomShuffle() {
	const [deck, setDeck] = React.useState([]);

	const generateRandomDeck = () => {
		const targetSum = 50;
		const count = Math.floor(Math.random() * 5) + 6; // 6 to 10 numbers
		let nums = Array.from({ length: count }, () => 1);
		let currentSum = count;

		while (currentSum < targetSum) {
			const idx = Math.floor(Math.random() * count);
			nums[idx]++;
			currentSum++;
		}

		setDeck(nums);
	};

	return (
		<Container maxWidth="md" sx={{ textAlign: "center", pt: 8 }}>
			<Typography variant="h2" gutterBottom>
				随机洗牌工具
			</Typography>

			<Typography variant="body1" color="text.secondary">
				提供随机生成的牌堆洗牌
			</Typography>

			<Button
				variant="contained"
				size="large"
				sx={{
					mt: 2,
					backgroundColor: "#a6ceb6",
					"&:hover": { backgroundColor: "#95bfa5" },
				}}
				onClick={generateRandomDeck}
			>
				生成牌堆
			</Button>

			{deck.length > 0 && (
				<Grid
					container
					spacing={2}
					justifyContent="center"
					sx={{ mt: 2 }}
					columns={16}
				>
					{deck.map((card, index) => (
						<Grid item key={index} size={4}>
							<Typography
								variant="h2"
								align="center"
								sx={{
									color: "white",
									backgroundColor: "rgba(166, 206, 182, 0.7)",
									borderRadius: 1,
								}}
							>
								{card}
							</Typography>
						</Grid>
					))}
				</Grid>
			)}
		</Container>
	);
}

export default RandomShuffle;
