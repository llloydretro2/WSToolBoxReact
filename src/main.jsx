import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { LocaleProvider } from "./contexts/LocaleContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
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
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </React.StrictMode>,
);
