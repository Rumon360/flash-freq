import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Toaster } from "@/components/ui/toaster.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="font-roboto h-full w-full relative antialiased">
      <App />
      <Toaster />
    </div>
  </StrictMode>
);
