# Architectural Report: Project File Structure
## TraceRoot: Farm-to-Buyer Agricultural Contact and Transparency System

---

## Executive Summary

To support the functional and non-functional requirements established in the TraceRoot proposal, the codebase is structured into two completely decoupled root directories:
1. **`/backend`**: A scalable, modular Node.js/Express.js REST API built with TypeScript, Prisma ORM, and PostgreSQL. It enforces role-based access control, transaction boundaries, and the **append-only immutable ledger** for cultivation provenance.
2. **`/frontend`**: Houses the user-facing client applications, logically segregated into:
   - **`/frontend/mobile`**: A cross-platform **React Native (Expo)** application serving Farmers, Buyers, and Field Suppliers, equipped with native camera-only hardware access and an **offline-first SQLite outbox**.
   - **`/frontend/admin-web`**: A responsive **React / Next.js** web dashboard for platform administrators to manage KYC user verification, oversee contract disputes, and inspect append-only audit logs.

This decoupled architecture enables independent deployment, strict separation of concerns, and parallel development across all four team members without merge contention.

---

## 1. Backend File Structure (`/backend`)

The backend follows the **Controller-Service-Repository** pattern and **Clean Architecture** principles. Business logic is isolated from HTTP transport and database drivers.

### 1.1 Complete Visual Directory Tree

