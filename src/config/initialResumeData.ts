import { DEFAULT_FIELD_ORDER } from "./constants";
import { GlobalSettings, DEFAULT_CONFIG } from "../types/resume";

const initialGlobalSettings: GlobalSettings = {
  baseFontSize: 16,
  pagePadding: 32,
  paragraphSpacing: 12,
  lineHeight: 1.5,
  sectionSpacing: 10,
  headerSize: 18,
  subheaderSize: 16,
  useIconMode: true,
  themeColor: "#1E104E",
  centerSubtitle: true,
};

const sampleResumeData = {
  title: "New Resume",
  basic: {
    name: "Deniz Yıldız",
    title: "Senior Frontend Engineer",
    employementStatus: "Available",
    email: "deniz.yildiz@example.com",
    phone: "+90 555 123 4567",
    location: "Istanbul, Türkiye",
    birthDate: "",
    fieldOrder: DEFAULT_FIELD_ORDER,
    icons: {
      email: "Mail",
      phone: "Phone",
      birthDate: "CalendarRange",
      employementStatus: "Briefcase",
      location: "MapPin",
    },
    photoConfig: DEFAULT_CONFIG,
    customFields: [
      {
        id: "personal",
        label: "Website",
        value: "https://denizyildiz.dev",
        icon: "Globe",
      },
    ],
    photo: "/avatar.png",
    githubKey: "",
    githubUseName: "",
    githubContributionsVisible: false,
  },
  education: [
    {
      id: "1",
      school: "Marmara University",
      major: "Computer Engineering",
      degree: "M.Sc.",
      startDate: "2021-09",
      endDate: "2023-06",
      visible: true,
      gpa: "3.78 / 4.00",
      description: `<ul>
        <li>Thesis: "Edge-rendered React applications and Core Web Vitals at scale"</li>
        <li>Graduate teaching assistant for Software Architecture (CSE 502)</li>
        <li>Published a workshop paper at İTÜ Frontend Days on streaming SSR</li>
      </ul>`,
    },
    {
      id: "2",
      school: "Bilkent University",
      major: "Computer Engineering",
      degree: "B.Sc.",
      startDate: "2017-09",
      endDate: "2021-06",
      visible: true,
      gpa: "3.65 / 4.00",
      description: `<ul>
        <li>Core coursework: Data Structures, Algorithms, Operating Systems, Distributed Systems, HCI</li>
        <li>Graduated with High Honors; placed in the top 5% of the cohort</li>
        <li>Vice-president of the Bilkent Computer Society; organized 3 hackathons</li>
      </ul>`,
    },
  ],
  skillContent: `<div class="skill-content">
  <ul>
    <li>Frontend: React 18, Next.js, TanStack Start, Vue 3, Astro</li>
    <li>Languages: TypeScript, JavaScript (ES2023), HTML5, CSS3</li>
    <li>Styling: Tailwind CSS, CSS Modules, Styled-components, design tokens</li>
    <li>State / Data: Zustand, Redux Toolkit, TanStack Query, tRPC</li>
    <li>Build & Tooling: Vite, Webpack, Turborepo, ESLint, Biome</li>
    <li>Testing: Vitest, Playwright, React Testing Library, MSW</li>
    <li>Performance: Core Web Vitals, code splitting, RSC streaming, image optimization</li>
    <li>Cloud: Cloudflare Workers, Vercel, AWS Lambda, Docker</li>
    <li>Leadership: Mentored 4 engineers, led architecture reviews, ran tech radars</li>
  </ul>
</div>`,
  selfEvaluationContent: `<p>Senior frontend engineer with 6+ years building production interfaces for e-commerce, fintech and developer tools. I care about measurable user-experience wins — shipping work that moves Core Web Vitals, conversion and adoption numbers, not just pixels.</p>`,
  experience: [
    {
      id: "1",
      company: "Trendyol",
      position: "Senior Frontend Engineer",
      date: "2023.07 - Present",
      visible: true,
      details: `<ul>
        <li>Lead frontend on the seller-platform team (8 engineers); shipped a new analytics dashboard used by 250k+ sellers</li>
        <li>Reduced TBT by 62% and LCP by 41% on the seller home page by migrating to streaming SSR</li>
        <li>Designed an internal component library (40+ components) now adopted by 5 product teams</li>
        <li>Drove a TypeScript strict-mode migration across 6 repos, eliminating 1,200+ implicit any types</li>
        <li>Run a biweekly "Frontend Radar" meeting; introduced React Server Components and Vitest to the org</li>
      </ul>`,
    },
    {
      id: "2",
      company: "Stripe",
      position: "Frontend Engineer",
      date: "2021.08 - 2023.06",
      visible: true,
      details: `<ul>
        <li>Built the new Stripe Checkout customization panel used by 80k+ merchants in EMEA</li>
        <li>Owned the React migration of the legacy AngularJS billing UI (140k LOC); zero customer-facing regressions</li>
        <li>Improved A11y score from 71 → 98 on the Dashboard sign-up flow; added keyboard-only end-to-end tests</li>
        <li>Mentored 2 junior engineers through the New Hire onboarding program</li>
      </ul>`,
    },
    {
      id: "3",
      company: "Getir",
      position: "Frontend Developer",
      date: "2019.06 - 2021.07",
      visible: true,
      details: `<ul>
        <li>Built the GetirFood web ordering experience from scratch; reached 500k MAU in the first 6 months</li>
        <li>Implemented A/B testing harness on top of Optimizely; ran 30+ experiments contributing to a 12% conversion lift</li>
        <li>Set up the team's first Lighthouse-CI pipeline; budgets caught 18 perf regressions before release</li>
      </ul>`,
    },
  ],
  draggingProjectId: null,
  projects: [
    {
      id: "p1",
      name: "Trendyol Seller Analytics 2.0",
      role: "Frontend Lead",
      date: "2024.01 - 2024.10",
      description: `<ul>
        <li>Real-time analytics dashboard for sellers across Türkiye, Azerbaijan and the GCC region</li>
        <li>Stack: Next.js App Router, React Server Components, TanStack Table, Recharts, ClickHouse via tRPC</li>
        <li>Streamed 100k-row tables under 200 ms FCP by combining server components with progressive hydration</li>
        <li>Adopted by 3 internal teams as the reference Next.js project template</li>
      </ul>`,
      visible: true,
    },
    {
      id: "p2",
      name: "Stripe Checkout Customization Panel",
      role: "Frontend Engineer",
      date: "2022.03 - 2023.05",
      description: `<ul>
        <li>Drag-and-drop builder for Stripe Checkout pages used by 80k+ EMEA merchants</li>
        <li>Built on React, dnd-kit and a custom design-token pipeline; published 60+ themable primitives</li>
        <li>Reduced merchant time-to-first-checkout by 28% (measured across 4 weeks of A/B testing)</li>
      </ul>`,
      visible: true,
    },
    {
      id: "p3",
      name: "Open-source: react-image-budget",
      role: "Maintainer",
      date: "2022.09 - Present",
      description: `<ul>
        <li>React component that enforces a configurable image-payload budget per route at build time</li>
        <li>1.4k GitHub stars, 35k weekly npm downloads, sponsored by two SaaS companies</li>
        <li>Featured in the State of JS 2024 "Tools to watch" section</li>
      </ul>`,
      link: "https://github.com/example/react-image-budget",
      linkLabel: "github.com/example/react-image-budget",
      visible: true,
    },
  ],
  menuSections: [
    { id: "basic", title: "Profile", icon: "👤", enabled: true, order: 0 },
    { id: "selfEvaluation", title: "Summary", icon: "💬", enabled: true, order: 1 },
    { id: "experience", title: "Experience", icon: "💼", enabled: true, order: 2 },
    { id: "skills", title: "Skills", icon: "⚡", enabled: true, order: 3 },
    { id: "projects", title: "Projects", icon: "🚀", enabled: true, order: 4 },
    { id: "education", title: "Education", icon: "🎓", enabled: true, order: 5 },
  ],
  certificates: [],
  customData: {},
  activeSection: "basic",
  globalSettings: initialGlobalSettings,
};

// Both tr and en defaults share the same sample data (English content,
// Turkish + US companies, Turkish universities) per product spec.
export const initialResumeState = sampleResumeData;
export const initialResumeStateEn = sampleResumeData;

const blankResumeBase = {
  ...sampleResumeData,
  title: "New Resume",
  basic: {
    ...sampleResumeData.basic,
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    birthDate: "",
    employementStatus: "",
    photo: "",
    customFields: [],
  },
  education: [],
  skillContent: "",
  selfEvaluationContent: "",
  experience: [],
  projects: [],
  certificates: [],
  menuSections: [sampleResumeData.menuSections[0]],
};

export const blankResumeState = blankResumeBase;
export const blankResumeStateEn = blankResumeBase;
