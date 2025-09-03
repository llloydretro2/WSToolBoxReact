import React, { useState, useEffect } from "react";
import seedrandom from "seedrandom";
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
import d4dj from "../assets/d4dj.png";
import d4djsp from "../assets/d4djsp.png";
import revuebox from "../assets/revuebox.png";
import daibananasp from "../assets/daibananasp.png";
import bangdream5thbox from "../assets/bangdream5thbox.png";
import yamabukissp from "../assets/yamabukissp.png";
import wscollection from "../assets/wscollection.png";

function PickPacks() {
	const [totalPacks, setTotalPacks] = useState("");
	const [openPacks, setOpenPacks] = useState("");
	const [seed, setSeed] = useState("");
	const [results, setResults] = useState([]);
	const [errorOpen, setErrorOpen] = useState(false);
	const [showDetails, setShowDetails] = useState(false);

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
		<Container maxWidth="md">
			<Box display="flex" flexDirection="column" alignItems="center" my={4}>
				<Typography variant="h4" gutterBottom>
					随机开包
				</Typography>
				<Typography variant="body1" color="text.secondary" align="center">
					请输入总包数和开启的包数
				</Typography>
			</Box>
			<Grid container spacing={2} justifyContent="center" mb={4}>
				<Grid item xs={12} sm={6} md={4}>
					<TextField
						type="number"
						label="开启包数"
						variant="outlined"
						fullWidth
						value={openPacks}
						onChange={(e) => setOpenPacks(e.target.value)}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={4}>
					<TextField
						type="number"
						label="总包数"
						variant="outlined"
						fullWidth
						value={totalPacks}
						onChange={(e) => setTotalPacks(e.target.value)}
					/>
				</Grid>
			</Grid>
			<Box display="flex" justifyContent="center" mb={4} gap={2}>
				<Button
					variant="contained"
					size="large"
					onClick={randomGeneratePacks}
					sx={{ bgcolor: "#a6ceb6", "&:hover": { bgcolor: "#8fbf9f" } }}
				>
					开包
				</Button>

				<Button
					variant="contained"
					size="large"
					onClick={clearPage}
					sx={{ bgcolor: "#a6ceb6", "&:hover": { bgcolor: "#8fbf9f" } }}
				>
					重置
				</Button>
			</Box>
			{totalPacks > 0 && (
				<Box display="flex" flexDirection="column" alignItems="center" mb={4}>
					<Grid container spacing={2} justifyContent="center">
						{Array.from({ length: parseInt(totalPacks) }, (_, i) => i + 1).map(
							(pack) => (
								<Grid item key={pack} xs={4} sm={3} md={2}>
									<Box
										display="flex"
										flexDirection="column"
										alignItems="center"
									>
										<img
											src={packImage}
											alt={`Pack ${pack}`}
											style={{
												width: "100%",
												maxWidth: "100%",
												height: "auto",
												objectFit: "contain",
												opacity:
													results.length > 0 && !results.includes(pack)
														? 0.3
														: 1,
											}}
										/>
										<Box
											sx={{
												backgroundColor: "#a6ceb6",
												color: "white",
												borderRadius: "50%",
												width: 24,
												height: 24,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												mt: 1,
												opacity:
													results.length > 0 && !results.includes(pack) ? 0 : 1,
											}}
										>
											<Typography variant="caption">{pack}</Typography>
										</Box>
									</Box>
								</Grid>
							)
						)}
					</Grid>
				</Box>
			)}

			{/* 小记 */}
			<Box display="flex" justifyContent="center" mb={4}>
				<Box
					sx={{
						position: "relative",
						borderRadius: 4,
						padding: 2,
						textAlign: "center",
						overflow: "hidden",
					}}
				>
					<Box
						sx={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
							backgroundColor: "#a6ceb6",
							opacity: 0.6,
							zIndex: 0,
						}}
					/>
					<Box sx={{ position: "relative", zIndex: 1 }}>
						<Box
							display="flex"
							flexDirection="row"
							alignItems="center"
							alignContent="center"
							justifyContent="center"
						>
							<img src={temari} alt="Temari" style={{ height: "1.5rem" }} />
							<Typography variant="h5">
								这个随机开包器有什么特别的吗？
							</Typography>
						</Box>
						<Box
							display="flex"
							flexDirection="row"
							alignItems="center"
							alignContent="center"
							justifyContent="center"
						>
							<img src={lilja} alt="Lilja" style={{ height: "3rem" }} />
							<Typography variant="h3">完全没有！</Typography>
						</Box>
						<Typography variant="body1" mb={4}>
							就是普通的随机数生成器只不过我设定了一个和我有关的会随着时间会变化的种子
						</Typography>
						<Box
							display="flex"
							flexDirection="row"
							alignItems="center"
							alignContent="center"
							justifyContent="center"
						>
							<img src={temari} alt="Temari" style={{ height: "1.5rem" }} />
							<Typography variant="h5">
								那我为什么应该用这个随机开包器？
							</Typography>
						</Box>
						<Box
							display="flex"
							flexDirection="row"
							alignItems="center"
							alignContent="center"
							justifyContent="center"
						>
							<img src={lilja} alt="Lilja" style={{ height: "3rem" }} />
							<Typography variant="body1">
								这个话自己来说可能有点奇怪，但是主播的开包运气是中美好友一致认证的逆天，以下为截止2025年8月的战绩，除了个别为和好友交换和花钱收的之外（SIR确实开不出来），开包平均3盒一个SP/SSP
							</Typography>
						</Box>
						<Box
							display="flex"
							flexDirection="row"
							justifyContent="center"
							gap={2}
							sx={{ flexWrap: "wrap" }}
						>
							<Box
								component="img"
								src={wscollection}
								alt="WS Collection"
								sx={{
									maxWidth: 500,
									height: "auto",
									width: "100%",
									objectFit: "contain",
								}}
							/>
						</Box>
						<Typography variant="body1" mt={2}>
							点击展开即可查看主播的传奇开包历程
						</Typography>
						{showDetails && (
							<>
								<Typography variant="h5" mt={2}>
									故事从2023年5月3日开始，主播在朋友的推荐下入坑了WS，从ebay的一个随机商家买下了我人生中的第一个D4DJ预组并开出了第一个SP从此开始了罪恶的开包生涯
								</Typography>
								<Box
									display="flex"
									flexDirection="row"
									justifyContent="center"
									gap={2}
									sx={{ flexWrap: "wrap" }}
								>
									<Box
										component="img"
										src={d4dj}
										alt="First Pack"
										sx={{
											maxWidth: 250,
											height: "auto",
											objectFit: "contain",
										}}
									/>
									<Box
										component="img"
										src={d4djsp}
										alt="First SP"
										sx={{
											maxWidth: 250,
											height: "auto",
											objectFit: "contain",
										}}
									/>
								</Box>
								<Typography variant="h5" mt={2}>
									在这之后主播对少女歌剧很有兴趣，但是当时英文剧场版未出，我非常不理智的在tcgplayer上220美元冲动消费买下了少女歌剧TV版的一个残盒
								</Typography>
								<Box
									display="flex"
									flexDirection="row"
									justifyContent="center"
									gap={2}
									sx={{ flexWrap: "wrap" }}
								>
									<Box
										component="img"
										src={revuebox}
										alt="First Pack"
										sx={{
											maxWidth: 500,
											width: "100%",
											height: "auto",
											objectFit: "contain",
										}}
									/>
								</Box>
								<Typography variant="h5" mt={2}>
									结果开出了价值350美元的大場ななSP
								</Typography>
								<Box
									display="flex"
									flexDirection="row"
									justifyContent="center"
									gap={2}
									sx={{ flexWrap: "wrap" }}
								>
									<Box
										component="img"
										src={daibananasp}
										alt="First SP"
										sx={{
											maxWidth: 250,
											width: "50%",
											height: "auto",
											objectFit: "contain",
										}}
									/>
									<iframe
										title="daibanana-video"
										src="https://player.bilibili.com/player.html?bvid=BV1yg4y1V72g&page=1&autoplay=0"
										border="0"
										framespacing="0"
										allowFullScreen
										style={{
											width: "50%",
											height: "auto",
										}}
									></iframe>
								</Box>
								<Typography variant="h5" mt={2}>
									这个确实很逆天，我都不知道自己当时到底怎么想的，但是还没有结束
									<br />
									当时正好是邦邦五周年，为了能有一个有点强度的卡组，我购入了两盒五周年
								</Typography>
								<Box
									display="flex"
									flexDirection="row"
									justifyContent="center"
									gap={2}
									sx={{ flexWrap: "wrap" }}
								>
									<Box
										component="img"
										src={bangdream5thbox}
										alt="First Pack"
										sx={{
											maxWidth: 500,
											width: "100%",
											height: "auto",
											objectFit: "contain",
										}}
									/>
								</Box>
								<Typography variant="h5" mt={2}>
									战绩如下：
								</Typography>
								<Box
									display="flex"
									flexDirection="row"
									justifyContent="center"
									gap={2}
									sx={{ flexWrap: "wrap" }}
								>
									<Box
										component="img"
										src={yamabukissp}
										alt="yamabukissp"
										sx={{
											maxWidth: 250,
											width: "50%",
											height: "auto",
											objectFit: "contain",
										}}
									/>
									<iframe
										title="yamabuki-video"
										src="https://player.bilibili.com/player.html?bvid=BV13u4y1f7LE&page=1&autoplay=0"
										border="0"
										framespacing="0"
										allowFullScreen
										style={{
											width: "50%",
											height: "auto",
										}}
									></iframe>
								</Box>
								<Typography variant="h5" mt={2}>
									这张卡价格多少现在我不清楚，不过开到的时候查到是450美元，我最后一次看到成交纪录是500美元
								</Typography>
							</>
						)}

						<Box textAlign="center" mt={2}>
							<Button
								variant="outlined"
								onClick={() => setShowDetails(!showDetails)}
							>
								{showDetails ? "收起" : "展开"}
							</Button>
						</Box>
					</Box>
				</Box>
			</Box>
			<Snackbar
				open={errorOpen}
				autoHideDuration={5000}
				onClose={() => setErrorOpen(false)}
			>
				<MuiAlert
					onClose={() => setErrorOpen(false)}
					severity="error"
					sx={{ width: "100%" }}
				>
					请输入有效的包数
				</MuiAlert>
			</Snackbar>
		</Container>
	);
}

export default PickPacks;
