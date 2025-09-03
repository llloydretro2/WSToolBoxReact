import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import Dice from "./pages/Dice";
import Tracker from "./pages/Tracker";
import PickPacks from "./pages/PickPacks";
import FirstSecond from "./pages/FirstSecond";
import ChessClock from "./pages/ChessClock";
import DIY from "./pages/DIY";
import CardList from "./pages/CardList";

function App() {
	return (
		<Router>
			<NavBar />
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/dice" element={<Dice />} />
				<Route path="/tracker" element={<Tracker />} />
				<Route path="/pick_packs" element={<PickPacks />} />
				<Route path="/first_second" element={<FirstSecond />} />
				<Route path="*" element={<Home />} />
				<Route path="/chess_clock" element={<ChessClock />} />
				<Route path="/diy" element={<DIY />} />
				<Route path="/cardlist" element={<CardList />} />
			</Routes>
		</Router>
	);
}

export default App;