```
backend/
├── .env.example                     # Environment variables template
├── .gitignore                       # Git ignore rules for Node/TypeScript
├── README.md                        # Backend setup, migration, and run instructions
├── package.json                     # Dependencies, scripts, and engine specs
├── tsconfig.json                    # TypeScript compiler options
├── prisma/
│   ├── schema.prisma                # Database schema (ERD models & triggers)
│   ├── migrations/                  # Automated SQL migration history
│   └── seed.ts                      # Development seed data for testing
└── src/
    ├── app.ts                       # Express application configuration & middleware
    ├── server.ts                    # Server initialization, port listener & shutdown
    │
    ├── config/                      # Environment and third-party configurations
    │   ├── index.ts                 # Centralized environment config loader
    │   ├── database.ts              # PrismaClient singleton instance
    │   ├── s3.config.ts             # AWS S3 / Cloudflare R2 bucket setup
    │   └── firebase.config.ts       # Firebase Admin SDK (FCM notifications)
    │
    ├── types/                       # Global TypeScript definitions & DTOs
    │   ├── index.ts                 # Common response and JWT payload types
    │   ├── express.d.ts             # Express Request augmentation (user context)
    │   ├── enums.ts                 # Role, FarmingType, OrderStatus enums
    │   └── dtos/                    # Data Transfer Object validation schemas
    │       ├── auth.dto.ts
    │       ├── cultivation.dto.ts
    │       ├── contract.dto.ts
    │       └── marketplace.dto.ts
    │
    ├── middlewares/                 # Request processing & security filters
    │   ├── auth.middleware.ts       # JWT verification & token extraction
    │   ├── rbac.middleware.ts       # Role-Based Access Control guard
    │   ├── validate.middleware.ts   # Zod / Joi request body & query validator
    │   ├── rateLimiter.middleware.ts# Ingress rate limiter (brute-force defense)
    │   └── error.middleware.ts      # Centralized error & exception handling
    │
    ├── routes/                      # API endpoint definitions (REST routing)
    │   ├── index.ts                 # Aggregated router mounting under /api/v1
    │   ├── auth.routes.ts           # /auth (login, register, token refresh)
    │   ├── farmer.routes.ts         # /farmers (profiles, farm locations)
    │   ├── cultivation.routes.ts    # /cultivation (stage logs, amendments)
    │   ├── marketplace.routes.ts    # /listings & /orders (produce commerce)
    │   ├── contract.routes.ts       # /contracts (buyer-farmer agreements)
    │   ├── supplier.routes.ts       # /suppliers (catalogs & buyback orders)
    │   ├── admin.routes.ts          # /admin (verification, disputes, metrics)
    │   └── notification.routes.ts   # /notifications (in-app notes & push)
    │
    ├── controllers/                 # HTTP transport layer (Req/Res handling)
    │   ├── auth.controller.ts
    │   ├── farmer.controller.ts
    │   ├── cultivation.controller.ts
    │   ├── marketplace.controller.ts
    │   ├── contract.controller.ts
    │   ├── supplier.controller.ts
    │   ├── admin.controller.ts
    │   └── notification.controller.ts
    │
    ├── services/                    # Core business logic & transaction handling
    │   ├── auth.service.ts          # Password hashing, token generation
    │   ├── cultivation.service.ts   # Append-only ledger writes & timeline queries
    │   ├── integrity.service.ts     # GPS boundary check & image SHA-256 digest
    │   ├── marketplace.service.ts   # Harvest listing & purchase order lifecycle
    │   ├── contract.service.ts      # Agreement state machine & milestone tracking
    │   ├── supplier.service.ts      # Input purchasing & harvest buybacks
    │   ├── admin.service.ts         # User verification & system audit reports
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
| `prisma/` | Defines relational data models, constraints, and custom SQL migrations. Houses PostgreSQL database triggers that block `UPDATE` and `DELETE` on the `cultivation_records` table. | **Data Mapper / ORM** |
| `src/config/` | Initializes runtime configurations and manages singletons for external connections (PostgreSQL connection pool, S3 client, FCM client). | **Singleton Pattern** |
| `src/middlewares/` | Intercepts HTTP requests to enforce stateless security (JWT), role claims (`FARMER`, `BUYER`, `SUPPLIER`, `ADMIN`), payload sanitization, and global exception mapping. | **Intercepting Filter / Pipeline** |
| `src/routes/` | Declaratively maps URIs to controllers, pairing each route with validation schemas and role guards. | **Front Controller / Routing** |
| `src/controllers/` | Extracts headers, parameters, and bodies from incoming requests; delegates business processing to domain services; returns standard JSON envelopes. | **Adapter / MVC Controller** |
| `src/services/` | Contains pure business rules, workflow transitions, and transactional queries. Manages append-only ledger creation and amendment chaining. | **Domain Service / Unit of Work** |
| `src/utils/` | Provides stateless helpers for image integrity hashing (SHA-256), geo-distance math, and error formatting. | **Utility / Pure Functions** |

---

## 2. Frontend File Structure (`/frontend`)

TraceRoot requires a multi-client frontend strategy:
1. **`frontend/mobile/`**: The primary operational tool for Farmers, Buyers, and Agricultural Suppliers.
2. **`frontend/admin-web/`**: The desktop-focused operational and governance console for System Administrators.

```
frontend/
├── mobile/       # React Native / Expo cross-platform mobile application
└── admin-web/    # Next.js / React web dashboard for platform administrators
```

---

### 2.1 Mobile Application (`/frontend/mobile`)

The mobile client is engineered with an **Offline-First** posture to withstand rural network drops. It features native hardware camera integration that omits gallery image selection to prevent photo tampering.

```
frontend/mobile/
├── .env.example                     # Mobile environment configuration
├── .gitignore                       # Git ignore rules for React Native/Expo
├── README.md                        # Mobile setup and mobile simulator instructions
├── app.json                         # Expo configuration (permissions, camera, GPS)
├── App.tsx                          # Root application entry point
├── package.json                     # Mobile dependencies and run scripts
├── tsconfig.json                    # TypeScript configuration
├── assets/                          # Static branding, splash screens, and icons
│   ├── fonts/                       # Custom typography
│   ├── icons/                       # SVG and PNG icons
│   └── images/                      # App logos and illustrations
└── src/
    ├── api/                         # Backend REST communication
    │   ├── client.ts                # Axios instance with auth headers & refresh interceptor
    │   ├── auth.api.ts              # Authentication endpoints
    │   ├── cultivation.api.ts       # Cultivation stage logging & history endpoints
    │   ├── marketplace.api.ts       # Produce listings & order endpoints
    │   ├── contract.api.ts          # Contract negotiation & tracking endpoints
    │   └── supplier.api.ts          # Catalog browsing & buyback endpoints
    │
    ├── components/                  # Reusable UI component library
    │   ├── common/                  # Atomic presentation components
    │   │   ├── Button.tsx
    │   │   ├── Input.tsx
    │   │   ├── Badge.tsx            # Stage & verification status pill
    │   │   ├── Card.tsx
    │   │   ├── Loader.tsx
    │   │   └── Header.tsx
    │   ├── camera/                  # Custom Camera Evidence Module
    │   │   ├── LiveCameraView.tsx   # Live hardware capture (gallery disabled)
    │   │   └── GeoTagOverlay.tsx    # Live GPS coordinates & timestamp HUD
    │   ├── timeline/                # Cultivation Provenance Visualizer
    │   │   ├── TimelineView.tsx     # Stage-by-stage chronological feed
    │   │   └── StageCard.tsx        # Card showing photos, inputs, and amendments
    │   └── marketplace/
    │       ├── ProduceCard.tsx      # Listing item with farming type tag
    │       └── FilterBar.tsx        # Filter by Greenhouse vs. Open-field
    │
    ├── navigation/                  # Role-Based Navigation Hierarchy
    │   ├── RootNavigator.tsx        # Switches between Auth and Role stacks
    │   ├── AuthNavigator.tsx        # Login, Register, Role Selection stack
    │   ├── FarmerNavigator.tsx      # Bottom tab: Dashboard, Crops, Orders, Chat
    │   ├── BuyerNavigator.tsx       # Bottom tab: Market, Contracts, Orders, Profile
    │   └── SupplierNavigator.tsx    # Bottom tab: Catalog, Buyback, Audits, Profile
    │
    ├── screens/                     # Application Screens by Role
    │   ├── auth/                    # Shared Authentication Screens
    │   │   ├── LoginScreen.tsx
    │   │   ├── RegisterScreen.tsx
    │   │   └── RoleSelectionScreen.tsx
    │   │
    │   ├── farmer/                  # Farmer Module Screens
    │   │   ├── FarmerDashboardScreen.tsx
    │   │   ├── CropListScreen.tsx
    │   │   ├── AddCropScreen.tsx
    │   │   ├── AddCultivationStageScreen.tsx
    │   │   ├── LiveCaptureScreen.tsx
    │   │   ├── HarvestListScreen.tsx
    │   │   ├── FarmerContractsScreen.tsx
    │   │   └── OrderRequestsScreen.tsx
    │   │
    │   ├── buyer/                   # Buyer Module Screens
    │   │   ├── MarketplaceScreen.tsx
    │   │   ├── ProduceDetailScreen.tsx
    │   │   ├── CultivationHistoryScreen.tsx # Verifiable provenance view
    │   │   ├── CreateOrderScreen.tsx
    │   │   ├── ContractInitiateScreen.tsx
    │   │   ├── ContractTrackingScreen.tsx
    │   │   └── BuyerOrdersScreen.tsx
    │   │
    │   └── supplier/                # Supplier Module Screens
    │       ├── CatalogScreen.tsx
    │       ├── AddMaterialScreen.tsx
    │       ├── BuybackRequestsScreen.tsx
    │       └── FarmerAuditScreen.tsx
    │
    ├── services/                    # Native Device & Hardware Services
    │   ├── offlineStorage.ts        # Local SQLite database manager
    │   ├── syncQueue.service.ts     # Offline Outbox queue & sync manager
    │   ├── camera.service.ts        # Native camera sensor adapter
    │   ├── location.service.ts      # Native GPS coordinate acquisition
    │   └── pushNotification.service.ts # FCM background handler
    │
    ├── store/                       # State Management (Zustand / Redux)
    │   ├── authStore.ts             # User session, JWT tokens, active role
    │   ├── syncStore.ts             # Pending offline items & sync status
    │   └── cartStore.ts             # Input supplies & order drafts
    │
    ├── constants/                   # Static theme tokens & agronomic stages
    │   ├── theme.ts                 # Colors, typography, spacing
    │   ├── stages.ts                # Standardized crop growth stages
    │   └── config.ts                # API URLs and timeout limits
    │
    └── utils/                       # Helpers & formatters
        ├── formatters.ts            # Currency, dates, metric unit formatters
        ├── validators.ts            # Form validation logic
        └── permissionHelper.ts      # Hardware camera & GPS permission handlers
