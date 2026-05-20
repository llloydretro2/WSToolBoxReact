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
import ProtectedRoute from "./components/ProtectedRoute";
import { AnimatePresence, motion } from "framer-motion";
import { LEGACY_REDIRECTS, getSectionByPath } from "./config/siteStructure";

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
const MahjongCentrepiece = lazy(() => import("./pages/MahjongCentrepiece.jsx"));


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

const withFullscreenPageTransition = (Component) => (
	<Suspense fallback={<LoadingFallback />}>
		<Component />
	</Suspense>
);

function RouteBackground() {
	const { pathname } = useLocation();
	const section = getSectionByPath(pathname);
	const backgroundImage = section?.homeImage ?? "/bg.webp";
	return (
		<AnimatePresence initial={false} mode="sync">
			<motion.div
				key={backgroundImage}
				initial={{ opacity: 0, scale: 1.035, filter: "blur(10px)" }}
				animate={{ opacity: 0.18, scale: 1, filter: "blur(0px)" }}
				exit={{ opacity: 0, scale: 0.985, filter: "blur(10px)" }}
				transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
				style={{
					backgroundImage: `url(${backgroundImage})`,
					backgroundSize: "cover",
					backgroundPosition: "center",
					backgroundRepeat: "no-repeat",
					inset: 0,
					position: "fixed",
					zIndex: -1,
					pointerEvents: "none",
					transformOrigin: "center center",
					willChange: "opacity, transform, filter",
				}}
			/>
		</AnimatePresence>
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
				<Route
					path="/ws/record"
					element={
						<ProtectedRoute>
							{withPageTransition(Record)}
						</ProtectedRoute>
					}
				/>
				<Route path="/ws/audio" element={withPageTransition(AudioBoard)} />
				<Route path="/tools/first-second" element={withPageTransition(FirstSecond)} />
			<Route path="/ws/shuffle" element={withPageTransition(RandomShuffle)} />

				{/* Mahjong */}
				<Route path="/mahjong/trainer"    element={withPageTransition(MahjongTrainer)} />
				<Route path="/mahjong/efficiency" element={withPageTransition(MahjongEfficiency)} />
				<Route path="/mahjong/centrepiece" element={withFullscreenPageTransition(MahjongCentrepiece)} />

				{/* Tools */}
				<Route path="/tools/dice" element={withPageTransition(Dice)} />
				<Route path="/tools/clock" element={withPageTransition(ChessClock)} />
	
				{/* Auth */}
				<Route path="/login" element={withPageTransition(LoginPage)} />

				{/* Legacy redirects */}
				{LEGACY_REDIRECTS.map(({ from, to }) => (
					<Route
						key={from}
						path={from}
						element={<Navigate to={to} replace />}
					/>
				))}
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
							<RouteBackground />
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
