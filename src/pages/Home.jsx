import React from "react";
import {
	Container,
	Typography,
	Link,
	Box,
	CardContent,
	Grid,
	IconButton,
	Chip,
	Fade,
	Paper,
} from "@mui/material";
import {
	GitHub as GitHubIcon,
	Email as EmailIcon,
	Update as UpdateIcon,
	Assignment as TodoIcon,
} from "@mui/icons-material";
import { useLocale } from "../contexts/LocaleContext";

// 硬编码的TODO项目列表
const todoItems = [
	"导出对战记录",
	"导出卡组为图片",
	"伤害计算器",
	"更多战绩统计",
];

function Home() {
	const { t } = useLocale();

	return (
		<Box
			sx={{
				minHeight: "100%", // 使用100%而不是视口高度
			}}>
			{/* 标题区域 */}
			<Box
				sx={{
					color: "var(--text)",
					py: 4,
					textAlign: "center",
					position: "relative",
				}}>
				<Container
					maxWidth="md"
					sx={{ position: "relative", zIndex: 1 }}>
					<Fade
						in
						timeout={1200}>
						<Typography
							variant="h2"
							fontWeight={900}
							sx={{
								mb: 2,
								color: "var(--text)",
								fontSize: { xs: "2.5rem", md: "3.5rem" },
							}}>
							{t("pages.home.title")}
						</Typography>
					</Fade>

					<Fade
						in
						timeout={1400}>
						<Typography
							variant="h5"
							sx={{
								mb: 2,
								opacity: 0.8,
								fontWeight: 300,
								letterSpacing: 1,
								fontSize: { xs: "1.2rem", md: "1.5rem" },
								color: "text.secondary",
							}}>
							{t("pages.home.subtitle")}
						</Typography>
					</Fade>
				</Container>
			</Box>

			<Container
				maxWidth="md"
				sx={{ py: 2 }}>
				{/* 信息卡片区域 */}
				<Grid
					container
					spacing={4}
					sx={{ mb: 4, justifyContent: "center" }}>
					{/* 更新内容 */}
					<Grid size={{ xs: 12, sm: 10, md: 6 }}>
						<Fade
							in
							timeout={1000}>
							<Paper
								elevation={0}
								sx={{
									height: "100%",
									background:
										"linear-gradient(135deg, var(--primary-light), var(--primary))",
									backdropFilter: "blur(10px)",
									border: "1px solid var(--border)",
									borderRadius: 3,
									transition: "all 0.3s ease",
									"&:hover": {
										transform: "translateY(-4px)",
										boxShadow: "0 12px 30px rgba(0, 0, 0, 0.2)",
									},
								}}>
								<CardContent sx={{ p: 4 }}>
									<Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
										<UpdateIcon
											sx={{ fontSize: 32, color: "var(--text)", mr: 2 }}
										/>
										<Typography
											variant="h5"
											fontWeight={700}
											color="var(--text)">
											{t("pages.home.updateTitle")}
										</Typography>
									</Box>
									<Box
										sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
										<Chip
											label="BA动画"
											size="medium"
											sx={{
												bgcolor: "var(--card-background)",
												color: "var(--text)",
												fontWeight: 600,
												alignSelf: "flex-start",
											}}
										/>
									</Box>
								</CardContent>
							</Paper>
						</Fade>
					</Grid>

					{/* 待办事项 */}
					<Grid size={{ xs: 12, sm: 10, md: 6 }}>
						<Fade
							in
							timeout={1200}>
							<Paper
								elevation={0}
								sx={{
									height: "100%",
									background: "var(--surface)",
									backdropFilter: "blur(10px)",
									border: "1px solid var(--border)",
									borderRadius: 3,
									transition: "all 0.3s ease",
									"&:hover": {
										transform: "translateY(-4px)",
										boxShadow: "0 12px 30px rgba(0, 0, 0, 0.1)",
									},
								}}>
								<CardContent sx={{ p: 4 }}>
									<Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
										<TodoIcon
											sx={{ fontSize: 32, color: "var(--text)", mr: 2 }}
										/>
										<Typography
											variant="h5"
											fontWeight={700}
											color="var(--text)">
											{t("pages.home.todoTitle")}
										</Typography>
									</Box>
									<Box
										sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
										{todoItems.map((item, index) => (
											<Typography
												key={index}
												variant="body1"
												color="text.secondary"
												sx={{
													display: "flex",
													alignItems: "center",
													"&:before": {
														content: '"•"',
														color: "var(--text)",
														fontWeight: "bold",
														fontSize: "1.2rem",
														marginRight: 2,
													},
												}}>
												{item}
											</Typography>
										))}
									</Box>
								</CardContent>
							</Paper>
						</Fade>
					</Grid>
				</Grid>

				{/* 社交链接区域 */}
				<Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
					<Box sx={{ width: "100%", maxWidth: "400px" }}>
						<Fade
							in
							timeout={1400}>
							<Box sx={{ textAlign: "center", py: 2 }}>
								<Typography
									variant="body2"
									fontWeight={600}
									color="var(--text)"
									sx={{ mb: 1 }}>
									{t("pages.home.contactTitle")}
								</Typography>
								<Box
									sx={{
										display: "flex",
										justifyContent: "center",
										gap: 2,
										flexWrap: "wrap",
									}}>
									<IconButton
										component={Link}
										href="https://github.com/llloydretro2/WSToolBoxReact"
										target="_blank"
										rel="noopener"
										sx={{
											width: 40,
											height: 40,
											background:
												"linear-gradient(135deg, var(--text), var(--text-secondary))",
											color: "white",
											"&:hover": {
												background:
													"linear-gradient(135deg, var(--text-secondary), var(--text))",
												transform: "scale(1.1)",
												boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
											},
											transition: "all 0.3s ease",
										}}>
										<GitHubIcon sx={{ fontSize: 20 }} />
									</IconButton>

									<IconButton
										component={Link}
										href="https://space.bilibili.com/13365744"
										target="_blank"
										rel="noopener"
										sx={{
											width: 40,
											height: 40,
											background:
												"linear-gradient(135deg, var(--info), var(--primary-dark))",
											color: "white",
											"&:hover": {
												background:
													"linear-gradient(135deg, var(--primary-dark), var(--info))",
												transform: "scale(1.1)",
												boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
											},
											transition: "all 0.3s ease",
										}}>
										<img
											src="bilibili.svg"
											alt="Bilibili"
											width={18}
											height={18}
											style={{ filter: "brightness(0) invert(1)" }}
										/>
									</IconButton>

									<IconButton
										component={Link}
										href="mailto:lloydretro2@example.com"
										sx={{
											width: 40,
											height: 40,
											background:
												"linear-gradient(135deg, var(--primary), var(--primary-hover))",
											color: "white",
											"&:hover": {
												background:
													"linear-gradient(135deg, var(--primary-hover), var(--primary))",
												transform: "scale(1.1)",
												boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
											},
											transition: "all 0.3s ease",
										}}>
										<EmailIcon sx={{ fontSize: 20 }} />
									</IconButton>
								</Box>
							</Box>
						</Fade>
					</Box>
				</Box>
			</Container>
		</Box>
	);
}

export default Home;
