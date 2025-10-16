import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import NavBar from "./components/NavBar";
import PageTransition from "./components/PageTransition";
import { AnimatePresence } from "framer-motion";

const Home = lazy(() => import("./pages/Home.jsx"));
const Dice = lazy(() => import("./pages/Dice.jsx"));
const Tracker = lazy(() => import("./pages/Tracker.jsx"));
const PickPacks = lazy(() => import("./pages/PickPacks.jsx"));
const FirstSecond = lazy(() => import("./pages/FirstSecond.jsx"));
const ChessClock = lazy(() => import("./pages/ChessClock.jsx"));
const CardList = lazy(() => import("./pages/CardList.jsx"));
const Simulator = lazy(() => import("./pages/Simulator.jsx"));
const LoginPage = lazy(() => import("./pages/Login.jsx"));
const RandomShuffle = lazy(() => import("./pages/RandomShuffle.jsx"));
const DeckPage = lazy(() => import("./pages/Deck.jsx"));
const DeckCreate = lazy(() => import("./pages/DeckCreate.jsx"));
const DeckSearch = lazy(() => import("./pages/DeckSearch.jsx"));
const DeckEdit = lazy(() => import("./pages/DeckEdit.jsx"));
const Record = lazy(() => import("./pages/Record.jsx"));

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
    }}
  >
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

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={withPageTransition(Home)} />
        <Route path="/dice" element={withPageTransition(Dice)} />
        <Route path="/tracker" element={withPageTransition(Tracker)} />
        <Route path="/pick_packs" element={withPageTransition(PickPacks)} />
        <Route path="/first_second" element={withPageTransition(FirstSecond)} />
        <Route path="/chess_clock" element={withPageTransition(ChessClock)} />
        <Route path="/cardlist" element={withPageTransition(CardList)} />
        <Route path="/simulator" element={withPageTransition(Simulator)} />
        <Route path="/shuffle" element={withPageTransition(RandomShuffle)} />
        <Route path="/login" element={withPageTransition(LoginPage)} />
        <Route path="/deck" element={withPageTransition(DeckPage)} />
        <Route path="/deck-create" element={withPageTransition(DeckCreate)} />
        <Route path="/deck-search" element={withPageTransition(DeckSearch)} />
        <Route path="/deck-edit" element={withPageTransition(DeckEdit)} />
        <Route path="/record" element={withPageTransition(Record)} />
      </Routes>
    </AnimatePresence>
  );
}

function ThemeWrapper({ children }) {
  return children;
}

function App() {
  return (
    <div
      style={{
        overflowX: "hidden", // 防止水平滚动条
        width: "100vw", // 确保宽度不超过视口
        position: "relative", // 建立定位上下文
      }}
    >
      <ThemeProvider>
        <ThemeWrapper>
          <AuthProvider>
            <Router>
              <NavBar />
              <AnimatedRoutes />
            </Router>
          </AuthProvider>
        </ThemeWrapper>
      </ThemeProvider>
    </div>
  );
}

export default App;
