import React, { Suspense, lazy } from "react";
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
	useLocation,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OptionsProvider } from "./contexts/OptionsContext";
import NavBar from "./components/NavBar";
import PageTransition from "./components/PageTransition";
import { AnimatePresence } from "framer-motion";

const Home = lazy(() => import("./pages/Home.jsx"));
const LoginPage = lazy(() => import("./pages/Login.jsx"));

const Dice = lazy(() => import("./pages/Dice.jsx"));
const PickPacks = lazy(() => import("./pages/PickPacks.jsx"));
const FirstSecond = lazy(() => import("./pages/FirstSecond.jsx"));
const ChessClock = lazy(() => import("./pages/ChessClock.jsx"));
const RandomShuffle = lazy(() => import("./pages/RandomShuffle.jsx"));
const AudioBoard = lazy(() => import("./pages/AudioBoard.jsx"));
const Record = lazy(() => import("./pages/Record.jsx"));


const CardList = lazy(() => import("./pages/CardList.jsx"));
const Simulator = lazy(() => import("./pages/Simulator.jsx"));
const MahjongTrainer    = lazy(() => import("./pages/MahjongTrainer.jsx"));
const MahjongEfficiency = lazy(() => import("./pages/MahjongEfficiency.jsx"));


const LoadingFallback = () => (
	<div
		style={{
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			minHeight: "40vh",
			color: "#2a5b46",
			fontWeight: 600,
			fontSize: "1rem",
		}}>
		正在加载…
	</div>
);

const withPageTransition = (Component) => (
	<PageTransition>
		<Suspense fallback={<LoadingFallback />}>
			<Component />
		</Suspense>
	</PageTransition>
);

function WSBackground() {
	const { pathname } = useLocation();
	if (!pathname.startsWith("/ws/")) return null;
	return (
		<div
			style={{
				backgroundImage: "url(/bg.webp)",
				backgroundSize: "cover",
				backgroundPosition: "center",
				backgroundRepeat: "no-repeat",
				width: "100%",
				height: "100vh",
				position: "fixed",
				opacity: 0.2,
				zIndex: -1,
			}}
		/>
	);
}

function AnimatedRoutes() {
	const location = useLocation();

	return (
		<AnimatePresence mode="wait" initial={false}>
			<Routes location={location} key={location.pathname}>
				{/* Hub */}
				<Route path="/" element={withPageTransition(Home)} />

				{/* Weiss Schwarz */}
				<Route path="/ws/cards" element={withPageTransition(CardList)} />
				<Route path="/ws/packs" element={withPageTransition(PickPacks)} />
				<Route path="/ws/simulator" element={withPageTransition(Simulator)} />
				<Route path="/ws/record" element={withPageTransition(Record)} />
				<Route path="/ws/audio" element={withPageTransition(AudioBoard)} />
				<Route path="/tools/first-second" element={withPageTransition(FirstSecond)} />
			<Route path="/ws/shuffle" element={withPageTransition(RandomShuffle)} />

				{/* Mahjong */}
				<Route path="/mahjong/trainer"    element={withPageTransition(MahjongTrainer)} />
				<Route path="/mahjong/efficiency" element={withPageTransition(MahjongEfficiency)} />

				{/* Tools */}
				<Route path="/tools/dice" element={withPageTransition(Dice)} />
				<Route path="/tools/clock" element={withPageTransition(ChessClock)} />
	
				{/* Auth */}
				<Route path="/login" element={withPageTransition(LoginPage)} />

				{/* Legacy redirects */}
				<Route path="/cardlist" element={<Navigate to="/ws/cards" replace />} />
				<Route path="/pick_packs" element={<Navigate to="/ws/packs" replace />} />
				<Route path="/simulator" element={<Navigate to="/ws/simulator" replace />} />
				<Route path="/record" element={<Navigate to="/ws/record" replace />} />
				<Route path="/audio" element={<Navigate to="/ws/audio" replace />} />
				<Route path="/first_second" element={<Navigate to="/tools/first-second" replace />} />
			<Route path="/ws/first-second" element={<Navigate to="/tools/first-second" replace />} />
				<Route path="/mahjong" element={<Navigate to="/mahjong/trainer" replace />} />
				<Route path="/dice" element={<Navigate to="/tools/dice" replace />} />
				<Route path="/chess_clock" element={<Navigate to="/tools/clock" replace />} />
				<Route path="/shuffle" element={<Navigate to="/ws/shuffle" replace />} />


			</Routes>
		</AnimatePresence>
	);
}

function App() {
	return (
		<div
			style={{
				overflowX: "hidden",
				width: "100vw",
				position: "relative",
			}}>
			<ThemeProvider>
				<AuthProvider>
					<OptionsProvider>
						<Router>
							<WSBackground />
							<NavBar />
							<AnimatedRoutes />
						</Router>
					</OptionsProvider>
				</AuthProvider>
			</ThemeProvider>
		</div>
	);
}

export default App;
