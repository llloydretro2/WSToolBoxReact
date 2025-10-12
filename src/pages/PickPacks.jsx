import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import seedrandom from "seedrandom";
import { useLocale } from "../contexts/LocaleContext";
import {
	Container,
	Box,
	TextField,
	Button,
	Typography,
	Grid,
} from "@mui/material";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import packImage from "../assets/765_box.png";
import temari from "../assets/tiny_temari.png";
import lilja from "../assets/tiny_lilja.png";
import wscollection from "../assets/wscollection.png";

function PickPacks() {
	const { t } = useLocale();
	const [totalPacks, setTotalPacks] = useState("");
	const [openPacks, setOpenPacks] = useState("");
	const [seed, setSeed] = useState("");
	const [results, setResults] = useState([]);
	const [errorOpen, setErrorOpen] = useState(false);

	useEffect(() => {
		const saved = localStorage.getItem("pickpacks");
		if (saved) {
			const { total, open, seed, results } = JSON.parse(saved);
			setTotalPacks(total);
			setOpenPacks(open);
			setSeed(seed);
			setResults(results);
		}
	}, []);

	const clearPage = () => {
		setTotalPacks("");
		setOpenPacks("");
		setSeed("");
		setResults([]);
		localStorage.removeItem("pickpacks");
	};

	const randomGeneratePacks = () => {
		const total = parseInt(totalPacks);
		const open = parseInt(openPacks);

		const currentDate = new Date().getTime();
		const timestamp = new Date("2001-12-11").getTime();
		const differenceSeed = currentDate - timestamp;
		setSeed(differenceSeed);

		if (
			open > total ||
			isNaN(total) ||
			isNaN(open) ||
			total <= 0 ||
			open <= 0
		) {
			setErrorOpen(true);
			return;
		}

		const rng = seedrandom(seed.toString());
		const available = new Set(Array.from({ length: total }, (_, i) => i + 1));
		const selected = [];

		while (selected.length < open) {
			const index = Math.floor(rng() * available.size);
			const value = Array.from(available)[index];
			available.delete(value);
			selected.push(value);
		}

		selected.sort((a, b) => a - b);
		setResults(selected);
		localStorage.setItem(
			"pickpacks",
			JSON.stringify({
				total: totalPacks,
				open: openPacks,
				seed,
				results: selected,
			})
		);
	};

	return (
		<Container maxWidth="lg">
			<Box
				display="flex"
				flexDirection="column"
				alignItems="center"
				mb={4}>
				<Typography
					variant="h4"
					fontWeight={700}
					color="#1b4332"
					gutterBottom>
					{t("pages.pickPacks.title")}
				</Typography>
				<Typography
					variant="body1"
					color="text.secondary"
					align="center">
					{t("pages.pickPacks.subtitle")}
				</Typography>
			</Box>

			{/* 输入表单 */}
			<Box
				sx={{
					mb: 4,
					p: 3,
					backgroundColor: "rgba(27, 67, 50, 0.1)",
					borderRadius: 3,
					boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
					border: "1px solid rgba(27, 67, 50, 0.2)",
				}}>
				<Grid
					container
					spacing={3}
					justifyContent="center"
					alignItems="center">
					{/* 第一行：输入框 */}
					<Grid size={{ xs: 12, sm: 6, md: 6 }}>
						<TextField
							type="number"
							label={t("pages.pickPacks.openPacks")}
							variant="outlined"
							fullWidth
							value={openPacks}
							onChange={(e) => setOpenPacks(e.target.value)}
							sx={{
								"& .MuiOutlinedInput-root": {
									"&:hover fieldset": {
										borderColor: "#a6ceb6",
									},
									"&.Mui-focused fieldset": {
										borderColor: "#a6ceb6",
									},
								},
							}}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6, md: 6 }}>
						<TextField
							type="number"
							label={t("pages.pickPacks.totalPacks")}
							variant="outlined"
							fullWidth
							value={totalPacks}
							onChange={(e) => setTotalPacks(e.target.value)}
							sx={{
								"& .MuiOutlinedInput-root": {
									"&:hover fieldset": {
										borderColor: "#a6ceb6",
									},
									"&.Mui-focused fieldset": {
										borderColor: "#a6ceb6",
									},
								},
							}}
						/>
					</Grid>

					{/* 第二行：按钮 */}
					<Grid size={{ xs: 12 }}>
						<Box
							display="flex"
							justifyContent="center"
							alignItems="center"
							gap={3}
							sx={{ mt: 2 }}>
							<motion.div
								whileHover={{ scale: 1.05, rotate: 1 }}
								whileTap={{ scale: 0.95 }}
								transition={{ type: "spring", stiffness: 400, damping: 17 }}>
								<Button
									variant="contained"
									size="large"
									onClick={randomGeneratePacks}
									sx={{
										backgroundColor: "#1b4332",
										color: "white",
										"&:hover": { backgroundColor: "#2d5a42" },
										px: 4,
										py: 1.5,
										minWidth: 140,
										width: 140,
										height: 48,
										fontSize: "1rem",
									}}>
									{t("pages.pickPacks.openButton")}
								</Button>
							</motion.div>

							<motion.div
								whileHover={{ scale: 1.05, rotate: -1 }}
								whileTap={{ scale: 0.95 }}
								transition={{ type: "spring", stiffness: 400, damping: 17 }}>
								<Button
									variant="contained"
									size="large"
									onClick={clearPage}
									sx={{
										backgroundColor: "#760f10",
										color: "white",
										"&:hover": {
											backgroundColor: "#5c0f10",
										},
										px: 4,
										py: 1.5,
										minWidth: 140,
										width: 140,
										height: 48,
										fontSize: "1rem",
									}}>
									{t("pages.pickPacks.resetButton")}
								</Button>
							</motion.div>
						</Box>
					</Grid>
				</Grid>
			</Box>

			{/* 包图标展示区 */}
			{totalPacks > 0 && (
				<Box
					sx={{
						mb: 4,
						p: 3,
						backgroundColor: "rgba(255, 255, 255, 0.95)",
						borderRadius: 3,
						boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
					}}>
					<Typography
						variant="h6"
						sx={{ mb: 3, textAlign: "center", color: "#1b4332" }}>
						包选择结果 (
						{results.length > 0 ? `已选择 ${results.length} 包` : "等待选择"})
					</Typography>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: {
								xs: "repeat(auto-fill, minmax(60px, 1fr))",
								sm: "repeat(auto-fill, minmax(80px, 1fr))",
								md: "repeat(auto-fill, minmax(100px, 1fr))",
							},
							gap: 2,
							justifyItems: "center",
						}}>
						{Array.from({ length: parseInt(totalPacks) }, (_, i) => i + 1).map(
							(pack) => {
								const isSelected = results.includes(pack);
								const isUnselected = results.length > 0 && !isSelected;

								return (
									<Box
										key={pack}
										sx={{
											position: "relative",
											display: "flex",
											flexDirection: "column",
											alignItems: "center",
											transition: "all 0.3s ease",
											transform: isSelected ? "scale(1.1)" : "scale(1)",
											opacity: isUnselected ? 0.3 : 1,
											"&:hover": {
												transform: isSelected ? "scale(1.15)" : "scale(1.05)",
											},
										}}>
										{/* 包图片 */}
										<Box
											sx={{
												position: "relative",
												width: { xs: 50, sm: 70, md: 90 },
												height: { xs: 50, sm: 70, md: 90 },
												overflow: "hidden",
											}}>
											<img
												src={packImage}
												alt={`Pack ${pack}`}
												style={{
													width: "100%",
													height: "100%",
													objectFit: "contain",
												}}
											/>
											{isSelected && (
												<Box
													sx={{
														position: "absolute",
														top: 0,
														left: 0,
														width: "100%",
														height: "100%",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
													}}>
													<Box
														sx={{
															backgroundColor: "#1b4332",
															color: "white",
															borderRadius: "50%",
															width: 24,
															height: 24,
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
															fontSize: "0.8rem",
															fontWeight: "bold",
														}}>
														✓
													</Box>
												</Box>
											)}
										</Box>

										{/* 包编号 */}
										<Typography
											variant="caption"
											sx={{
												mt: 1,
												px: 1,
												py: 0.5,
												backgroundColor: isSelected ? "#1b4332" : "#f5f5f5",
												color: isSelected ? "white" : "#666",
												borderRadius: 1,
												fontWeight: isSelected ? "bold" : "normal",
												fontSize: { xs: "0.7rem", sm: "0.75rem" },
											}}>
											{pack}
										</Typography>
									</Box>
								);
							}
						)}
					</Box>

					{/* 结果统计 */}
					{results.length > 0 && (
						<Box
							sx={{
								mt: 3,
								p: 2,
								backgroundColor: "rgba(27, 67, 50, 0.08)",
								borderRadius: 2,
								textAlign: "center",
							}}>
							<Typography
								variant="body1"
								sx={{ color: "#1b4332" }}>
								<strong>选中的包：</strong>
								{results.map((pack, index) => (
									<span key={pack}>
										{pack}
										{index < results.length - 1 ? ", " : ""}
									</span>
								))}
							</Typography>
						</Box>
					)}
				</Box>
			)}

			{/* 小记 */}
			<Box
				sx={{
					display: "flex",
					justifyContent: "center",
					mb: 4,
				}}>
				<Box
					sx={{
						maxWidth: { xs: "100%", sm: "90%", md: "800px" },
						width: "100%",
						p: 4,
						backgroundColor: "rgba(255, 255, 255, 0.95)",
						borderRadius: 3,
						boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
						position: "relative",
						overflow: "hidden",
					}}>
					{/* 背景装饰 */}
					<Box
						sx={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
							background:
								"linear-gradient(135deg, rgba(166,206,182,0.1) 0%, rgba(255,255,255,0.1) 100%)",
							zIndex: 0,
						}}
					/>

					<Box sx={{ position: "relative", zIndex: 1 }}>
						{/* 标题对话 */}
						<Box
							sx={{
								display: "flex",
								flexDirection: "column",
								gap: 3,
								mb: 4,
							}}>
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 2,
									p: 2,
									backgroundColor: "rgba(166, 206, 182, 0.1)",
									borderRadius: 2,
									borderLeft: "4px solid #a6ceb6",
								}}>
								<img
									src={temari}
									alt="Temari"
									style={{ height: "2rem", flexShrink: 0 }}
								/>
								<Typography
									variant="h6"
									sx={{ color: "#1b4332" }}>
									这个随机开包器有什么特别的吗？
								</Typography>
							</Box>

							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 2,
									p: 2,
									backgroundColor: "rgba(118, 15, 16, 0.1)",
									borderRadius: 2,
									borderLeft: "4px solid #760f10",
								}}>
								<img
									src={lilja}
									alt="Lilja"
									style={{ height: "3rem", flexShrink: 0 }}
								/>
								<Typography
									variant="h5"
									sx={{ color: "#760f10", fontWeight: "bold" }}>
									完全没有！
									<br />{" "}
									就是普通的随机数生成器只不过我设定了一个和我有关的会随着时间会变化的种子
								</Typography>
							</Box>
						</Box>

						{/* 第二轮对话 */}
						<Box
							sx={{
								display: "flex",
								flexDirection: "column",
								gap: 3,
								mb: 4,
							}}>
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 2,
									p: 2,
									backgroundColor: "rgba(166, 206, 182, 0.1)",
									borderRadius: 2,
									borderLeft: "4px solid #a6ceb6",
								}}>
								<img
									src={temari}
									alt="Temari"
									style={{ height: "2rem", flexShrink: 0 }}
								/>
								<Typography
									variant="h6"
									sx={{ color: "#1b4332" }}>
									那我为什么应该用这个随机开包器？
								</Typography>
							</Box>

							<Box
								sx={{
									p: 3,
									backgroundColor: "rgba(118, 15, 16, 0.05)",
									borderRadius: 2,
									border: "1px solid rgba(118, 15, 16, 0.1)",
								}}>
								<Box
									sx={{
										display: "flex",
										alignItems: "flex-start",
										gap: 2,
										mb: 3,
									}}>
									<img
										src={lilja}
										alt="Lilja"
										style={{
											height: "3rem",
											flexShrink: 0,
											marginTop: "0.5rem",
										}}
									/>
									<Typography
										variant="h6"
										sx={{ lineHeight: 1.6 }}>
										请看战绩⬇️平均3盒一个SP/SSP，只买散盒
									</Typography>
								</Box>

								{/* 收藏图片 */}
								<Box
									sx={{
										display: "flex",
										justifyContent: "center",
										mb: 3,
									}}>
									<Box
										component="img"
										src={wscollection}
										alt="WS Collection"
										sx={{
											maxWidth: "100%",
											height: "auto",
											borderRadius: 2,
											boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
										}}
									/>
								</Box>
							</Box>
						</Box>
					</Box>
				</Box>
			</Box>

			{/* 错误提示 */}
			<Snackbar
				open={errorOpen}
				autoHideDuration={5000}
				onClose={() => setErrorOpen(false)}>
				<MuiAlert
					onClose={() => setErrorOpen(false)}
					severity="error"
					sx={{ width: "100%" }}>
					{t("pages.pickPacks.errorMessage")}
				</MuiAlert>
			</Snackbar>
		</Container>
	);
}

export default PickPacks;