```

---

### 2.2 Admin Web Dashboard (`/frontend/admin-web`)

The administrative portal allows platform supervisors to verify newly registered farmers and agro-suppliers, monitor market activities, resolve contract disputes, and review the append-only audit trail.

```
frontend/admin-web/
├── .env.example                     # Web portal environment variables
├── .gitignore                       # Git ignore rules for Next.js / React
├── README.md                        # Web dashboard setup and run instructions
├── package.json                     # Web dependencies and build scripts
├── tsconfig.json                    # TypeScript compiler configuration
├── tailwind.config.js               # Tailwind CSS design system tokens
├── postcss.config.js                # PostCSS configuration
│
├── public/                          # Public static assets & branding
│   └── favicon.ico
│
└── src/
    ├── app/                         # Next.js App Router (or pages/ for Vite)
    │   ├── layout.tsx               # Root layout with sidebar and header
    │   ├── page.tsx                 # Default redirect to dashboard
    │   ├── login/
    │   │   └── page.tsx             # Admin authentication screen
    │   ├── dashboard/
    │   │   └── page.tsx             # High-level platform KPIs & statistics
    │   ├── verifications/
    │   │   └── page.tsx             # Farmer & Supplier KYC approval queue
    │   ├── contracts/
    │   │   └── page.tsx             # Active contract monitoring & dispute view
    │   ├── audit-ledger/
    │   │   └── page.tsx             # Append-only cultivation log inspector
    │   └── reports/
    │       └── page.tsx             # Operational reports & CSV data export
    │
    ├── components/                  # Admin UI Component Library
    │   ├── layout/
    │   │   ├── AdminSidebar.tsx     # Navigation sidebar
    │   │   ├── AdminHeader.tsx      # Top bar with admin profile & alerts
    │   │   └── StatCard.tsx         # Metric summary card
    │   ├── tables/
    │   │   ├── DataTable.tsx        # Paginated, sortable data table
    │   │   └── ActionDropdown.tsx   # Row actions (Verify, Reject, View)
    │   ├── modals/
    │   │   ├── KycReviewModal.tsx   # Inspect submitted farmer deeds / licenses
    │   │   └── DisputeModal.tsx     # Review evidence & log dispute verdict
    │   └── common/
    │       ├── StatusBadge.tsx
    │       └── ExportButton.tsx
    │
    ├── api/                         # Admin API Client
    │   ├── adminClient.ts           # Configured HTTP client with bearer tokens
    │   ├── verifications.api.ts     # KYC approval & rejection requests
    │   ├── audits.api.ts            # Query tamper-resistant ledger logs
    │   └── reports.api.ts           # Fetch analytics & aggregated metrics
    │
    ├── types/                       # Admin TypeScript interfaces
    │   └── admin.types.ts
    │
    └── utils/                       # Web helpers
        ├── exportToCsv.ts           # CSV export generator
        └── dateUtil.ts              # Localized date formatters
