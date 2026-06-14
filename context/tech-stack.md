## 💻 Frontend Layer

### **Next.js (React + TypeScript)**
* **Role:** UI rendering, file-based routing, SEO, and initial page loads via React Server Components (RSC).
* **Capabilities:** Server-side rendering (SSR), static site generation (SSG), and streaming architectures.

### **Tailwind CSS**
* **Role:** Utility-first, rapid styling.
* **Capabilities:** Highly responsive UI design with zero runtime overhead and minimal bundle sizes.

---

## ⚙️ Backend Layer

### **Hono**
* **Role:** Ultra-fast, lightweight HTTP router.
* **Capabilities:** Custom API endpoints, robust middleware implementation, and edge runtime compatibility (Cloudflare Workers, Vercel Edge).

### **Zod (via drizzle-orm/zod)**
* **Role:** Runtime schema validation.
* **Capabilities:** Enforcing strict object structural integrity on both client and server payloads with seamless TypeScript inference.

---

## 🗄️ Database Layer

### **PostgreSQL**
* **Role:** Core relational data storage engine.
* **Capabilities:** Indexing, complex querying, and ACID-compliant transaction management.

### **Drizzle ORM & Drizzle Kit**
* **Role:** TypeScript-first SQL query generation.
* **Capabilities:** Automatic schema inference, lightning-fast database migrations, and type-safe database interactions with zero-overhead performance.

---

## 🔒 Security & State Management

### **Better Auth**
* **Role:** Production-ready authentication and session management.
* **Capabilities:** Native integration with Drizzle schemas, hook-based client state, and secure persistence directly inside PostgreSQL.

### **TanStack Query (React Query)**
* **Role:** Client-side asynchronous state synchronization and data fetching.
* **Capabilities:** Advanced data mutation, background caching, and seamless pairing with **Hono RPC** for full end-to-end type safety from database to UI.