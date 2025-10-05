import React from "react";
import {
	BrowserRouter as Router,
	Routes,
	Route,
	useLocation,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import NavBar from "./components/NavBar";
import PageTransition from "./components/PageTransition";
import { AnimatePresence } from "framer-motion";
import Home from "./pages/Home";
import Dice from "./pages/Dice";
import Tracker from "./pages/Tracker";
import PickPacks from "./pages/PickPacks";
import FirstSecond from "./pages/FirstSecond";
import ChessClock from "./pages/ChessClock";
import DIY from "./pages/DIY";
import CardList from "./pages/CardList";
import Simulator from "./pages/Simulator";
import LoginPage from "./pages/Login";
import RandomShuffle from "./pages/RandomShuffle";
import DeckPage from "./pages/Deck";
import DeckCreate from "./pages/DeckCreate";
import DeckSearch from "./pages/DeckSearch";
import DeckEdit from "./pages/DeckEdit";
import Record from "./pages/Record";

function AnimatedRoutes() {
	const location = useLocation();

	return (
		<AnimatePresence
			mode="wait"
			initial={false}>
			<Routes
				location={location}
				key={location.pathname}>
				<Route
					path="/"
					element={
						<PageTransition>
							<Home />
						</PageTransition>
					}
				/>
				<Route
					path="/dice"
					element={
						<PageTransition>
							<Dice />
						</PageTransition>
					}
				/>
				<Route
					path="/tracker"
					element={
						<PageTransition>
							<Tracker />
						</PageTransition>
					}
				/>
				<Route
					path="/pick_packs"
					element={
						<PageTransition>
							<PickPacks />
						</PageTransition>
					}
				/>
				<Route
					path="/first_second"
					element={
						<PageTransition>
							<FirstSecond />
						</PageTransition>
					}
				/>
				<Route
					path="/chess_clock"
					element={
						<PageTransition>
							<ChessClock />
						</PageTransition>
					}
				/>
				<Route
					path="/diy"
					element={
						<PageTransition>
							<DIY />
						</PageTransition>
					}
				/>
				<Route
					path="/cardlist"
					element={
						<PageTransition>
							<CardList />
						</PageTransition>
					}
				/>
				<Route
					path="/simulator"
					element={
						<PageTransition>
							<Simulator />
						</PageTransition>
					}
				/>
				<Route
					path="/shuffle"
					element={
						<PageTransition>
							<RandomShuffle />
						</PageTransition>
					}
				/>
				<Route
					path="/login"
					element={
						<PageTransition>
							<LoginPage />
						</PageTransition>
					}
				/>
				<Route
					path="/deck"
					element={
						<PageTransition>
							<DeckPage />
						</PageTransition>
					}
				/>
				<Route
					path="/deck-create"
					element={
						<PageTransition>
							<DeckCreate />
						</PageTransition>
					}
				/>
				<Route
					path="/deck-search"
					element={
						<PageTransition>
							<DeckSearch />
						</PageTransition>
					}
				/>
				<Route
					path="/deck-edit"
					element={
						<PageTransition>
							<DeckEdit />
						</PageTransition>
					}
				/>
				<Route
					path="/record"
					element={
						<PageTransition>
							<Record />
						</PageTransition>
					}
				/>
			</Routes>
		</AnimatePresence>
	);
}

function App() {
	return (
		<div
			style={{
				overflowX: "hidden", // 防止水平滚动条
				width: "100vw", // 确保宽度不超过视口
				position: "relative", // 建立定位上下文
			}}>
			<AuthProvider>
				<Router>
					<NavBar />
					<AnimatedRoutes />
				</Router>
			</AuthProvider>
		</div>
	);
}

export default App;
