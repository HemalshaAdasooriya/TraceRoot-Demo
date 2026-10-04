# Architectural Report: Project File Structure
## TraceRoot: Farm-to-Buyer Agricultural Contact and Transparency System

---

## Executive Summary

To support the functional and non-functional requirements established in the TraceRoot proposal, the codebase is structured into two completely decoupled root directories:
1. **`/backend`**: A scalable, modular Node.js/Express.js REST API built with modern **JavaScript (ES Modules)**, Prisma ORM, and Supabase (Managed PostgreSQL 16). It enforces role-based access control, transaction boundaries, and the **append-only immutable ledger** for cultivation provenance.
2. **`/frontend/mobile`**: A unified, cross-platform **React Native (Expo)** JavaScript application serving all four stakeholders: **Farmers**, **Institutional Buyers**, **Agro Suppliers**, and **Platform Administrators**. It features native camera-only hardware access, an **offline-first local outbox cache** (synced to Supabase PostgreSQL), and role-based navigation. Platform operations are complemented by the cloud-native Supabase Studio dashboard.

This decoupled architecture enables independent deployment, strict separation of concerns, and parallel development across all four team members without merge contention.

---

## 1. Backend File Structure (`/backend`)

The backend follows the **Controller-Service-Repository** pattern and **Clean Architecture** principles. Business logic is isolated from HTTP transport and database drivers.

### 1.1 Complete Visual Directory Tree

```
backend/
├── .env.example                     # Environment variables (Supabase DATABASE_URL, DIRECT_URL, SUPABASE_KEY)
├── .gitignore                       # Git ignore rules for Node/JavaScript
├── README.md                        # Backend setup, Supabase migration, and run instructions
├── docker-compose.yml               # Local PostgreSQL 16 container service for offline dev fallback
├── jsconfig.json                    # JavaScript ES Modules path mapping & VS Code IntelliSense
├── package.json                     # Dependencies, scripts, and "type": "module" declaration
├── prisma/
│   ├── schema.prisma                # Prisma schema with Supabase dual-connection (DATABASE_URL + DIRECT_URL)
│   ├── migrations/                  # Automated PostgreSQL SQL migration history
│   │   └── 20261004000000_init_postgresql/
│   │       ├── migration.sql        # Relational tables, foreign keys, and indexes
│   │       └── triggers.sql         # PL/pgSQL append-only triggers on cultivation_records
│   └── seed.js                      # Development seed data for Supabase PostgreSQL testing (ESM)
└── src/
    ├── app.js                       # Express application configuration & middleware
    ├── server.js                    # Server initialization, port listener & graceful shutdown
    │
    ├── config/                      # Environment and third-party configurations (ES Modules)
    │   ├── index.js                 # Centralized environment config loader
    │   ├── database.js              # PrismaClient singleton for Supabase Supavisor connection pool
    │   ├── supabase.js              # Supabase Client SDK instance (Storage & Realtime)
    │   ├── s3.config.js             # AWS S3 / Cloudflare R2 bucket setup (alternative/fallback)
    │   └── firebase.config.js       # Firebase Admin SDK (FCM notifications)
    │
    ├── validators/                  # Zod runtime request validation schemas
    │   ├── auth.validator.js
    │   ├── cultivation.validator.js
    │   ├── contract.validator.js
    │   └── marketplace.validator.js
    │
    ├── middlewares/                 # Request processing & security filters
    │   ├── auth.middleware.js       # JWT verification & token extraction
    │   ├── rbac.middleware.js       # Role-Based Access Control guard
    │   ├── validate.middleware.js   # Zod request body & query validator
    │   ├── rateLimiter.middleware.js# Ingress rate limiter (brute-force defense)
    │   └── error.middleware.js      # Centralized error & exception handling
    │
    ├── routes/                      # API endpoint definitions (REST routing)
    │   ├── index.js                 # Aggregated router mounting under /api/v1
    │   ├── auth.routes.js           # /auth (login, register, token refresh)
    │   ├── farmer.routes.js         # /farmers (profiles, farm locations)
    │   ├── cultivation.routes.js    # /cultivation (stage logs, amendments)
    │   ├── marketplace.routes.js    # /listings & /orders (produce commerce)
    │   ├── contract.routes.js       # /contracts (buyer-farmer agreements)
    │   ├── supplier.routes.js       # /suppliers (catalogs & buyback orders)
    │   ├── admin.routes.js          # /admin (verification, disputes, metrics)
    │   └── notification.routes.js   # /notifications (in-app notes & push)
    │
    ├── controllers/                 # HTTP transport layer (Req/Res handling)
    │   ├── auth.controller.js
    │   ├── farmer.controller.js
    │   ├── cultivation.controller.js
    │   ├── marketplace.controller.js
    │   ├── contract.controller.js
    │   ├── supplier.controller.js
    │   ├── admin.controller.js
    │   └── notification.controller.js
    │
    ├── services/                    # Core business logic & transaction handling
    │   ├── auth.service.js          # Password hashing, token generation
    │   ├── cultivation.service.js   # Append-only ledger writes & timeline queries
    │   ├── integrity.service.js     # GPS boundary check & image SHA-256 digest
    │   ├── marketplace.service.js   # Harvest listing & purchase order lifecycle
    │   ├── contract.service.js      # Agreement state machine & milestone tracking
    │   ├── supplier.service.js      # Input purchasing & harvest buybacks
    │   ├── admin.service.js         # User verification & system audit reports
    │   └── notification.service.js  # Push notification & note routing
    │
    └── utils/                       # Shared utility functions
        ├── response.util.js         # Standardized JSON response wrapper
        ├── hash.util.js             # Cryptographic hash generator for media
        ├── geo.util.js              # Geo-distance & polygon validation helpers
        └── logger.util.js           # Application logging utility (Winston/Pino)erification & system audit reports
    │   └── notification.service.ts  # Push notification & note routing
    │
    └── utils/                       # Shared utility functions
        ├── response.util.ts         # Standardized JSON response wrapper
        ├── hash.util.ts             # Cryptographic hash generator for media
        ├── geo.util.ts              # Geo-distance & polygon validation helpers
        └── logger.util.ts           # Application logging utility (Winston/Pino)
```

