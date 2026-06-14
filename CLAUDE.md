# My Main Tech Stack (Full-Stack TypeScript)

**Developer Skill Profile:** Full-Stack TypeScript Specialist

A bleeding-edge, unified, end-to-end type-safe stack optimized for serverless/edge environments, maximum developer velocity, and zero language context-switching.

---

## 💻 Frontend Layer

### **Next.js (React + TypeScript)**
* **Role:** UI rendering, file-based routing, SEO, and initial page loads via React Server Components (RSC).
* **Capabilities:** Server-side rendering (SSR), static site generation (SSG), streaming, and partial prerendering.

### **Tailwind CSS**
* **Role:** Utility-first, rapid styling.
* **Capabilities:** Highly responsive UI design with zero runtime overhead and minimal bundle sizes.

### **Shadcn/ui + Radix UI**
* **Role:** High-quality, accessible component primitives.
* **Capabilities:** Beautiful, customizable, accessible components built on Tailwind.

---

## ⚙️ Backend Layer

### **Hono**
* **Role:** Ultra-fast, lightweight HTTP router and RPC layer.
* **Capabilities:** Custom API endpoints, robust middleware, edge runtime compatibility (Cloudflare Workers, Vercel Edge), and excellent Hono RPC support.

### **tRPC (optional but recommended)**
* **Role:** End-to-end typesafe RPC framework.
* **Capabilities:** Perfect type inference between frontend and backend when paired with Hono + TanStack Query.

### **Zod**
* **Role:** Runtime schema validation.
* **Capabilities:** Enforcing strict object structural integrity on both client and server with seamless TypeScript inference.

---

## 🗄️ Database Layer

### **PostgreSQL**
* **Role:** Core relational data storage engine.
* **Capabilities:** Advanced indexing, complex querying, JSON support, and full ACID compliance.

### **Drizzle ORM & Drizzle Kit**
* **Role:** TypeScript-first SQL query builder and migration tool.
* **Capabilities:** Zero-overhead performance, automatic schema inference, excellent migrations, and strong Drizzle + Zod integration.

---

## 🔒 Security & State Management

### **Better Auth**
* **Role:** Production-ready authentication and session management.
* **Capabilities:** Native Drizzle integration, secure sessions in PostgreSQL, multi-factor auth, social/OAuth providers, and excellent hook-based client support.

### **TanStack Query (React Query)**
* **Role:** Client-side data fetching, caching, and state synchronization.
* **Capabilities:** Advanced mutations, background refetching, optimistic updates, and seamless integration with Hono/tRPC.

---

## 🛠️ Additional Production-Ready Tools

### **Background Jobs & Workflows**
- **Inngest** or **Trigger.dev** — Reliable, type-safe background jobs with excellent observability and retries.

### **File Uploads & Storage**
- **UploadThing** or **Cloudflare R2** — Simple, secure, and scalable file handling.

### **Observability & Monitoring**
- **Sentry** + **OpenTelemetry** — Error tracking, performance monitoring, and distributed tracing.
- **Better Stack** or **Logtail** for logging.

### **Testing**
- **Vitest** + **React Testing Library** + **Drizzle test utilities** — Fast unit, integration, and E2E testing.

---

## Why This Stack Wins

- Maximum **end-to-end type safety**
- Excellent **performance** and **edge compatibility**
- High **developer velocity** with minimal boilerplate
- Production-ready and battle-tested components
- Easy to scale from MVP to high-traffic SaaS

This stack represents one of the strongest full-stack TypeScript setups available in 2026.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
