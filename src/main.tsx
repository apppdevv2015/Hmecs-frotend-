import offlineQueueService from "./services/offlineQueue.service";
import { NotificationProvider } from "./context/NotificationContext";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { Provider } from "react-redux";
import { store } from "./redux/store";

import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";

import App from "./App.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { registerSW } from "virtual:pwa-register";

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("New content available. Reload?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    
  },
});

// Sync on app startup if online
if (navigator.onLine) {
  setTimeout(() => {
    offlineQueueService.syncRequests();

    // Signal Service Worker to sync too
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SYNC_OFFLINE_REQUESTS",
      });
    }
  }, 1000);
}

window.addEventListener("online", async () => {

  // Sync app-level queue
  await offlineQueueService.syncRequests();

  // Signal Service Worker to sync its queue
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SYNC_OFFLINE_REQUESTS",
    });
  }
});

createRoot(document.getElementById("root")!).render(
  
    <Provider store={store}>
      <HelmetProvider>
        <ThemeProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </ThemeProvider>
      </HelmetProvider>
    </Provider>
);
