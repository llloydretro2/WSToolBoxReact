import React, { useState } from "react";
import Avatar from "@mui/material/Avatar";
import {
	AppBar,
	Toolbar,
	IconButton,
	Typography,
	Drawer,
	List,
	ListItem,
	ListItemText,
	Box,
	Button,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

const navItems = [
	{ label: "主页", path: "/" },
	{ label: "卡片查询", path: "/cardlist" },
	{ label: "模拟开包", path: "/simulator" },
	{ label: "选择开包", path: "/pick_packs" },
	{ label: "先后攻", path: "/first_second" },
	{ label: "骰子", path: "/dice" },
	{ label: "棋钟", path: "/chess_clock" },
	{ label: "随机洗牌", path: "/shuffle" },
	// { label: "卡片DIY", path: "/diy" },
];

function NavBar() {
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [isLoggedIn] = useState(false); // 模拟登录状态

	const toggleDrawer = (open) => (event) => {
		if (
			event.type === "keydown" &&
			(event.key === "Tab" || event.key === "Shift")
		) {
			return;
		}
		setDrawerOpen(open);
	};

	const drawer = (
		<Box
			sx={{ maxWidth: 300, width: "50vw" }}
			role="presentation"
			onClick={toggleDrawer(false)}
			onKeyDown={toggleDrawer(false)}
		>
			<List>
				{navItems.map((item) => (
					<ListItem button key={item.label} component="a" href={item.path}>
						<ListItemText primary={item.label} />
					</ListItem>
				))}
			</List>
		</Box>
	);

	return (
		<>
			<AppBar position="fixed" sx={{ backgroundColor: "#a6ceb6" }}>
				<Toolbar>
					<Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
						WS工具箱
					</Typography>
					<Box sx={{ display: { xs: "none", md: "flex" } }}>
						{navItems.map((item) => (
							<Button key={item.label} color="inherit" href={item.path}>
								{item.label}
							</Button>
						))}
					</Box>
					<Box sx={{ display: { xs: "flex", md: "none" } }}>
						<IconButton
							color="inherit"
							edge="start"
							onClick={toggleDrawer(true)}
						>
							<MenuIcon />
						</IconButton>
					</Box>
					{isLoggedIn ? (
						<Avatar
							alt="User"
							src="/static/images/avatar/1.jpg"
							sx={{ ml: 2 }}
						/>
					) : (
						<Button
							color="inherit"
							sx={{ ml: 2 }}
							onClick={() => (window.location.href = "/login")}
						>
							登录
						</Button>
					)}
				</Toolbar>
			</AppBar>
			<Toolbar />
			<Drawer
				anchor="left"
				open={drawerOpen}
				onClose={toggleDrawer(false)}
				sx={{
					"& .MuiDrawer-paper": {
						backgroundColor: "rgba(166, 206, 182)", // 自定义背景色
						color: "white", // 自定义文字颜色
					},
					"& .MuiListItemText-root": {
						color: "white",
					},
					"& .MuiButtonBase-root": {
						color: "white",
					},
				}}
			>
				{drawer}
			</Drawer>
		</>
	);
}

export default NavBar;
