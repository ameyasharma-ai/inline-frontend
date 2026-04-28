/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: ["./src/**/*.{jsx,tsx}", "./*.html"],
    theme: {
        extend: {
            colors: {
                background: "rgb(var(--background) / <alpha-value>)",
                foreground: "rgb(var(--foreground) / <alpha-value>)",
                card: "rgb(var(--card) / <alpha-value>)",
                border: "rgb(var(--border) / <alpha-value>)",
                primary: "rgb(var(--primary) / <alpha-value>)",
                accent: "rgb(var(--accent) / <alpha-value>)",
                danger: "rgb(var(--danger) / <alpha-value>)",
                hoverBg: "rgb(var(--hover-bg) / <alpha-value>)",
                glassBg: "var(--glass-bg)",
                glassBorder: "var(--glass-border)",
                
                // Legacy colors
                dark: "#09090b", // zinc-950
                darkHover: "#27272a", // zinc-800
                light: "#f8fafc",
            },
            fontFamily: {
                poppins: ["Poppins", "sans-serif"],
                inter: ["Inter", "sans-serif"],
                outfit: ["Outfit", "sans-serif"],
            },
            animation: {
                "up-down": "up-down 3s ease-in-out infinite alternate",
                "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            },
        },
    },
    plugins: [],
}
