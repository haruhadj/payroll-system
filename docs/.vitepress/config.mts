import { defineConfig } from "vitepress"

// Documentation site for the Payroll System.
// Reuses the existing Markdown guides in docs/ as the site content.
export default defineConfig({
  lang: "en-US",
  title: "Payroll System",
  description:
    "Documentation for the web-based Philippine payroll management system — setup, testing, and thesis-defense preparation.",

  // GitHub Pages project site: served from /payroll-system/.
  // Change to "/" if deploying to Vercel or a root domain.
  base: "/payroll-system/",

  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: false,

  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Testing", link: "/testing-guide" },
      { text: "Defense", link: "/defense-guide" },
      {
        text: "Project Summary",
        link: "https://github.com/haruhadj/payroll-system/blob/main/PROJECT_SUMMARY.md",
      },
    ],

    sidebar: [
      {
        text: "Overview",
        items: [
          { text: "Home", link: "/" },
          { text: "The System in Plain English", link: "/plain-english-guide" },
        ],
      },
      {
        text: "Testing & Rollout",
        items: [
          { text: "Testing Guide", link: "/testing-guide" },
          { text: "Tester Handout", link: "/tester-handout" },
          { text: "Tester Handout (Plain English)", link: "/tester-handout-plain" },
        ],
      },
      {
        text: "Understanding & Defense",
        items: [
          { text: "Final Defense Guide", link: "/defense-guide" },
          { text: "Defense-Day Cheat Sheet", link: "/defense-cheatsheet" },
        ],
      },
    ],

    search: {
      provider: "local",
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/haruhadj/payroll-system" },
    ],

    editLink: {
      pattern:
        "https://github.com/haruhadj/payroll-system/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    footer: {
      message: "Payroll System — thesis documentation.",
      copyright: "Built with VitePress.",
    },
  },
})
