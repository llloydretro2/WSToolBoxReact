import React, { useState, useEffect } from "react";
import {
	Container,
	Typography,
	Button,
	TextField,
	Box,
	Grid,
	Paper,
} from "@mui/material";

function Dice() {
	const [diceInputs, setDiceInputs] = useState([{ sides: 6, count: 1 }]);
	const [results, setResults] = useState([]);

	useEffect(() => {
		const savedInputs = localStorage.getItem("diceInputs");
		const savedResults = localStorage.getItem("diceResults");
		if (savedInputs) {
			setDiceInputs(JSON.parse(savedInputs));
		}
		if (savedResults) {
			setResults(JSON.parse(savedResults));
		}
	}, []);

	const handleChange = (index, field, value) => {
		const updated = [...diceInputs];
		updated[index][field] = parseInt(value) || "";
		setDiceInputs(updated);
	};

	const addDiceInput = () => {
		setDiceInputs([...diceInputs, { sides: 6, count: 1 }]);
		localStorage.setItem(
			"diceInputs",
			JSON.stringify([...diceInputs, { sides: 6, count: 1 }])
		);
	};

	const resetDiceInputs = () => {
		setDiceInputs([{ sides: 6, count: 1 }]);
		setResults([]);
		localStorage.removeItem("diceInputs");
		localStorage.removeItem("diceResults");
	};

	const rollDice = () => {
		const allResults = diceInputs.map(({ count, sides }) => {
			const rolls = [];
			for (let i = 0; i < count; i++) {
				rolls.push(Math.floor(Math.random() * sides) + 1);
			}
			return rolls;
		});
		setResults(allResults);
		localStorage.setItem("diceResults", JSON.stringify(allResults));
	};

	return (
		<Container maxWidth="md" sx={{ mt: 4 }}>
			<Typography variant="h4" align="center" gutterBottom>
				Dice Roller
			</Typography>
			{diceInputs.map((input, index) => (
				<Paper
					key={index}
					sx={{
						p: 2,
						mb: 2,
						display: "flex",
						justifyContent: "center",
						backgroundColor: "rgba(166, 206, 182, 0.6)",
					}}
				>
					<Grid container spacing={1} alignItems="center" wrap="nowrap">
						<Grid item>
							<Typography variant="body1">{index + 1}</Typography>
						</Grid>
						<Grid item xs={5} sm={3}>
							<TextField
								label="数量"
								type="number"
								size="small"
								value={input.count}
								onChange={(e) => handleChange(index, "count", e.target.value)}
							/>
						</Grid>
						<Grid item>
							<Typography variant="h6">D</Typography>
						</Grid>
						<Grid item xs={5} sm={3}>
							<TextField
								label="面数"
								type="number"
								size="small"
								value={input.sides}
								onChange={(e) => handleChange(index, "sides", e.target.value)}
							/>
						</Grid>
					</Grid>
				</Paper>
			))}

			<Grid container spacing={2} justifyContent="center" sx={{ mb: 3 }}>
				<Grid item xs={12} sm={4}>
					<Button
						variant="contained"
						color="success"
						fullWidth
						onClick={addDiceInput}
					>
						添加骰子
					</Button>
				</Grid>
				<Grid item xs={12} sm={4}>
					<Button
						variant="contained"
						color="error"
						fullWidth
						onClick={resetDiceInputs}
					>
						重置
					</Button>
				</Grid>
				<Grid item xs={12} sm={4}>
					<Button
						variant="contained"
						color="primary"
						fullWidth
						onClick={rollDice}
					>
						投掷骰子
					</Button>
				</Grid>
			</Grid>

			{results.length > 0 && (
				<Box sx={{ mt: 4, textAlign: "center" }}>
					<Typography variant="h5" gutterBottom>
						结果
					</Typography>
					{results.map((rolls, idx) => (
						<Typography key={idx} variant="body1" sx={{ mb: 1 }}>
							第{idx + 1}组: {rolls.join(", ")}
						</Typography>
					))}
					<Typography variant="h6" sx={{ mt: 2 }}>
						总计: {results.flat().reduce((a, b) => a + b, 0)}
					</Typography>
				</Box>
			)}
		</Container>
	);
}

export default Dice;
