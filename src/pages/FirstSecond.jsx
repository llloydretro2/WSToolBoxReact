import { Container, Typography, Button, Box } from "@mui/material";
import React, { useState } from "react";
import { useLocale } from "../contexts/LocaleContext";
import firstCard from "../assets/ims_s.png";
import secondCard from "../assets/ims_k.png";

function FirstSecond() {
	const { t } = useLocale();
	const [order, setOrder] = useState("");

	const decideOrder = () => {
		const randomZeroOne = Math.floor(Math.random() * 2);
		var result =
			randomZeroOne === 1
				? t("pages.firstSecond.first")
				: t("pages.firstSecond.second");
		setOrder(result);
	};

	return (
		<Container
			maxWidth="sm"
			sx={{ mt: 4, textAlign: "center" }}>
			<Box
				sx={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 3,
				}}>
				<Typography
					variant="h4"
					fontWeight={700}
					color="#1b4332"
					gutterBottom>
					{t("pages.firstSecond.title")}
				</Typography>
				<Typography
					variant="body1"
					color="text.secondary"
					align="center"
					gutterBottom>
					{t("pages.firstSecond.subtitle")}
				</Typography>

				{order && (
					<img
						src={
							order === t("pages.firstSecond.first") ? firstCard : secondCard
						}
						alt={order}
						style={{ width: "100%", maxWidth: 300 }}
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
					}}>
					{t("pages.firstSecond.button")}
				</Button>
			</Box>
		</Container>
	);
}

export default FirstSecond;
