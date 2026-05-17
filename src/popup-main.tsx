import React from "react";
import ReactDOM from "react-dom/client";
import { FloatingPopup } from "./features/floating-popup/FloatingPopup";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <FloatingPopup />
  </React.StrictMode>,
);
