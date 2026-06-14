---
description: Describe when these instructions should be loaded
. - "src/**/*.ts"
---

<!-- Tip: Use /create-instructions in chat to generate content with agent assistance -->
---

## 🎨 1. Frontend Developer (`frontend-developer.md`)

**Role Alignment:** Next.js (App Router) + Tailwind CSS + TanStack Query

Modify the agent's prompt to focus entirely on **Server-Client boundaries** and **asynchronous UI states**:

```markdown
### Stack Alignment: Frontend Layer
- **Framework:** Next.js (React + TypeScript). Default to React Server Components (RSC) for data fetching/layouts. Use Client Components ('use client') strictly for interactive UI leaves.
- **Styling:** Tailwind CSS. Employ utility-first layouts, strict responsive modifiers (`sm:`, `md:`, `lg:`), and semantic dark-mode orchestration. Zero runtime CSS-in-JS allowed.
- **State & Sync:** TanStack Query. Synchronize all server state through custom hooks. Ensure UI elements react gracefully using declarative error boundaries and optimistic updates on mutations.
- **Type Safety:** Leverage Next.js dynamic routing signatures and strict TypeScript interfaces for all UI prop definitions.

```

---

## 🏗️ 2. Backend Architect (`backend-architect.md`)

**Role Alignment:** Hono + Drizzle ORM + PostgreSQL

Modify this agent to abandon heavy enterprise node frameworks and design entirely for **lightweight, edge-native microservices**:

```markdown
### Stack Alignment: Backend Layer
- **Routing Engine:** Hono. Build clean, modular sub-routers utilizing the Hono execution context (`c.json()`, `c.req()`). Optimize for deployment on edge runtimes (Vercel Edge/Cloudflare Workers).
- **Data Access:** Drizzle ORM + Drizzle Kit. Compose type-safe SQL query generation leveraging relational query APIs (`db.query`). Enforce explicit transaction management for multi-step table mutations.
- **Data Engine:** PostgreSQL. Target relational optimization—proper indexing, foreign-key cascade policies, and clean connection pooling behavior.
- **Contract Design:** Expose explicit type structures to the frontend layer to maximize end-to-end type inference.

```

---

## 🛡️ 3. Security Engineer (`security-engineer.md`)

**Role Alignment:** Better Auth + Zod Validation

Direct this agent to guard your ingress and authentication boundaries using **runtime validation and secure session states**:

```markdown
### Stack Alignment: Security & Ingress Layer
- **Authentication:** Better Auth. Secure all protected endpoints by parsing headers via the Better Auth server client instance inside Hono middleware. Map auth sessions directly to the underlying PostgreSQL schema.
- **Input Validation:** Zod (specifically `drizzle-orm/zod`). Enforce runtime schema validation on every single incoming `c.req.json()` or query parameter payload. 
- **Execution Pattern:** If a payload fails Zod structural parsing, immediately short-circuit the execution path and return a standardized `400 Bad Request` payload containing clean field-level error mappings.

```

---

## ⚡ 4. Rapid Prototyper (`rapid-prototyper.md`)

**Role Alignment:** Full-Stack Vertical Slices (Database to UI)

Program this agent to build vertical, type-safe features at blinding speed using **Hono RPC + TanStack Query**:

```markdown
### Stack Alignment: High-Velocity Prototyping
- **Architecture Strategy:** Construct complete vertical slices. When asked for a feature, immediately generate:
  1. The Drizzle PostgreSQL schema mutations.
  2. The Hono API endpoint with embedded Zod body validation.
  3. The TanStack Query hook matching the API signature.
  4. The Tailwind-styled React View component rendering the state.
- **Core Principle:** Maximize type sharing. Avoid creating duplicate manual interfaces on the frontend; infer types directly from the Hono router or Drizzle schema.

```

---

## 🔍 5. API Tester / Reality Checker (`api-tester.md`)

**Role Alignment:** Integration Assertions & Payload Boundary Checking

Configure this agent to ruthlessly break the communication contract between **Next.js** and **Hono**:

```markdown
### Stack Alignment: Contract & Integration Testing
- **Validation Vector:** Assert that your Hono API response signatures match what TanStack Query expects to resolve in the UI.
- **Edge-Case Assessment:** Intentionally test the application boundary with malformed data payloads to ensure Zod catch blocks intercept errors correctly without surfacing raw database traces.
- **Auth Integrity:** Verify that protected Hono routes adequately return `401 Unauthorized` responses if Better Auth headers or cookies are absent or expired.

```

---