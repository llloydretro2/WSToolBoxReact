import React, { useEffect, useState, useRef } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import symbolMap from "../symbolMap.json";

function DIY() {
	// 辅助函数：解析文本中的指令为图片
	const parseTextWithIcons = (text) => {
		const parts = text.split(/(\/\w+)/g); // 拆分指令
		return parts.map((part, index) => {
			if (symbolMap[part]) {
				return (
					<img
						key={index}
						src={symbolMap[part]}
						alt={part}
						style={{ height: "1em", verticalAlign: "middle", margin: "0 2px" }}
					/>
				);
			}
			return <React.Fragment key={index}>{part}</React.Fragment>;
		});
	};

	const textBoxRef = useRef(null);
	const [textBoxHeight, setTextBoxHeight] = useState(100);
	const [name, setName] = useState("");
	const [power, setPower] = useState("");
	const [id, setId] = useState("");
	const [numberTraits, setNumberTraits] = useState("2t");
	const [traits, setTraits] = useState([]);

	const [flavor, setFlavor] = useState("");
	const [text, setText] = useState("");
	useEffect(() => {
		if (textBoxRef.current) {
			setTextBoxHeight(textBoxRef.current.offsetHeight);
		}
	}, [text]);

	const [image, setImage] = useState(null);
	const [bgTemplate] = useState("green-climax.png");

	const [side, setSide] = useState("Weiss");
	const [cardType] = useState("キャラ");
	const [color, setColor] = useState("g");
	const [cardLevel, setCardLevel] = useState("l0");
	const [cost, setCost] = useState("c0");
	const [soul, setSoul] = useState("1s");
	const [trigger, setTrigger] = useState("none");

	const [cardBottomBar, setCardBottomBar] = useState("");

	const [levelMark, setLevelMark] = useState("");
	const [costMark, setCostMark] = useState("");

	const [backup, setBackup] = useState("nobackup");

	// 更新卡底条
	useEffect(() => {
		if (cardType === "キャラ") {
			setCardBottomBar(`character/${side}/${color}${soul}${numberTraits}.png`);
		} else if (cardType === "イベント") {
			setCardBottomBar(`event/${side}/${color}.png`);
		}
	}, [side, cardType, color, soul, numberTraits]);

	// 更新等级标记
	useEffect(() => {
		if (cardLevel !== "l0") {
			setLevelMark(`${color}${cardLevel}.png`);
		} else {
			setLevelMark(`l0.png`);
		}
	}, [cardLevel, color]);

	// 更新费用标记
	useEffect(() => {
		setCostMark(`${cost}.png`);
	}, [cost]);

	const backupOptions = [
		{ value: "clock", label: "クロック" },
		{ value: "back", label: "バックアップ" },
		{ value: "nobackup", label: "なし" },
	];

	const triggerOptions = [
		{ value: "none", label: "なし" },

		{
			value: "soul",
			label: "ソウル+1",
			img: "assets/triggers/soul.png",
		},

		{
			value: "soul2",
			label: "ソウル+2",
			img: "assets/triggers/soul.png",
		},

		{
			value: "goldbag",
			label: "ブール",
			img: "assets/triggers/goldbag.png",
		},
		{
			value: "door",
			label: "カムバック",
			img: "assets/triggers/door.png",
		},
		{
			value: "bounce",
			label: "リターン",
			img: "assets/triggers/bounce.png",
		},
		{
			value: "book",
			label: "ドロー",
			img: "assets/triggers/book.png",
		},
		{
			value: "goldbar",
			label: "トレジャー",
			img: "assets/triggers/goldbar.png",
		},
		{
			value: "shot",
			label: "ショット",
			img: "assets/triggers/shot.png",
		},
		{
			value: "gate",
			label: "ゲート",
			img: "assets/triggers/gate.png",
		},
		{
			value: "standby",
			label: "スタンバイ",
			img: "assets/triggers/standby.png",
		},
		{
			value: "choice",
			label: "チョイス",
			img: "assets/triggers/choice.png",
		},
	];

	const traitCountOptions = [
		{ value: "0t", label: "0个" },
		{ value: "1t", label: "1个" },
		{ value: "2t", label: "2个" },
	];
	const sideOptions = [
		{ value: "Weiss", label: "Weiss" },
		{ value: "Schwarz", label: "Schwarz" },
	];
	const cardTypeOptions = [
		{ value: "キャラ", label: "キャラ" },
		{ value: "イベント", label: "イベント" },
		{ value: "クライマックス", label: "クライマックス" },
	];
	const colorOptions = [
		{ value: "r", label: "赤" },
		{ value: "b", label: "青" },
		{ value: "y", label: "黄" },
		{ value: "g", label: "緑" },
	];
	const cardLevelOptions = [
		{ value: "l0", label: "0" },
		{ value: "l1", label: "1" },
		{ value: "l2", label: "2" },
		{ value: "l3", label: "3" },
	];
	const costOptions = [
		{ value: "c0", label: "0" },
		{ value: "c1", label: "1" },
		{ value: "c2", label: "2" },
		{ value: "c3", label: "3" },
		{ value: "c4", label: "4" },
		{ value: "c6", label: "6" },
		{ value: "c7", label: "7" },
		{ value: "c8", label: "8" },
		{ value: "c9", label: "9" },
		{ value: "c10", label: "10" },
		{ value: "c11", label: "11" },
		{ value: "c12", label: "12" },
		{ value: "c13", label: "13" },
		{ value: "c14", label: "14" },
		{ value: "c15", label: "15" },
		{ value: "c20", label: "20" },
	];
	const soulOptions = [
		{ value: "0s", label: "0" },
		{ value: "1s", label: "1" },
		{ value: "2s", label: "2" },
		{ value: "3s", label: "3" },
	];

	const handleExport = async () => {
		const card = document.getElementById("card-preview");
		if (!card) return;
		const html2canvas = (await import("html2canvas")).default;
		const rect = card.getBoundingClientRect();
		const canvas = await html2canvas(card, {
			scale: 2,
			width: rect.width,
			height: rect.height,
			useCORS: true,
			windowWidth: document.documentElement.scrollWidth,
			windowHeight: document.documentElement.scrollHeight,
		});
		const link = document.createElement("a");
		link.download = `${name || "card"}.png`;
		link.href = canvas.toDataURL();
		link.click();
	};

	return (
		<div
			className="d-flex justify-content-center align-items-center"
			style={{ marginTop: "2rem" }}
		>
			<div className="container mt-4">
				<h1 className="mb-3">DIY卡牌工具</h1>
				<p className="mb-3">
					制作自己的WS卡牌并导出为图片,
					目前只完成了角色，cx和事件的布局全部都需要大改
				</p>
				<div className="row">
					<div className="col-md-6">
						{/* カード名输入框单独放置且置顶 */}
						<div className="p-2 mb-3 border rounded">
							<label className="form-label">カード名</label>
							<input
								type="text"
								className="form-control"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div className="p-2 mb-3 border rounded">
							<label className="form-label">カード番号</label>
							<input
								type="text"
								className="form-control"
								value={id}
								onChange={(e) => setId(e.target.value)}
							/>
						</div>
						<div className="p-2 mb-3 border rounded">
							<label className="form-label">パワー</label>
							<input
								type="text"
								className="form-control"
								value={power}
								onChange={(e) => setPower(e.target.value)}
							/>
						</div>
						<div className="p-2 mb-3 border rounded">
							<label className="form-label">テキスト</label>
							<textarea
								className="form-control"
								rows="3"
								value={text}
								onChange={(e) => setText(e.target.value)}
							/>
							<p className="mt-1 small text-muted">
								可用指令：
								{Object.entries(symbolMap).map(([cmd, img], i) => (
									<span key={i} style={{ marginRight: 12 }}>
										<code>{cmd}</code>
										<img
											src={img}
											alt={cmd}
											style={{
												height: "1em",
												verticalAlign: "middle",
												marginLeft: "4px",
											}}
										/>
									</span>
								))}
								（输入对应指令，如 <code>/rest</code>，即可插入图标）
							</p>
						</div>
						<div className="p-2 mb-3 border rounded">
							<label className="form-label">フレーバー</label>
							<textarea
								className="form-control"
								rows="3"
								value={flavor}
								onChange={(e) => setFlavor(e.target.value)}
							/>
						</div>
						<div className="p-2 mb-3 border rounded">
							<label className="form-label">サイド</label>
							<div className="d-flex flex-wrap">
								{sideOptions.map((option) => (
									<div
										key={option.value}
										className="border rounded p-1 m-1 d-flex align-items-center"
										style={{
											cursor: "pointer",
											borderColor: side === option.value ? "#007bff" : "#ccc",
											backgroundColor:
												side === option.value ? "#e9f5ff" : "#fff",
										}}
										onClick={() =>
											setSide(side === option.value ? "" : option.value)
										}
									>
										<span
											style={{
												fontWeight: side === option.value ? "bold" : "normal",
											}}
										>
											{option.label}
										</span>
									</div>
								))}
							</div>
						</div>
						<div className="p-2 mb-3 border rounded">
							<label className="form-label">種類</label>
							<div className="d-flex flex-wrap">
								{cardTypeOptions.map((option) => (
									<div
										key={option.value}
										className="border rounded p-1 m-1 d-flex align-items-center"
										style={{
											cursor: "pointer",
											borderColor:
												cardType === option.value ? "#007bff" : "#ccc",
											backgroundColor:
												cardType === option.value ? "#e9f5ff" : "#fff",
										}}
										// onClick={() =>
										// 	setCardType(cardType === option.value ? "" : option.value)
										// }
									>
										<span
											style={{
												fontWeight:
													cardType === option.value ? "bold" : "normal",
											}}
										>
											{option.label}
										</span>
									</div>
								))}
							</div>
						</div>
						<div className="p-2 mb-3 border rounded">
							<label className="form-label">色</label>
							<div className="d-flex flex-wrap">
								{colorOptions.map((option) => (
									<div
										key={option.value}
										className="border rounded p-1 m-1 d-flex align-items-center"
										style={{
											cursor: "pointer",
											borderColor: color === option.value ? "#007bff" : "#ccc",
											backgroundColor:
												color === option.value ? "#e9f5ff" : "#fff",
										}}
										onClick={() =>
											setColor(color === option.value ? "" : option.value)
										}
									>
										<span
											style={{
												fontWeight: color === option.value ? "bold" : "normal",
											}}
										>
											{option.label}
										</span>
									</div>
								))}
							</div>
						</div>
						<div className="p-2 mb-3 border rounded">
							<label className="form-label">レベル</label>
							<div className="d-flex flex-wrap">
								{cardLevelOptions.map((option) => (
									<div
										key={option.value}
										className="border rounded p-1 m-1 d-flex align-items-center"
										style={{
											cursor: "pointer",
											borderColor:
												cardLevel === option.value ? "#007bff" : "#ccc",
											backgroundColor:
												cardLevel === option.value ? "#e9f5ff" : "#fff",
										}}
										onClick={() =>
											setCardLevel(
												cardLevel === option.value ? "" : option.value
											)
										}
									>
										<span
											style={{
												fontWeight:
													cardLevel === option.value ? "bold" : "normal",
											}}
										>
											{option.label}
										</span>
									</div>
								))}
							</div>
						</div>
						<div className="p-2 mb-3 border rounded">
							<label className="form-label">コスト</label>
							<div className="d-flex flex-wrap">
								{costOptions.map((option) => (
									<div
										key={option.value}
										className="border rounded p-1 m-1 d-flex align-items-center"
										style={{
											cursor: "pointer",
											borderColor: cost === option.value ? "#007bff" : "#ccc",
											backgroundColor:
												cost === option.value ? "#e9f5ff" : "#fff",
										}}
										onClick={() =>
											setCost(cost === option.value ? "" : option.value)
										}
									>
										<span
											style={{
												fontWeight: cost === option.value ? "bold" : "normal",
											}}
										>
											{option.label}
										</span>
									</div>
								))}
							</div>
						</div>

						<div className="p-2 mb-3 border rounded">
							<label className="form-label">ソウル</label>
							<div className="d-flex flex-wrap">
								{soulOptions.map((option) => (
									<div
										key={option.value}
										className={`border rounded p-1 m-1 d-flex align-items-center`}
										style={{
											cursor: "pointer",
											borderColor: soul === option.value ? "#007bff" : "#ccc",
											backgroundColor:
												soul === option.value ? "#e9f5ff" : "#fff",
										}}
										onClick={() =>
											setSoul(soul === option.value ? "" : option.value)
										}
									>
										<span
											style={{
												fontWeight: soul === option.value ? "bold" : "normal",
											}}
										>
											{option.label}
										</span>
									</div>
								))}
							</div>
						</div>
						<div className="p-2 mb-3 border rounded">
							<label className="form-label">トリガー</label>
							<div className="d-flex flex-wrap">
								{triggerOptions.map((opt) => (
									<div
										key={opt.value}
										className={`border rounded p-1 m-1 d-flex align-items-center`}
										style={{
											cursor: "pointer",
											borderColor: trigger === opt.value ? "#007bff" : "#ccc",
											backgroundColor:
												trigger === opt.value ? "#e9f5ff" : "#fff",
										}}
										onClick={() =>
											setTrigger(trigger === opt.value ? "" : opt.value)
										}
									>
										{opt.img && (
											<img
												src={opt.img}
												alt={opt.label}
												style={{
													width: "24px",
													height: "24px",
													marginRight: "6px",
												}}
											/>
										)}
										<span>{opt.label}</span>
									</div>
								))}
							</div>
						</div>
						<div className="p-2 mb-3 border rounded">
							<label className="form-label">特徴（最多2个）</label>
							<div className="d-flex flex-wrap mb-2">
								{traitCountOptions.map((opt) => (
									<div
										key={opt.value}
										className="border rounded p-1 m-1 d-flex align-items-center"
										style={{
											cursor: "pointer",
											borderColor:
												numberTraits === opt.value ? "#007bff" : "#ccc",
											backgroundColor:
												numberTraits === opt.value ? "#e9f5ff" : "#fff",
										}}
										onClick={() => {
											const value = opt.value;
											if (numberTraits === value) {
												setNumberTraits("0t");
												setTraits([]);
											} else {
												const count = parseInt(value);
												setNumberTraits(value);
												setTraits(Array(count).fill(""));
											}
										}}
									>
										<span
											style={{
												fontWeight:
													numberTraits === opt.value ? "bold" : "normal",
											}}
										>
											{opt.label}
										</span>
									</div>
								))}
							</div>
							{Array.from({ length: parseInt(numberTraits) || 0 }).map(
								(_, i) => (
									<input
										key={i}
										type="text"
										className="form-control mb-1"
										value={traits[i] || ""}
										onChange={(e) => {
											const newTraits = [...traits];
											newTraits[i] = e.target.value;
											setTraits(newTraits);
										}}
										placeholder={`特徴 ${i + 1}`}
									/>
								)
							)}
						</div>

						<div className="p-2 mb-3 border rounded">
							<label className="form-label">バックアップ</label>
							<div className="d-flex flex-wrap">
								{backupOptions.map((opt) => (
									<div
										key={opt.value}
										className="border rounded p-1 m-1 d-flex align-items-center"
										style={{
											cursor: "pointer",
											borderColor: backup === opt.value ? "#007bff" : "#ccc",
											backgroundColor:
												backup === opt.value ? "#e9f5ff" : "#fff",
										}}
										onClick={() => setBackup(opt.value)}
									>
										<span
											style={{
												fontWeight: backup === opt.value ? "bold" : "normal",
											}}
										>
											{opt.label}
										</span>
									</div>
								))}
							</div>
						</div>

						<div className="p-2 mb-3 border rounded">
							<label className="form-label">上传图片</label>
							<input
								type="file"
								className="form-control"
								accept="image/*"
								onChange={(e) =>
									setImage(URL.createObjectURL(e.target.files[0]))
								}
							/>
						</div>

						<button
							className="btn btn-primary mt-2 mb-4"
							onClick={handleExport}
						>
							导出卡牌
						</button>
					</div>
					<div className="col-md-6">
						<div
							className="preview-container"
							style={{ display: "flex", justifyContent: "center" }}
						>
							<div
								id="card-preview"
								style={{
									width: 448,
									height: 626,
									borderRadius: "22px",
									position: "relative",
									border: "1px solid #ccc",
									backgroundColor: "#fff",
									overflow: "hidden",
								}}
							>
								{cardType === "キャラ" && (
									<>
										{image && (
											<TransformWrapper
												initialScale={1}
												minScale={0.5}
												maxScale={4}
												wheel={{ step: 0.1 }}
												doubleClick={{ disabled: true }}
												pinch={{ step: 5 }}
												panning={{ velocityDisabled: true }}
											>
												<TransformComponent
													wrapperStyle={{
														position: "absolute",
														inset: 0,
														width: "100%",
														height: "100%",
														overflow: "hidden",
														zIndex: 1,
													}}
													contentStyle={{
														display: "flex",
														justifyContent: "center",
														alignItems: "center",
														width: "100%",
														height: "100%",
													}}
												>
													<img
														src={image}
														alt="卡图"
														style={{
															maxWidth: "100%",
															maxHeight: "100%",
															objectFit: "contain",
															touchAction: "none",
															userSelect: "none",
															pointerEvents: "auto",
														}}
													/>
												</TransformComponent>
											</TransformWrapper>
										)}
										<img
											src={`assets/${cardBottomBar}`}
											alt="Character"
											style={{
												position: "absolute",
												top: 0,
												left: 0,
												width: "100%",
												height: "100%",
												zIndex: 2,
												pointerEvents: "none",
											}}
										/>
										<img
											src={`assets/level/${levelMark}`}
											alt="level"
											style={{
												position: "absolute",
												top: 10,
												left: 15,
												zIndex: 2,
												pointerEvents: "none",
											}}
										/>
										<img
											src={`assets/cost/${costMark}`}
											alt="cost"
											style={{
												position: "absolute",
												top: 70,
												left: 15,
												zIndex: 2,
												pointerEvents: "none",
											}}
										/>
										<img
											src={`assets/backup/${backup}.png`}
											alt="backup"
											style={{
												position: "absolute",
												top: 120,
												left: 11,
												width: 56,
												height: 56,
												zIndex: 2,
												pointerEvents: "none",
											}}
										/>
										{trigger === "soul2" ? (
											<>
												<img
													src="assets/triggers/soul.png"
													alt="trigger1"
													style={{
														position: "absolute",
														top: 10,
														right: 59,
														zIndex: 2,
														pointerEvents: "none",
													}}
												/>
												<img
													src="assets/triggers/soul.png"
													alt="trigger2"
													style={{
														position: "absolute",
														top: 10,
														right: 10,
														zIndex: 2,
														pointerEvents: "none",
													}}
												/>
											</>
										) : (
											<img
												src={`assets/triggers/${trigger}.png`}
												alt="trigger"
												style={{
													position: "absolute",
													top: 10,
													right: 10,
													zIndex: 2,
													pointerEvents: "none",
												}}
											/>
										)}

										<div
											style={{
												position: "absolute",
												top: 554,
												left: 250,
												transform: "translateX(-50%)",
												fontWeight: "bold",
												color: "white",
												fontSize: 18,
												whiteSpace: "nowrap",
												textShadow: "1px 1px 2px black",
												fontFamily: "name_font",
												zIndex: 99,
											}}
										>
											{name}
										</div>
										<div
											style={{
												position: "absolute",
												fontWeight: "bolder",
												fontSize: 9,
												top: 550,
												left: 47,
												color: "#000",
												fontFamily: "name_font",
												zIndex: 99,
											}}
										>
											{id}
										</div>
										<div
											style={{
												position: "absolute",
												bottom: 20,
												left: 75,
												fontSize: 30,
												fontWeight: "light",
												fontFamily: "Times New Roman",
												color: "#ffffff",
												transform: "translateX(-50%)",
												zIndex: 99,
											}}
										>
											{power}
										</div>
										{/* Flavor text box above the main text */}
										<div
											style={{
												position: "absolute",
												left: "50%",
												transform: "translateX(-50%)",
												width: "390px",
												background:
													"linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.4) 60%, rgba(255,255,255,0.4) 60%, rgba(255,255,255,0))",
												padding: "2px 5px",
												fontSize: "16px",
												lineHeight: "1.4",
												color: "#000",
												fontFamily: "name_font",
												maxHeight: "100px",
												overflowY: "auto",
												whiteSpace: "pre-wrap",
												wordBreak: "break-word",
												overflowWrap: "break-word",
												zIndex: 3,
												bottom: `${80 + textBoxHeight + 5}px`,
												textAlign: "center",
											}}
										>
											{flavor}
										</div>
										{/* Transparent white background text box anchored to bottom */}
										<div
											ref={textBoxRef}
											style={{
												position: "absolute",
												bottom: 80,
												left: 30,
												width: "390px",
												backgroundColor: "rgba(255,255,255,0.3)",
												borderRadius: "4px",
												padding: "10px",
												fontSize: "12px",
												lineHeight: "1.4",
												color: "#000",
												fontFamily: "name_font",
												maxHeight: "300px",
												overflowY: "auto",
												whiteSpace: "pre-wrap",
												wordBreak: "break-word",
												overflowWrap: "break-word",
												zIndex: 3,
											}}
										>
											{parseTextWithIcons(text)}
										</div>
										{/* Traits at bottom left and right */}
										{/* 特徴1 */}
										{traits.length > 0 && traits[0] && (
											<div
												style={{
													position: "absolute",
													bottom: 22,
													right: 85,
													fontSize: "12px",
													fontWeight: "bold",
													fontFamily: "name_font",
													transform: "translateX(50%)",
													color: "#000",
													zIndex: 99,
												}}
											>
												{traits[0]}
											</div>
										)}
										{/* 特徴2 */}
										{traits.length > 1 && traits[1] && (
											<div
												style={{
													position: "absolute",
													bottom: 22,
													right: 185,
													fontSize: "12px",
													fontWeight: "bold",
													transform: "translateX(50%)",
													fontFamily: "name_font",
													color: "#000",
													zIndex: 99,
												}}
											>
												{traits[1]}
											</div>
										)}
									</>
								)}
							</div>
						</div>
						<div className="mt-3">
							<h5>调试信息</h5>
							<pre style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>
								{JSON.stringify(
									{
										name,
										id,
										power,
										traits,
										numberTraits,
										flavor,
										text,
										side,
										cardType,
										color,
										cardLevel,
										cost,
										soul,
										trigger,
										backup,
										bgTemplate,
										cardBottomBar,
										levelMark,
										costMark,
										imageLoaded: !!image,
									},
									null,
									2
								)}
							</pre>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default DIY;
