import React, { useState, useEffect } from "react";

function ChessClock() {
	const [p1Time, setP1Time] = useState("00:00");
	const [p2Time, setP2Time] = useState("00:00");
	const [side, setSide] = useState(1);
	const [isRunning, setIsRunning] = useState(false);
	const [p1Seconds, setP1Seconds] = useState(0);
	const [p2Seconds, setP2Seconds] = useState(0);
	const [showResetConfirm, setShowResetConfirm] = useState(false);

	useEffect(() => {
		const saved = localStorage.getItem("chessclock");
		if (saved) {
			const { p1Time, p2Time, side, isRunning } = JSON.parse(saved);
			setP1Time(p1Time);
			setP2Time(p2Time);
			setSide(side);
			setIsRunning(isRunning);
		}
	}, []);

	useEffect(() => {
		if (!isRunning) return;

		const interval = setInterval(() => {
			if (side === 1) {
				setP1Seconds((prev) => prev + 1);
			} else {
				setP2Seconds((prev) => prev + 1);
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [isRunning, side]);

	useEffect(() => {
		const format = (s) =>
			`${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
				2,
				"0"
			)}`;
		setP1Time(format(p1Seconds));
		setP2Time(format(p2Seconds));
	}, [p1Seconds, p2Seconds]);

	return (
		<div className="container">
			<div className="d-flex justify-content-center align-items-center flex-column mb-4">
				<h1>棋钟</h1>
				<p>帮助双方计时自己的回合用时</p>
			</div>

			<div className="container">
				<div className="container" style={{ height: "60vh" }}>
					<div className="d-flex flex-column h-100 w-100">
						<div className="d-flex justify-content-center" style={{ flex: 3 }}>
							<button
								className={`btn ${
									isRunning && side === 1 ? "btn-danger" : "btn-primary"
								} btn-lg w-50 h-100 mb-4`}
								onClick={() => {
									setIsRunning(true);
									setSide(1);
								}}
							>
								{p1Time}
							</button>
						</div>
						<div
							className="d-flex col justify-content-center m-4"
							style={{ flex: 1 }}
						>
							<button
								className="btn btn-success btn-lg mx-4"
								onClick={() => {
									setIsRunning(true);
									setSide(side === 1 ? 2 : 1);
								}}
							>
								开始计时
							</button>
							<button
								className="btn btn-danger btn-lg mx-4"
								onClick={() => setShowResetConfirm(true)}
							>
								重置计时
							</button>
						</div>
						<div className="d-flex justify-content-center" style={{ flex: 3 }}>
							<button
								className={`btn ${
									isRunning && side === 2 ? "btn-danger" : "btn-primary"
								} btn-lg w-50 h-100`}
								onClick={() => {
									setIsRunning(true);
									setSide(2);
								}}
							>
								{p2Time}
							</button>
						</div>
					</div>
				</div>
			</div>
			{showResetConfirm && (
				<div
					className="modal d-block"
					tabIndex="-1"
					style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
				>
					<div className="modal-dialog modal-dialog-centered">
						<div className="modal-content">
							<div className="modal-header">
								<h5 className="modal-title">确认重置</h5>
								<button
									type="button"
									className="btn-close"
									onClick={() => setShowResetConfirm(false)}
								></button>
							</div>
							<div className="modal-body">
								<p>确定要重置计时吗？</p>
							</div>
							<div className="modal-footer">
								<button
									className="btn btn-secondary"
									onClick={() => setShowResetConfirm(false)}
								>
									取消
								</button>
								<button
									className="btn btn-danger"
									onClick={() => {
										setIsRunning(false);
										setP1Seconds(0);
										setP2Seconds(0);
										setP1Time("00:00");
										setP2Time("00:00");
										setShowResetConfirm(false);
									}}
								>
									确定重置
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default ChessClock;
