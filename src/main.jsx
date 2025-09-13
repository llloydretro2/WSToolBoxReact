import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

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
        opacity: 0.3,
        zIndex: -1,
      }}
    />
    <App />
  </React.StrictMode>
);
