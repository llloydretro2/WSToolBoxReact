import React, { Suspense, lazy, useEffect } from "react";
import { useLocale } from "./contexts/LocaleContext";
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


const JPCardList = lazy(() => import("./pages/JPCardList.jsx"));
const ENCardList = lazy(() => import("./pages/ENCardList.jsx"));
const Simulator = lazy(() => import("./pages/Simulator.jsx"));
const DamageCalculator = lazy(() => import("./pages/DamageCalculator.jsx"));
const CardMaker        = lazy(() => import("./pages/CardMaker.jsx"));
const MahjongTrainer    = lazy(() => import("./pages/MahjongTrainer.jsx"));
const MahjongEfficiency = lazy(() => import("./pages/MahjongEfficiency.jsx"));
const MahjongCentrepiece = lazy(() => import("./pages/MahjongCentrepiece.jsx"));


const LoadingFallback = () => {
	const { t } = useLocale();
	return (
		<div className="flex items-center justify-center min-h-[40vh] text-base font-semibold text-[var(--text-muted)]">
			{t("common.loading")}
		</div>
	);
};

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

	useEffect(() => {
		document.documentElement.dataset.section = section?.key ?? "hub";
	}, [section?.key]);

	return (
		<AnimatePresence initial={false} mode="sync">
			<motion.div
				key={backgroundImage}
				initial={{ opacity: 0, scale: 1.04 }}
				animate={{ opacity: 0.18, scale: 1 }}
				exit={{ opacity: 0, scale: 1 }}
				transition={{
					opacity: { duration: 0.2, ease: "easeIn" },
					scale: { type: "spring", stiffness: 80, damping: 20, mass: 0.8 },
				}}
				style={{
					backgroundImage: `url(${backgroundImage})`,
					backgroundSize: "cover",
					backgroundPosition: "center",
					backgroundRepeat: "no-repeat",
					inset: 0,
					position: "fixed",
					zIndex: -1,
					pointerEvents: "none",
					willChange: "opacity, transform",
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
				<Route path="/ws/cards" element={withPageTransition(JPCardList)} />
				<Route path="/ws/cards/en" element={withPageTransition(ENCardList)} />
				<Route path="/ws/packs" element={withPageTransition(PickPacks)} />
				<Route path="/ws/simulator" element={withPageTransition(Simulator)} />
				<Route path="/ws/damage"      element={withPageTransition(DamageCalculator)} />
				<Route path="/ws/card-maker" element={withPageTransition(CardMaker)} />
				<Route
					path="/ws/record"
					element={
						<ProtectedRoute>
							{withPageTransition(Record)}
						</ProtectedRoute>
					}
				/>
				<Route path="/tools/first-second" element={withPageTransition(FirstSecond)} />
				<Route path="/ws/shuffle" element={withPageTransition(RandomShuffle)} />

				{/* Mahjong */}
				<Route path="/mahjong/trainer"    element={withPageTransition(MahjongTrainer)} />
				<Route path="/mahjong/efficiency" element={withPageTransition(MahjongEfficiency)} />
				<Route path="/mahjong/centrepiece" element={withFullscreenPageTransition(MahjongCentrepiece)} />

				{/* Tools */}
				<Route path="/tools/dice" element={withPageTransition(Dice)} />
				<Route path="/tools/clock" element={withPageTransition(ChessClock)} />
				<Route path="/tools/audio" element={withPageTransition(AudioBoard)} />
	
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
					<Router>
						<OptionsProvider>
							<RouteBackground />
							<NavBar />
							<AnimatedRoutes />
						</OptionsProvider>
					</Router>
				</AuthProvider>
			</ThemeProvider>
		</div>
	);
}

export default App;