### 1.2 Responsibilities of Core Backend Directories

| Folder / Layer | Primary Architectural Responsibility | Key Design Pattern |
| :--- | :--- | :--- |
| `jsconfig.json` | Configures JavaScript ES Modules path mapping (`@/*`) and activates VS Code IntelliSense and autocomplete without compilation overhead. | **Configuration** |
| `docker-compose.yml` | Containerizes a local PostgreSQL 16 database instance for offline development fallback and local testing. | **Infrastructure as Code (IaC)** |
| `prisma/` | Defines PostgreSQL relational models, constraints, GIN indexes, and automated migrations. Configured with Supabase dual-connection URLs (`DATABASE_URL` pooler and `DIRECT_URL` session). Houses PL/pgSQL database triggers blocking `UPDATE`/`DELETE` on `cultivation_records`. | **Data Mapper / ORM** |
| `src/config/` | Initializes runtime configurations and manages singletons for external connections (PrismaClient Supabase connection pool, Supabase Client SDK for media storage, AWS S3 fallback, Firebase Admin SDK). | **Singleton Pattern** |
| `src/validators/` | Houses Zod runtime schema validators for request sanitization and validation, enforcing contract safety across controllers without requiring compile-time TypeScript types. | **Validator / Schema Pattern** |
| `src/middlewares/` | Intercepts HTTP requests to enforce stateless security (JWT), role claims (`FARMER`, `BUYER`, `SUPPLIER`, `ADMIN`), payload sanitization, and global exception mapping. | **Intercepting Filter / Pipeline** |
| `src/routes/` | Declaratively maps URIs to controllers, pairing each route with validation schemas and role guards. | **Front Controller / Routing** |
| `src/controllers/` | Extracts headers, parameters, and bodies from incoming requests; delegates business processing to domain services; returns standard JSON envelopes. | **Adapter / MVC Controller** |
| `src/services/` | Contains pure business rules, workflow transitions, and transactional queries. Manages append-only ledger creation and amendment chaining. | **Domain Service / Unit of Work** |
| `src/utils/` | Provides stateless helpers for image integrity hashing (SHA-256), geo-distance math, and error formatting. | **Utility / Pure Functions** |

### 1.3 Supabase with PostgreSQL Database Integration & File Mapping

TraceRoot utilizes **Supabase** for managed **PostgreSQL 16+** cloud database hosting. This architecture combines cloud-managed high availability with Prisma ORM's compile-time type safety. The following files govern database operations:

