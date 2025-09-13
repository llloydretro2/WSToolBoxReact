import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import NavBar from "./components/NavBar";
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
import Record from "./pages/Record";

function App() {
	return (
		<AuthProvider>
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
					<Route path="/simulator" element={<Simulator />} />
					<Route path="/shuffle" element={<RandomShuffle />} />
					<Route path="/login" element={<LoginPage />} />
					<Route path="/deck" element={<DeckPage />} />
                    <Route path='/record' element={<Record />} />
				</Routes>
			</Router>
		</AuthProvider>
	);
}

export default App;