```

---

## 3. Team Member Module Ownership Mapping

To ensure seamless coordination among the four project members (as specified in Table 1 of the Project Proposal), development responsibilities are cleanly decoupled across the directory tree:

| Team Member | Registration | Assigned Module | Backend Directories Owned | Frontend Directories Owned |
| :--- | :--- | :--- | :--- | :--- |
| **K.G.T.R. Karunajeewa** | `22CSE0377` | **Farmer & Cultivation History** | `src/controllers/farmer.controller.ts`<br/>`src/controllers/cultivation.controller.ts`<br/>`src/services/cultivation.service.ts`<br/>`src/services/integrity.service.ts`<br/>`src/routes/cultivation.routes.ts` | `frontend/mobile/src/screens/farmer/`<br/>`frontend/mobile/src/components/camera/`<br/>`frontend/mobile/src/components/timeline/`<br/>`frontend/mobile/src/services/camera.service.ts`<br/>`frontend/mobile/src/services/location.service.ts` |
| **A.M.H.B. Adasooriya** | `22CSE0365` | **Buyer & Supplier Module** | `src/controllers/marketplace.controller.ts`<br/>`src/controllers/supplier.controller.ts`<br/>`src/services/marketplace.service.ts`<br/>`src/services/supplier.service.ts`<br/>`src/routes/marketplace.routes.ts`<br/>`src/routes/supplier.routes.ts` | `frontend/mobile/src/screens/buyer/MarketplaceScreen.tsx`<br/>`frontend/mobile/src/screens/buyer/ProduceDetailScreen.tsx`<br/>`frontend/mobile/src/screens/supplier/`<br/>`frontend/mobile/src/navigation/BuyerNavigator.tsx`<br/>`frontend/mobile/src/navigation/SupplierNavigator.tsx` |
| **W.M.V. Chamith** | `22CSE0384` | **Contract Farming & Farmer Module** | `src/controllers/contract.controller.ts`<br/>`src/services/contract.service.ts`<br/>`src/routes/contract.routes.ts`<br/>`src/types/dtos/contract.dto.ts` | `frontend/mobile/src/screens/buyer/ContractInitiateScreen.tsx`<br/>`frontend/mobile/src/screens/buyer/ContractTrackingScreen.tsx`<br/>`frontend/mobile/src/screens/farmer/FarmerContractsScreen.tsx`<br/>`frontend/mobile/src/services/offlineSync.service.ts` |
| **M A.F. Nuha** | `22CSE0397` | **Admin Module & Buyer Module** | `src/controllers/admin.controller.ts`<br/>`src/services/admin.service.ts`<br/>`src/routes/admin.routes.ts`<br/>`src/controllers/auth.controller.ts`<br/>`src/services/auth.service.ts` | `frontend/admin-web/src/app/`<br/>`frontend/admin-web/src/components/`<br/>`frontend/admin-web/src/api/`<br/>`frontend/mobile/src/screens/buyer/BuyerOrdersScreen.tsx` |

---

## 4. Key Architectural Design Patterns by Directory

### 4.1 Backend
1. **Append-Only Event Store Pattern (`backend/src/services/cultivation.service.ts` & `backend/prisma/schema.prisma`)**:
   Cultivation logs are write-once. Updates and deletes are blocked at the database trigger level. Corrections trigger linked records in `cultivation_amendments`.
2. **Repository & Service Pattern (`backend/src/services/` & `backend/src/controllers/`)**:
   Separates query composition and persistence from business rules and HTTP transport.
3. **Intercepting Filter Pattern (`backend/src/middlewares/`)**:
   Uniformly executes authentication, role checks, and input sanitization before controllers are reached.

### 4.2 Frontend Mobile
1. **Offline Outbox Pattern (`frontend/mobile/src/services/syncQueue.service.ts`)**:
   Cultivation events are persisted into a local SQLite queue immediately. A background worker monitors connectivity via `@react-native-community/netinfo` and replicates entries idempotently to the backend.
2. **Hardware Adapter Pattern (`frontend/mobile/src/services/camera.service.ts`)**:
   Abstracts native device camera hardware, strictly prohibiting calls to the device gallery to guarantee evidence freshness.
3. **Role-Driven Navigation Pattern (`frontend/mobile/src/navigation/RootNavigator.tsx`)**:
   Dynamically swaps the navigation stack depending on whether the authenticated user is a `FARMER`, `BUYER`, or `SUPPLIER`.

### 4.3 Frontend Admin Web
1. **Facade Pattern (`frontend/admin-web/src/api/adminClient.ts`)**:
   Provides simplified methods that aggregate user accounts, verification documents, and audit logs into high-level dashboard views.
2. **Component Composition (`frontend/admin-web/src/components/`)**:
   Reuses accessible atomic UI widgets across verification, dispute handling, and compliance screens.