| File / Directory | Purpose in Supabase PostgreSQL Architecture |
| :--- | :--- |
| `backend/.env.example` | Specifies the dual Supabase connection strings: `DATABASE_URL` (Supavisor transaction pooler on port 6543 with `?pgbouncer=true`) and `DIRECT_URL` (direct TCP session on port 5432 for migrations), plus `SUPABASE_URL` and `SUPABASE_ANON_KEY`. |
| `backend/prisma/schema.prisma` | Declares `datasource db { provider = "postgresql", url = env("DATABASE_URL"), directUrl = env("DIRECT_URL") }`, entity models (`User`, `Farmer`, `Crop`, `CultivationRecord`, `Contract`, `ProductListing`, `Order`), relational foreign keys, PostgreSQL `@db.Uuid`, `@db.VarChar`, `@db.Decimal`, and `Json` fields. |
| `backend/prisma/migrations/` | Version-controlled, idempotent PostgreSQL SQL migration scripts applied to Supabase via `prisma migrate dev`. Includes initial DDL tables, indexes, and the `trg_cultivation_append_only` trigger definition. |
| `backend/prisma/seed.js` | Populates initial sample data (verified farmers, demo greenhouse produce listings, suppliers, and agricultural raw materials) directly into the Supabase PostgreSQL database for development and testing. |
| `backend/src/config/database.js` | Configures the `PrismaClient` singleton with Supabase connection pool management, event logging, and graceful disconnect handlers on process shutdown (`SIGINT`/`SIGTERM`). |
| `backend/src/config/supabase.js` | Initializes the official `@supabase/supabase-js` client using the Supabase Service Role Key for managing Supabase Storage buckets (live crop photos, KYC documents) and pre-signed upload URLs. |
| `backend/docker-compose.yml` | Provides an optional local `postgres:16-alpine` container for developers working offline without active internet connectivity to the Supabase Cloud. |

---

## 2. Frontend File Structure (`/frontend/mobile`)

TraceRoot unifies all client interactions into a single cross-platform **React Native (Expo)** mobile codebase. Rather than maintaining a separate web dashboard, administrative governance (KYC approvals, dispute resolution, audit verification) is integrated directly into the mobile client via role-guarded screens, complemented by the built-in **Supabase Studio** cloud console for direct database oversight.

The mobile client is engineered with an **Offline-First** posture to withstand rural network drops. It features native hardware camera integration that omits gallery image selection to prevent photo tampering.

