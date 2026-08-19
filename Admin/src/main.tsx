import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { AppProviders } from "./app/providers";
import { AppRouter } from "./app/router";

const rootEl = document.getElementById("root")!;

createRoot(rootEl).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
);
