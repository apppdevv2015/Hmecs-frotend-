"use client";

import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

export default function AppToaster() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={12}
      containerStyle={{
        top: 20,
        right: 20,
        zIndex: 999999,
      }}
      toastOptions={{
        duration: 3000,

        style: {
          background: isDark ? "#0b1728" : "#ffffff",

          color: isDark ? "#ffffff" : "#0f172a",

          border: isDark ? "1px solid #1e293b" : "1px solid #e2e8f0",

          borderRadius: "18px",

          fontWeight: "600",

          padding: "14px 18px",

          boxShadow: isDark ? "0 12px 30px rgba(0,0,0,0.35)" : "0 12px 30px rgba(15,23,42,0.08)",
        },

        success: {
          iconTheme: {
            primary: "#10B981",
            secondary: "#fff",
          },
        },

        error: {
          iconTheme: {
            primary: "#EF4444",
            secondary: "#fff",
          },
        },
      }}
    />
  );
}