```
frontend/mobile/
├── .env.example                     # Mobile environment configuration
├── .gitignore                       # Git ignore rules for React Native/Expo
├── README.md                        # Mobile setup and mobile simulator instructions
├── app.json                         # Expo configuration (permissions, camera, GPS)
├── App.jsx                          # Root application entry point
├── jsconfig.json                    # JavaScript path mapping for React Native
├── package.json                     # Mobile dependencies and run scripts
├── assets/                          # Static branding, splash screens, and icons
│   ├── fonts/                       # Custom typography
│   ├── icons/                       # SVG and PNG icons
│   └── images/                      # App logos and illustrations
└── src/
    ├── api/                         # Backend REST communication (Axios)
    │   ├── client.js                # Axios instance with auth headers & refresh interceptor
    │   ├── auth.api.js              # Authentication endpoints
    │   ├── cultivation.api.js       # Cultivation stage logging & history endpoints
    │   ├── marketplace.api.js       # Produce listings & order endpoints
    │   ├── contract.api.js          # Contract negotiation & tracking endpoints
    │   └── supplier.api.js          # Catalog browsing & buyback endpoints
    │
    ├── components/                  # Reusable UI component library (JSX)
    │   ├── common/                  # Atomic presentation components
    │   │   ├── Button.jsx
    │   │   ├── Input.jsx
    │   │   ├── Badge.jsx            # Stage & verification status pill
    │   │   ├── Card.jsx
    │   │   ├── Loader.jsx
    │   │   └── Header.jsx
    │   ├── camera/                  # Custom Camera Evidence Module
    │   │   ├── LiveCameraView.jsx   # Live hardware capture (gallery disabled)
    │   │   └── GeoTagOverlay.jsx    # Live GPS coordinates & timestamp HUD
    │   ├── timeline/                # Cultivation Provenance Visualizer
    │   │   ├── TimelineView.jsx     # Stage-by-stage chronological feed
    │   │   └── StageCard.jsx        # Card showing photos, inputs, and amendments
    │   └── marketplace/
    │       ├── ProduceCard.jsx      # Listing item with farming type tag
    │       └── FilterBar.jsx        # Filter by Greenhouse vs. Open-field
    │
    ├── navigation/                  # Role-Based Navigation Hierarchy
    │   ├── RootNavigator.jsx        # Switches between Auth and Role stacks
    │   ├── AuthNavigator.jsx        # Login, Register, Role Selection stack
    │   ├── FarmerNavigator.jsx      # Bottom tab: Dashboard, Crops, Orders, Chat
    │   ├── BuyerNavigator.jsx       # Bottom tab: Market, Contracts, Orders, Profile
    │   ├── SupplierNavigator.jsx    # Bottom tab: Catalog, Buyback, Audits, Profile
    │   └── AdminNavigator.jsx       # Bottom tab: Verification, Audits, Disputes, Profile
    │
    ├── screens/                     # Application Screens by Role (JSX)
    │   ├── auth/                    # Shared Authentication Screens
    │   │   ├── LoginScreen.jsx
    │   │   ├── RegisterScreen.jsx
    │   │   └── RoleSelectionScreen.jsx
    │   │
    │   ├── farmer/                  # Farmer Module Screens
    │   │   ├── FarmerDashboardScreen.jsx
    │   │   ├── CropListScreen.jsx
    │   │   ├── AddCropScreen.jsx
    │   │   ├── AddCultivationStageScreen.jsx
    │   │   ├── LiveCaptureScreen.jsx
    │   │   ├── HarvestListScreen.jsx
    │   │   ├── FarmerContractsScreen.jsx
    │   │   └── OrderRequestsScreen.jsx
    │   │
    │   ├── buyer/                   # Buyer Module Screens
    │   │   ├── MarketplaceScreen.jsx
    │   │   ├── ProduceDetailScreen.jsx
    │   │   ├── CultivationHistoryScreen.jsx # Verifiable provenance view
    │   │   ├── CreateOrderScreen.jsx
    │   │   ├── ContractInitiateScreen.jsx
    │   │   ├── ContractTrackingScreen.jsx
    │   │   └── BuyerOrdersScreen.jsx
    │   │
    │   ├── supplier/                # Supplier Module Screens
    │   │   ├── CatalogScreen.jsx
    │   │   ├── AddMaterialScreen.jsx
    │   │   ├── BuybackRequestsScreen.jsx
    │   │   └── FarmerAuditScreen.jsx
    │   │
    │   └── admin/                   # Admin Governance Module Screens
    │       ├── AdminDashboardScreen.jsx     # High-level platform KPIs & metrics
    │       ├── FarmerVerificationScreen.jsx # KYC deed & document approval queue
    │       ├── DisputeReviewScreen.jsx      # Contract dispute arbitration & notes
    │       └── AuditLedgerScreen.jsx        # Append-only cultivation log inspector
    │
    ├── services/                    # Native Device & Hardware Services
    │   ├── offlineStorage.js        # Local offline cache & queue manager (AsyncStorage / MMKV)
    │   ├── syncQueue.service.js     # Offline Outbox queue & sync manager
    │   ├── camera.service.js        # Native camera sensor adapter
    │   ├── location.service.js      # Native GPS coordinate acquisition
    │   └── pushNotification.service.js # FCM background handler
    │
    ├── store/                       # State Management (Zustand)
    │   ├── authStore.js             # User session, JWT tokens, active role
    │   ├── syncStore.js             # Pending offline items & sync status
    │   └── cartStore.js             # Input supplies & order drafts
    │
    ├── constants/                   # Static theme tokens & agronomic stages
    │   ├── theme.js                 # Colors, typography, spacing
    │   ├── stages.js                # Standardized crop growth stages
    │   └── config.js                # API URLs and timeout limits
    │
    └── utils/                       # Helpers & formatters
        ├── formatters.js            # Currency, dates, metric unit formatters
        ├── validators.js            # Form validation logic
        └── permissionHelper.js      # Hardware camera & GPS permission handlers
```

---

