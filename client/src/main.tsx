import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 🛡️ Global Native Feel: Kunci Light Mode & matikan popup contextmenu (Google/Browser) pada gambar, ikon, dan tombol
if (typeof window !== "undefined") {
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = 'only light';

  window.addEventListener("contextmenu", (e: MouseEvent | TouchEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    
    // Izinkan klik kanan/popup hanya pada input teks dan textarea untuk fungsi copy-paste
    const isTextInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
    if (!isTextInput) {
      e.preventDefault();
    }
  }, { capture: true, passive: false });

  window.addEventListener("dragstart", (e: DragEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "IMG" || target.tagName === "SVG" || target.closest("img, svg"))) {
      e.preventDefault();
    }
  }, { capture: true, passive: false });
}

createRoot(document.getElementById("root")!).render(<App />);

