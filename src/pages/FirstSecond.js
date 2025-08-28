import React, { useState } from "react";

function FirstSecond() {
	const [order, setOrder] = useState("");

	const decideOrder = () => {
		const randomZeroOne = Math.floor(Math.random() * 2);
		var result = randomZeroOne === 1 ? "先攻" : "後攻";
		setOrder(result);
	};

	return (
		<div className="container-fluid">
			<div className="d-flex  align-items-center justify-content-center m-5 flex-column">
				<h1>先后攻</h1>
				<p1>点击生成先攻或者后攻</p1>

				{order && (
					<h1
						className="display-1 mt-5 mb-5"
						style={{
							backgroundColor: order === "先攻" ? "red" : "blue",
							color: "white",
							padding: "20px",
							borderRadius: "10px",
						}}
					>
						{order}
					</h1>
				)}

				<button className="btn btn-primary btn-lg col-3" onClick={decideOrder}>
					决定
				</button>
			</div>
		</div>
	);
}

export default FirstSecond;