| Team Member | Registration | Assigned Module | Backend Directories Owned | Frontend Directories Owned |
| :--- | :--- | :--- | :--- | :--- |
| **K.G.T.R. Karunajeewa** | `22CSE0377` | **Farmer & Cultivation History** | `src/controllers/farmer.controller.js`<br/>`src/controllers/cultivation.controller.js`<br/>`src/services/cultivation.service.js`<br/>`src/services/integrity.service.js`<br/>`src/routes/cultivation.routes.js` | `frontend/mobile/src/screens/farmer/`<br/>`frontend/mobile/src/components/camera/`<br/>`frontend/mobile/src/components/timeline/`<br/>`frontend/mobile/src/services/camera.service.js`<br/>`frontend/mobile/src/services/location.service.js` |
| **A.M.H.B. Adasooriya** | `22CSE0365` | **Buyer & Supplier Module** | `src/controllers/marketplace.controller.js`<br/>`src/controllers/supplier.controller.js`<br/>`src/services/marketplace.service.js`<br/>`src/services/supplier.service.js`<br/>`src/routes/marketplace.routes.js`<br/>`src/routes/supplier.routes.js` | `frontend/mobile/src/screens/buyer/MarketplaceScreen.jsx`<br/>`frontend/mobile/src/screens/buyer/ProduceDetailScreen.jsx`<br/>`frontend/mobile/src/screens/supplier/`<br/>`frontend/mobile/src/navigation/BuyerNavigator.jsx`<br/>`frontend/mobile/src/navigation/SupplierNavigator.jsx` |
| **W.M.V. Chamith** | `22CSE0384` | **Contract Farming & Farmer Module** | `src/controllers/contract.controller.js`<br/>`src/services/contract.service.js`<br/>`src/routes/contract.routes.js`<br/>`src/validators/contract.validator.js` | `frontend/mobile/src/screens/buyer/ContractInitiateScreen.jsx`<br/>`frontend/mobile/src/screens/buyer/ContractTrackingScreen.jsx`<br/>`frontend/mobile/src/screens/farmer/FarmerContractsScreen.jsx`<br/>`frontend/mobile/src/services/offlineSync.service.js` |
| **M A.F. Nuha** | `22CSE0397` | **Admin Module & Buyer Module** | `src/controllers/admin.controller.js`<br/>`src/services/admin.service.js`<br/>`src/routes/admin.routes.js`<br/>`src/controllers/auth.controller.js`<br/>`src/services/auth.service.js` | `frontend/mobile/src/screens/admin/`<br/>`frontend/mobile/src/navigation/AdminNavigator.jsx`<br/>`frontend/mobile/src/screens/buyer/BuyerOrdersScreen.jsx` |

---

## 4. Key Architectural Design Patterns by Directory

### 4.1 Backend
1. **Append-Only Event Store Pattern (`backend/src/services/cultivation.service.js` & `backend/prisma/schema.prisma`)**:
   Cultivation logs are write-once. Updates and deletes are blocked at the database trigger level. Corrections trigger linked records in `cultivation_amendments`.
2. **Repository & Service Pattern (`backend/src/services/` & `backend/src/controllers/`)**:
   Separates query composition and persistence from business rules and HTTP transport.
3. **Intercepting Filter Pattern (`backend/src/middlewares/`)**:
   Uniformly executes authentication, role checks, and input sanitization before controllers are reached.
4. **Dual-URL Connection Pooling Pattern (`backend/prisma/schema.prisma` & `backend/src/config/database.js`)**:
   Express backend routes queries through the Supabase Supavisor transaction pooler (`DATABASE_URL`, port 6543), while schema migration and DDL locks execute through the direct session connection (`DIRECT_URL`, port 5432), preventing connection exhaustion under high mobile load.
5. **Native ES Modules Architecture Pattern (`backend/package.json` & `backend/src/`)**:
   The entire backend executes natively on Node.js using modern ECMAScript standard modules (`"type": "module"`, `import`/`export`). Eliminates compilation build steps, source-map debugging delays, and transpile latency, accelerating student feature delivery while maintaining strict runtime validation via Zod schemas.

### 4.2 Frontend Mobile
1. **Offline Outbox Pattern (`frontend/mobile/src/services/syncQueue.service.js`)**:
   Cultivation events are persisted into a local offline outbox queue immediately (using AsyncStorage / MMKV). A background worker monitors connectivity via `@react-native-community/netinfo` and replicates entries idempotently to the central PostgreSQL database.
2. **Hardware Adapter Pattern (`frontend/mobile/src/services/camera.service.js`)**:
   Abstracts native device camera hardware, strictly prohibiting calls to the device gallery to guarantee evidence freshness.
3. **Role-Driven Navigation Pattern (`frontend/mobile/src/navigation/RootNavigator.jsx`)**:
   Dynamically swaps the navigation stack depending on whether the authenticated user is a `FARMER`, `BUYER`, `SUPPLIER`, or `ADMIN`. Platform operators can review KYC submissions and monitor ledger integrity directly from the mobile app without requiring a separate web client.
