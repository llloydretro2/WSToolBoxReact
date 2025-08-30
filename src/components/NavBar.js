import React, { useState } from "react";
import "./NavBar.css";

function NavBar() {
	const [menuOpen, setMenuOpen] = useState(false);

	return (
		<nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
			<div className="container-fluid 10px">
				<div className="logo navbar-brand">WS工具箱</div>

				<button
					className="navbar-toggler"
					type="button"
					onClick={() => setMenuOpen(!menuOpen)}
				>
					<span className="navbar-toggler-icon"></span>
				</button>

				<div className={`collapse navbar-collapse ${menuOpen ? "show" : ""}`}>
					<ul className="navbar-nav ms-auto">
						<li className="nav-item">
							<a className="nav-link" href="/">
								主页
							</a>
						</li>
						<li className="nav-item">
							<a className="nav-link" href="/pick_packs">
								选择开包
							</a>
						</li>
						<li className="nav-item">
							<a className="nav-link" href="/first_second">
								先后攻
							</a>
						</li>
						<li className="nav-item">
							<a className="nav-link" href="/dice">
								骰子
							</a>
						</li>
						<li className="nav-item">
							<a className="nav-link" href="/chess_clock">
								棋钟
							</a>
						</li>
						<li className="nav-item">
							<a className="nav-link" href="/shuffle">
								随机洗牌
							</a>
						</li>
						<li className="nav-item">
							<a className="nav-link" href="/diy">
								卡片DIY
							</a>
						</li>
					</ul>
				</div>
			</div>
		</nav>
	);
}

export default NavBar;
