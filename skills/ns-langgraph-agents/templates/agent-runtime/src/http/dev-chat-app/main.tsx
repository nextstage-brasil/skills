import { createRoot } from "react-dom/client";
import { App } from "./App.js";

const rootEl = document.getElementById("dev-chat-root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
