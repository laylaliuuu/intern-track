import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System Colors
        // Primary Palette (Brand Identity)
        primary: {
          DEFAULT: "#2563EB", // Bright Cornell-like Blue
          hover: "#1E40AF", // Primary Hover
          foreground: "#FFFFFF", // White text on primary
        },
        accent: {
          DEFAULT: "#14B8A6", // Teal
          foreground: "#FFFFFF", // White text on accent
        },
        background: {
          DEFAULT: "#F9FAFB", // Soft grayish white
        },
        surface: "#FFFFFF", // White cards, table cells, modal backgrounds
        
        // Secondary / Neutral Palette (Data Clarity)
        text: {
          primary: "#111827", // For titles and labels
          secondary: "#6B7280", // For metadata (dates, tags)
        },
        border: {
          DEFAULT: "#E5E7EB", // Thin dividers between rows
        },
        highlight: "#EEF2FF", // Subtle blue background for selected rows
        
        // Feedback / Status Colors
        success: "#22C55E", // Green - Verified posting, live status
        warning: "#F59E0B", // Amber - Internship deadline approaching
        error: "#EF4444", // Red - Posting no longer available
        info: "#3B82F6", // Blue - Freshly added internship
        
        // Data Visualization Colors (for future charts)
        chart: {
          blue: "#3B82F6",
          teal: "#14B8A6",
          violet: "#8B5CF6",
          orange: "#F97316",
        },
        
        // Legacy shadcn/ui colors (keeping for compatibility)
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        foreground: "hsl(var(--foreground))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;