import React, { useState, useEffect } from "react";

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
		<div className="container-fluid">
			<div className="d-flex justify-content-center align-items-center flex-column mb-4">
				<h1>Dice Roller</h1>
				{diceInputs.map((input, index) => (
					<div key={index} className="row mb-2">
						<div className="row justify-content-center align-items-center">
							<div className="col-1">
								<strong className="bg-info text-white px-2 py-1 rounded">
									{index + 1}
								</strong>{" "}
							</div>
							<div className="col-3">
								<input
									type="number"
									className="form-control"
									placeholder="数量"
									value={input.count}
									onChange={(e) => handleChange(index, "count", e.target.value)}
								/>
							</div>
							<div className="col-1">
								<strong>D</strong>
							</div>
							<div className="col-3">
								<input
									type="number"
									className="form-control"
									placeholder="面数"
									value={input.sides}
									onChange={(e) => handleChange(index, "sides", e.target.value)}
								/>
							</div>
						</div>
					</div>
				))}
				<div className="container">
					<div className="row mt-3 justify-content-center">
						<div className="col-4">
							<button
								className="btn btn-success btn-lg w-100"
								onClick={addDiceInput}
							>
								添加骰子
							</button>
						</div>
						<div className="col-4">
							<button
								className="btn btn-danger btn-lg w-100"
								onClick={resetDiceInputs}
							>
								重置
							</button>
						</div>
					</div>
					<div className="row mt-3 justify-content-center">
						<div className="col-4">
							<button
								className="btn btn-primary btn-lg w-100"
								onClick={rollDice}
							>
								投掷骰子
							</button>
						</div>
					</div>
				</div>
			</div>
			{results.length > 0 && (
				<div className="container-fluid">
					<div className="row justify-content-center text-center">
						<div className="col-8">
							<h2 className="mb-4">结果</h2>
							{results.map((rolls, idx) => (
								<div key={idx} className="mb-2">
									第{idx + 1}组: {rolls.join(", ")}
								</div>
							))}
							<h4 className="mb-5">
								总计: {results.flat().reduce((a, b) => a + b, 0)}
							</h4>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default Dice;
