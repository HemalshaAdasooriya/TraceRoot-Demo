# TraceRoot — Farm-to-Buyer Agricultural Contact and Transparency System

> **Full-Stack Architecture Specification & Master Project Documentation**  
> **Course:** SE5104 - Mini Project | **Academic Year:** 2022/2023 Batch  
> **Institution:** Department of Software Engineering, Sabaragamuwa University of Sri Lanka  
> **Project Group:** Group 06  
> **Tech Paradigm:** 100% JavaScript (Node.js ESM + React Native Expo JSX + Vite React JSX + Supabase PostgreSQL 16)  
> **Document Status:** ✅ FINAL — Consolidated Single-Source Architecture & Engineering Reference  

---

## 📋 Table of Contents

1. [Executive Summary & Vision](#1-executive-summary--vision)
2. [Confirmed Architectural Decisions](#2-confirmed-architectural-decisions)
3. [System Architecture & Layered Design](#3-system-architecture--layered-design)
4. [Complete Technology Stack (100% JavaScript)](#4-complete-technology-stack-100-javascript)
5. [Component Breakdown & Domain Subsystems](#5-component-breakdown--domain-subsystems)
6. [Supabase Database Schema & Data Integrity](#6-supabase-database-schema--data-integrity)
   - 6.1 [Entity Relationship Diagram](#61-entity-relationship-diagram)
   - 6.2 [PostgreSQL DDL & Schema Definitions](#62-postgresql-ddl--schema-definitions)
   - 6.3 [Database-Level Append-Only Triggers](#63-database-level-append-only-triggers)
   - 6.4 [Row Level Security (RLS) Policies](#64-row-level-security-rls-policies)
   - 6.5 [Supabase Storage Bucket Layout](#65-supabase-storage-bucket-layout)
7. [Unified Project Directory Structure](#7-unified-project-directory-structure)
   - 7.1 [Mobile Client Structure (`/frontend/mobile`)](#71-mobile-client-structure-frontendmobile)
   - 7.2 [Backend API Structure (`/backend`)](#72-backend-api-structure-backend)
   - 7.3 [Web Admin Dashboard (`/admin-dashboard`)](#73-web-admin-dashboard-admin-dashboard)
8. [Key Implementation Reference (JavaScript / JSX)](#8-key-implementation-reference-javascript--jsx)
   - 8.1 [Supabase Client with SecureStore Adapter](#81-supabase-client-with-securestore-adapter)
   - 8.2 [Cultivation Record Service (Append-Only + SHA-256)](#82-cultivation-record-service-append-only--sha-256)
   - 8.3 [SHA-256 Tamper-Detection Hash Utility](#83-sha-256-tamper-detection-hash-utility)
   - 8.4 [Live Camera Capture (Gallery Blocked)](#84-live-camera-capture-gallery-blocked)
   - 8.5 [OpenStreetMap via react-native-maps](#85-openstreetmap-via-react-native-maps)
   - 8.6 [OpenStreetMap Reverse Geocoding (Nominatim)](#86-openstreetmap-reverse-geocoding-nominatim)
   - 8.7 [Offline Queue Hook with ⏳ Pending Sync Badge](#87-offline-queue-hook-with--pending-sync-badge)
   - 8.8 [Pending Sync Badge Component](#88-pending-sync-badge-component)
   - 8.9 [Role-Based Dynamic Navigation](#89-role-based-dynamic-navigation)
   - 8.10 [Google OAuth Integration](#810-google-oauth-integration)
   - 8.11 [Growth Stage Timeline Visualizer](#811-growth-stage-timeline-visualizer)
9. [Figma Design System Tokens](#9-figma-design-system-tokens)
10. [End-to-End Data Flow Diagrams](#10-end-to-end-data-flow-diagrams)
11. [Security, Privacy & Zero-Trust Governance](#11-security-privacy--zero-trust-governance)
12. [Development Phases, Sprint Plan & Team Ownership](#12-development-phases-sprint-plan--team-ownership)
13. [Environment Configuration & Getting Started](#13-environment-configuration--getting-started)

---

## 1. Executive Summary & Vision

**TraceRoot** is a mobile-first digital agriculture platform built to bridge information asymmetry in modern agricultural supply chains. Designed specifically for small- and medium-scale farmers, transparent agricultural suppliers, and institutional produce buyers (supermarkets, grocery chains, and restaurants), TraceRoot introduces end-to-end provenance verification through an **append-only "Cultivation History" ledger** and structured **Contract Farming** workflows.

### 1.1 Core Problems Addressed
- **Information Asymmetry**: Buyers cannot verify whether produce was cultivated in controlled greenhouses or open fields, nor can they verify chemical/fertilizer usage history.
- **Produce Spoofing & Tampering**: Conventional apps allow uploading pre-saved or stock photos from the gallery. TraceRoot blocks gallery uploads and enforces native, live camera-only capture with GPS auto-tagging and cryptographic SHA-256 hashing.
- **Rural Connectivity Constraints**: Rural farmers frequently operate without reliable cellular internet. TraceRoot employs an **Offline-First Outbox** architecture that allows logging cultivation actions offline and displays an explicit `⏳ Pending Sync` indicator until records are verified and persisted in the cloud.
- **Contract Ambiguity**: Verbal and informal commitments lead to post-harvest price crashes and supply defaults. TraceRoot digitizes contract farming agreements with agreed specifications, pricing, delivery dates, and stage-linked milestone tracking.

---

## 2. Confirmed Architectural Decisions

| Aspect | Decision | Justification |
|---|---|---|
| **Programming Language** | **100% JavaScript (ES2023+ / ESM / JSX)** | Unified language across Node.js backend, React Native Expo mobile app, and Vite React admin dashboard. Eliminates compilation/transpilation overhead, eliminates build pipeline complexity, and uses `jsconfig.json` for IDE path mapping with Zod for runtime schema validation. |
| **Backend & Cloud Database** | **Supabase (Managed PostgreSQL 16)** | Built-in Auth (Email + Google OAuth), Row Level Security (RLS) for 4-role enforcement, Supabase Storage for cultivation photos, Realtime subscriptions for orders/messages, and Supavisor connection pooling. |
| **Mobile Client** | **React Native (Expo SDK 51 Managed Workflow)** | File-based routing (`expo-router v3`), hardware camera and GPS plugins (`expo-camera`, `expo-location`), cross-platform support. |
| **Admin Web Dashboard** | **React + Vite (JavaScript) on Vercel Free Tier** | Lightweight web portal for platform admins to verify KYC documents, manage dispute resolution, and view system metrics without running heavy infrastructure. |
| **Maps & Reverse Geocoding** | **OpenStreetMap + Nominatim** | 100% free; no Google Maps billing account or proprietary API keys required. |
| **Offline Record UX** | **⏳ Pending Sync Badge** | Explicit visual feedback in the cultivation timeline showing records currently queued locally in MMKV. |
| **Evidence Camera** | **Native Camera Only (Gallery Blocked)** | Zero-trust image capture directly from hardware sensor. Gallery picker is completely omitted from the codebase. |

---

## 3. System Architecture & Layered Design

TraceRoot follows a **Modular Layered Architecture** with an **Offline-First Edge Strategy**. The system is decoupled into client presentation tiers, an API gateway & security layer, application domain services, and managed persistence tiers.

```mermaid
flowchart TD
    subgraph Mobile["📱 React Native (Expo) — Mobile Client (JavaScript / JSX)"]
        FA[Farmer Module]
        BA[Buyer Module]
        SA[Supplier Module]
        AA[Admin In-App Review]
    end

    subgraph Web["🖥️ React + Vite — Web Admin Dashboard (JavaScript / JSX)\nHosted on Vercel Free Tier"]
        AD[Admin Platform Console]
    end

    subgraph Supabase["☁️ Supabase Cloud Backend (PostgreSQL 16)"]
        AUTH[Supabase Auth\nEmail + Google OAuth]
        DB[(PostgreSQL 16 Relational DB\nDual-Pool: Supavisor 6543 / Direct 5432)]
        ST[Supabase Storage Buckets\nPrivate Cultivation Photos + Public Assets]
        RT[Supabase Realtime\nOrder & Message Websockets]
        EF[Deno Edge Functions\nPush Dispatch & Verification]
        RLS[Row Level Security\n4-Role Boundary Guard]
    end

    subgraph Hardware["🌐 External Services & Hardware Sensors"]
        CAM[Device Hardware Camera\nexpo-camera live sensor]
        GPS[Device Hardware GPS\nexpo-location coordinates]
        OSM[OpenStreetMap + Nominatim\nFree map tiles & reverse geocode]
        PUSH[Expo Push Notification Service\nFCM/APNs gateway]
    end

    Mobile -->|HTTPS + JWT| AUTH
    Mobile -->|REST / PostgREST| DB
    Mobile -->|Multipart Binary Upload| ST
    Mobile -->|Websocket Subscribe| RT
    Web -->|HTTPS + Service Role Key| DB
    AUTH --> RLS
    RLS --> DB
    DB --> EF
    EF --> PUSH
    Mobile --> CAM
    Mobile --> GPS
    GPS --> OSM
```

### 3.1 Tiered Layer Architecture

```
+-------------------------------------------------------------------------------+
|                       Presentation Layer (Client Tier)                        |
|   [ React Native Expo Mobile App ]          [ React + Vite Web Admin Portal ] |
|   (Farmers | Buyers | Suppliers | Admins)   (KYC Review | System Audits)      |
|   (MMKV Offline Outbox & Cache)                                               |
+---------------------------------------+---------------------------------------+
                                        | HTTPS / TLS 1.3 + JWT Bearer
+---------------------------------------v---------------------------------------+
|                    API Gateway & Security Layer (Express / RLS)               |
|   [ Ingress Rate Limiter ]  [ RBAC Guard (4 Roles) ]  [ Zod Request Validator]|
+---------------------------------------+---------------------------------------+
                                        |
+---------------------------------------v---------------------------------------+
|                       Application & Domain Services Tier                      |
|   +-----------------------+  +----------------------+  +--------------------+ |
|   | Auth & Profile Svc    |  | Cultivation Ledger   |  | Marketplace & Order| |
|   +-----------------------+  +----------------------+  +--------------------+ |
|   +-----------------------+  +----------------------+  +--------------------+ |
|   | Contract Farming Svc  |  | Supplier & Buyback   |  | Notification Svc   | |
|   +-----------------------+  +----------------------+  +--------------------+ |
+---------------------------------------+---------------------------------------+
                                        |
+---------------------------------------v---------------------------------------+
|                        Data & Persistence Infrastructure                      |
|   [ Supabase Managed PostgreSQL 16 ]     [ Supabase Cloud Object Storage ]    |
|   - Supavisor Connection Pooling (6543)  - Private /cultivation-photos        |
|   - Direct Migration Port (5432)         - Public /harvest-images & /avatars  |
|   - PL/pgSQL Append-Only Triggers        - Pre-signed Upload URLs             |
|   - JSONB Dynamic Stage Form Payloads                                         |
+-------------------------------------------------------------------------------+
```

---

## 4. Complete Technology Stack (100% JavaScript)

The entire TraceRoot ecosystem is developed in **JavaScript** across all tiers:

| Layer / Concern | Technology & Version | Language / Format | Architectural Justification |
|---|---|---|---|
| **Mobile Client** | **React Native 0.74+ / Expo SDK 51** | JavaScript (ES2023+ / JSX) | Single cross-platform codebase for iOS & Android. Native hardware sensor access (Camera, GPS). |
| **Navigation** | **Expo Router v3** | JavaScript (`.jsx`) | File-based routing with role-based directory grouping: `(auth)`, `(farmer)`, `(buyer)`, `(supplier)`, `(admin)`. |
| **Mobile State** | **Zustand 4.x** | JavaScript (`.js`) | Lightweight, minimal boilerplate state management for auth session, offline queues, and UI states. |
| **Server State & Cache**| **TanStack Query (React Query) 5.x**| JavaScript (`.js`) | Intelligent caching, background re-fetching, optimistic mutations, and offline-aware query invalidation. |
| **Form Validation** | **React Hook Form + Zod 3.x** | JavaScript (`.js`) | Schema-driven runtime validation for complex stage logging without compile-time TypeScript requirements. |
| **Mobile Styling** | **NativeWind 4 (Tailwind for RN)** | JavaScript / CSS | Clean utility-class styling matching the Figma forest green & warm cream design system. |
| **Hardware Camera** | **`expo-camera`** | JavaScript (`.jsx`) | Live hardware sensor capture only. Gallery selection is intentionally omitted. |
| **Geolocation & Maps**| **`expo-location` + `react-native-maps` + OSM** | JavaScript (`.jsx`) | 100% free OpenStreetMap raster tiles; Nominatim reverse geocoding with zero API costs. |
| **Offline Storage** | **`react-native-mmkv`** | JavaScript (`.js`) | High-speed C++ backed key-value storage for the local offline outbox and cached records. |
| **Cryptographic Hash**| **`expo-crypto` (SHA-256)** | JavaScript (`.js`) | Generates deterministic cryptographic hash digests for every cultivation event. |
| **Token Storage** | **`expo-secure-store`** | JavaScript (`.js`) | Secure storage of JWT access and refresh tokens inside iOS Keychain and Android KeyStore. |
| **Backend REST API** | **Node.js 20 LTS + Express.js 4.19+** | JavaScript ES Modules (`"type": "module"`) | Fast non-blocking asynchronous event loop with native `import`/`export` and no compilation steps. |
| **Database & Auth** | **Supabase (PostgreSQL 16.x)** | SQL / PL/pgSQL | Managed relational database with Supavisor connection pooling, built-in Auth, Storage, and Realtime. |
| **Database ORM** | **Prisma ORM 5.19+** | JavaScript / Prisma Schema | Dual-URL connection pooling (`DATABASE_URL` pooler on port 6543, `DIRECT_URL` direct session on port 5432). |
| **Web Admin Portal** | **React 18 + Vite (JavaScript template)** | JavaScript (`.jsx`) | Deployed to Vercel free tier for KYC reviews, system audits, and dispute management. |

---

## 5. Component Breakdown & Domain Subsystems

### 5.1 Mobile Client Application (`TraceRoot Mobile`)
- **Farmer Subsystem**: Crop cycle setup (greenhouse vs. open-field), structured cultivation stage logging (Seedling, Vegetative, Flowering, Fruiting, Harvested), live photo capture, marketplace listing creation, contract acceptance, and messaging.
- **Buyer Subsystem**: Produce marketplace search with greenhouse/open-field filters, verifiable cultivation provenance inspector, direct purchase order checkout, buyer inquiry notes, and contract farming initiation.
- **Supplier Subsystem**: Input catalog management (seeds, fertilizers, agrochemicals, tools), order fulfillment from farmers, and harvest buyback proposals.
- **Admin Subsystem**: In-app mobile governance console: KYC document inspection (land deeds, business registration), verification approvals/rejections, and immutable ledger audit viewer.

### 5.2 Cultivation History & Provenance Subsystem
- **Append-Only Ledger**: Cultivation entries can only be inserted. `UPDATE` and `DELETE` operations are completely denied at both the Supabase RLS and database trigger levels.
- **Correction Chains**: If an error occurs, the farmer submits a new entry marked `is_correction = true` linked via `corrects_id`. The original entry remains permanently visible.
- **SHA-256 Tamper Detection**: Each entry computes a deterministic SHA-256 hash across harvest ID, farmer ID, stage, activity, image URL, GPS coordinates, and timestamp.

### 5.3 Marketplace & Order Subsystem
- **Harvest Listings**: Farmers publish available harvests with price per unit, available quantity, and cultivation method badges.
- **Purchase Orders**: Buyers submit direct purchase orders with state machine transitions: `pending` → `accepted` → `rejected` → `completed` → `cancelled`.

### 5.4 Contract Farming Subsystem
- **Agreements Before Planting**: Buyers initiate formal contracts specifying crop variety, farming method, quantity, agreed unit price, and required delivery date.
- **Crop Cycle Linking**: Farmers accept contracts and link specific active harvests to the contract for real-time stage tracking.

### 5.5 Agricultural Supplier & Buyback Subsystem
- **Agro Input Catalog**: Verified agro-companies publish authorized seeds, fertilizers, and equipment.
- **Closed-Loop Audits**: Suppliers can inspect cultivation logs of farmers using their inputs to verify recommended application protocols.

---

## 6. Supabase Database Schema & Data Integrity

### 6.1 Entity Relationship Diagram

```mermaid
erDiagram
    profiles ||--o| farmer_profiles : "extends"
    profiles ||--o| buyer_profiles : "extends"
    profiles ||--o| supplier_profiles : "extends"
    profiles ||--o{ harvests : "owns"
    harvests ||--o{ cultivation_records : "has history"
    harvests ||--o{ harvest_listings : "listed as"
    harvest_listings ||--o{ buyer_orders : "receives"
    profiles ||--o{ supplier_orders : "places/receives"
    catalogue_items }o--|| profiles : "owned by supplier"
    contracts }o--|| profiles : "buyer creates"
    contracts }o--o| profiles : "farmer fulfils"
    contracts }o--o| harvests : "linked to"
    messages }o--|| profiles : "sender"
    messages }o--|| profiles : "receiver"
    notifications }o--|| profiles : "delivered to"
```

### 6.2 PostgreSQL DDL & Schema Definitions

```sql
-- ─────────────────────────────────────────────────────────────────
-- TRACEROOT POSTGRESQL DDL (SUPABASE CLOUD)
-- ─────────────────────────────────────────────────────────────────

-- Sequence for human-readable trace IDs (TR-0001, TR-0002, ...)
CREATE SEQUENCE IF NOT EXISTS trace_id_seq START 1;

-- 1. BASE PROFILES (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('farmer', 'buyer', 'supplier', 'admin')),
  full_name    TEXT NOT NULL,
  phone        TEXT,
  email        TEXT NOT NULL,
  avatar_url   TEXT,
  is_verified  BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FARMER PROFILES
CREATE TABLE IF NOT EXISTS farmer_profiles (
  id            UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  farming_type  TEXT NOT NULL CHECK (farming_type IN ('greenhouse', 'open_field')),
  farm_name     TEXT,
  farm_location TEXT,
  farm_lat      DECIMAL(10, 8),
  farm_lng      DECIMAL(11, 8),
  nic_number    TEXT,
  description   TEXT
);

-- 3. SUPPLIER PROFILES
CREATE TABLE IF NOT EXISTS supplier_profiles (
  id           UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  address      TEXT,
  br_number    TEXT,
  description  TEXT
);

-- 4. BUYER PROFILES
CREATE TABLE IF NOT EXISTS buyer_profiles (
  id            UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_type    TEXT NOT NULL CHECK (buyer_type IN ('supermarket', 'retailer', 'restaurant')),
  company_name  TEXT NOT NULL,
  address       TEXT,
  br_number     TEXT
);

-- 5. HARVESTS (Crop Cycles)
CREATE TABLE IF NOT EXISTS harvests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id             UUID NOT NULL REFERENCES profiles(id),
  crop_name             TEXT NOT NULL,
  crop_emoji            TEXT DEFAULT '🌱',
  farming_type          TEXT NOT NULL CHECK (farming_type IN ('greenhouse', 'open_field')),
  planted_date          DATE NOT NULL,
  expected_harvest_date DATE,
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'harvested', 'sold', 'contracted')),
  current_stage         TEXT NOT NULL DEFAULT 'seedling'
                        CHECK (current_stage IN ('seedling', 'vegetative_growth', 'flowering', 'fruiting', 'harvested')),
  description           TEXT,
  cover_image_url       TEXT,
  is_listed             BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CULTIVATION RECORDS (STRICT APPEND-ONLY LEDGER)
CREATE TABLE IF NOT EXISTS cultivation_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id        TEXT UNIQUE NOT NULL
                  DEFAULT ('TR-' || LPAD(nextval('trace_id_seq')::TEXT, 4, '0')),
  harvest_id      UUID NOT NULL REFERENCES harvests(id),
  farmer_id       UUID NOT NULL REFERENCES profiles(id),
  stage           TEXT NOT NULL CHECK (stage IN ('seedling', 'vegetative_growth', 'flowering', 'fruiting', 'harvested')),
  activity_type   TEXT NOT NULL,
  notes           TEXT,
  inputs_used     JSONB,          -- e.g. [{"name":"NPK Fertilizer","qty":"2 kg"}]
  conditions      JSONB,          -- e.g. {"temperature":"28°C","humidity":"65%"}
  photo_url       TEXT,           -- Supabase Storage URL
  photo_taken_at  TIMESTAMPTZ,
  is_live_capture BOOLEAN DEFAULT TRUE,
  location_name   TEXT,
  latitude        DECIMAL(10, 8),
  longitude       DECIMAL(11, 8),
  sync_status     TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending')),
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_correction   BOOLEAN DEFAULT FALSE,
  corrects_id     UUID REFERENCES cultivation_records(id),
  integrity_hash  TEXT NOT NULL
);

-- 7. SUPPLIER CATALOGUE
CREATE TABLE IF NOT EXISTS catalogue_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id  UUID NOT NULL REFERENCES profiles(id),
  name         TEXT NOT NULL,
  category     TEXT NOT NULL CHECK (category IN ('seed', 'fertilizer', 'pesticide', 'tool', 'other')),
  description  TEXT,
  price        DECIMAL(10, 2) NOT NULL,
  unit         TEXT NOT NULL,
  stock_qty    INTEGER DEFAULT 0,
  image_url    TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SUPPLIER ORDERS (Farmer purchases from Supplier)
CREATE TABLE IF NOT EXISTS supplier_orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id    UUID NOT NULL REFERENCES profiles(id),
  supplier_id  UUID NOT NULL REFERENCES profiles(id),
  items        JSONB NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 9. HARVEST LISTINGS (Marketplace Produce)
CREATE TABLE IF NOT EXISTS harvest_listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  harvest_id      UUID NOT NULL REFERENCES harvests(id),
  farmer_id       UUID NOT NULL REFERENCES profiles(id),
  title           TEXT NOT NULL,
  description     TEXT,
  price_per_unit  DECIMAL(10, 2),
  unit            TEXT,
  available_qty   DECIMAL(10, 2),
  images          JSONB,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 10. BUYER ORDERS (Buyer purchases from Farmer)
CREATE TABLE IF NOT EXISTS buyer_orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES harvest_listings(id),
  buyer_id    UUID NOT NULL REFERENCES profiles(id),
  farmer_id   UUID NOT NULL REFERENCES profiles(id),
  quantity    DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2),
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 11. CONTRACT FARMING
CREATE TABLE IF NOT EXISTS contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id        UUID NOT NULL REFERENCES profiles(id),
  farmer_id       UUID REFERENCES profiles(id),
  crop_required   TEXT NOT NULL,
  farming_type    TEXT NOT NULL CHECK (farming_type IN ('greenhouse', 'open_field', 'any')),
  quantity        DECIMAL(10, 2) NOT NULL,
  unit            TEXT NOT NULL,
  delivery_date   DATE,
  price_agreed    DECIMAL(10, 2),
  requirements    TEXT,
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'matched', 'in_progress', 'completed', 'disputed', 'cancelled')),
  harvest_id      UUID REFERENCES harvests(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 12. MESSAGES / IN-APP INQUIRIES
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES profiles(id),
  receiver_id UUID NOT NULL REFERENCES profiles(id),
  content     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 13. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('order', 'contract', 'message', 'verification', 'sync')),
  ref_id     UUID,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.3 Database-Level Append-Only Triggers

To prevent any direct database modification or accidental administrative mutation of historical records, a PL/pgSQL trigger blocks all `UPDATE` and `DELETE` queries on `cultivation_records`:

```sql
-- ─────────────────────────────────────────────────────────────────
-- IMMUTABILITY ENFORCEMENT TRIGGER
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_cultivation_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    RAISE EXCEPTION 'TraceRoot Integrity Violation: cultivation_records is strictly append-only. UPDATE operations are forbidden.';
  ELSIF (TG_OP = 'DELETE') THEN
    RAISE EXCEPTION 'TraceRoot Integrity Violation: cultivation_records cannot be deleted. History is permanent.';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cultivation_append_only ON cultivation_records;

CREATE TRIGGER trg_cultivation_append_only
BEFORE UPDATE OR DELETE ON cultivation_records
FOR EACH ROW
EXECUTE FUNCTION prevent_cultivation_tampering();
```

### 6.4 Row Level Security (RLS) Policies

```sql
-- ── PROFILES ────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "User updates own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin sees all profiles"
  ON profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── CULTIVATION RECORDS (APPEND-ONLY) ───────────────────────────
ALTER TABLE cultivation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmer inserts own records"
  ON cultivation_records FOR INSERT
  WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Farmer reads own records"
  ON cultivation_records FOR SELECT
  USING (auth.uid() = farmer_id);

CREATE POLICY "Buyer reads records of listed harvests"
  ON cultivation_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM harvests h
      WHERE h.id = harvest_id AND h.is_listed = TRUE
    )
  );

CREATE POLICY "Supplier reads records of supplied farmers"
  ON cultivation_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM supplier_orders so
      WHERE so.farmer_id = cultivation_records.farmer_id
        AND so.supplier_id = auth.uid()
    )
  );
-- NO UPDATE POLICY → records are immutable
-- NO DELETE POLICY → records are permanent

-- ── HARVESTS ────────────────────────────────────────────────────
ALTER TABLE harvests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmer manages own harvests"
  ON harvests FOR ALL USING (auth.uid() = farmer_id);

CREATE POLICY "Buyer reads listed harvests"
  ON harvests FOR SELECT USING (is_listed = TRUE);

-- ── CONTRACTS ───────────────────────────────────────────────────
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer manages own contracts"
  ON contracts FOR ALL USING (auth.uid() = buyer_id);

CREATE POLICY "Farmer reads matched contracts"
  ON contracts FOR SELECT USING (auth.uid() = farmer_id);

CREATE POLICY "Farmer updates matched contracts"
  ON contracts FOR UPDATE USING (auth.uid() = farmer_id);

-- ── MESSAGES ────────────────────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties read their own messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Authenticated user sends message"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
```

### 6.5 Supabase Storage Bucket Layout

```
supabase/storage/
│
├── cultivation-photos/          ← PRIVATE (RLS: farmer owner + authorized buyers & suppliers)
│   └── {farmer_id}/
│       └── {harvest_id}/
│           └── {record_id}.jpg
│
├── harvest-images/              ← PUBLIC (produce images displayed in buyer marketplace)
│   └── {farmer_id}/
│       └── {harvest_id}/
│           └── {filename}.jpg
│
├── catalogue-images/            ← PUBLIC (supplier product images)
│   └── {supplier_id}/
│       └── {item_id}.jpg
│
└── avatars/                     ← PUBLIC (user profile pictures)
    └── {user_id}.jpg
```

---

## 7. Unified Project Directory Structure

The repository is built strictly with **JavaScript** (`.jsx` for React components, `.js` for services/utilities/modules, and `jsconfig.json` for path mapping).

```
d:/Mini Project/code/
│
├── README.md                            # Complete Master Architecture & Project Documentation
├── .gitignore
│
├── backend/                             # Express.js REST API Server (Node.js ESM)
│   ├── .env.example
│   ├── docker-compose.yml               # Local PostgreSQL 16 container for offline dev fallback
│   ├── jsconfig.json                    # JavaScript path alias mapping (@/*)
│   ├── package.json                     # "type": "module" Node.js configuration
│   ├── prisma/
│   │   ├── schema.prisma                # Dual-URL connection schema (pooler 6543, direct 5432)
│   │   ├── seed.js                      # JavaScript development seed data
│   │   └── migrations/                  # Versioned PostgreSQL DDL & trigger scripts
│   └── src/
│       ├── app.js                       # Express app configuration & middlewares
│       ├── server.js                    # Server bootstrap & graceful shutdown
│       ├── config/
│       │   ├── database.js              # PrismaClient singleton for Supavisor connection pool
│       │   └── supabase.js              # Supabase Client SDK instance
│       ├── controllers/                 # HTTP route handlers (JavaScript)
│       ├── middlewares/                 # JWT Auth guard, RBAC, error handlers
│       ├── routes/                      # Aggregated Express router endpoints
│       ├── services/                    # Business rules & transaction logic
│       ├── utils/                       # Response formatting, hashing, geo math
│       └── validators/                  # Zod request schema validators
│
├── frontend/mobile/                     # TraceRoot Mobile App (React Native Expo SDK 51)
│   ├── app.json                         # Expo configuration (permissions, camera, GPS)
│   ├── babel.config.js
│   ├── tailwind.config.js               # NativeWind 4 design tokens configuration
│   ├── jsconfig.json                    # JavaScript path alias mapping (@/*)
│   ├── package.json                     # Mobile JavaScript dependencies
│   ├── app/                             # Expo Router v3 File-Based Routes (JSX)
│   │   ├── _layout.jsx                  # Root layout: auth guard & role-based redirect
│   │   ├── index.jsx                    # Splash screen & initial auth check
│   │   │
│   │   ├── (auth)/                      # Authentication Flow
│   │   │   ├── _layout.jsx
│   │   │   ├── login.jsx                # Figma Screen 1: 4-role selector + email/Google login
│   │   │   ├── register.jsx             # Role selection screen
│   │   │   ├── register-farmer.jsx      # Farmer details & farming type
│   │   │   ├── register-buyer.jsx       # Buyer details & business type
│   │   │   ├── register-supplier.jsx    # Supplier company & BR number
│   │   │   └── forgot-password.jsx
│   │   │
│   │   ├── (farmer)/                    # Farmer Role Stack (Bottom Tabs)
│   │   │   ├── _layout.jsx              # Tabs: Home | Harvests | Suppliers | Messages | Profile
│   │   │   ├── index.jsx                # Farmer home dashboard
│   │   │   ├── harvests/
│   │   │   │   ├── index.jsx            # My harvests list
│   │   │   │   ├── new.jsx              # Create new harvest / crop cycle
│   │   │   │   ├── [id].jsx             # Figma Screen 2: Stage progress dots + stage accordion
│   │   │   │   └── [id]/
│   │   │   │       ├── record/
│   │   │   │       │   ├── new.jsx      # Add cultivation record form
│   │   │   │       │   └── [recordId].jsx # Figma Screen 3: Live photo + SHA-256 badge
│   │   │   │       └── listing.jsx      # Publish harvest to marketplace
│   │   │   ├── contracts/
│   │   │   │   ├── index.jsx            # Contracts offered to me
│   │   │   │   └── [id].jsx             # Contract details + accept + link harvest
│   │   │   ├── suppliers/
│   │   │   │   ├── index.jsx            # Browse supplier catalog
│   │   │   │   ├── [supplierId].jsx     # Supplier profile & products
│   │   │   │   └── orders/
│   │   │   │       ├── index.jsx        # My purchase orders
│   │   │   │       └── [id].jsx
│   │   │   ├── messages/
│   │   │   │   ├── index.jsx            # In-app chat inbox
│   │   │   │   └── [userId].jsx         # Direct messaging thread
│   │   │   └── profile/
│   │   │       └── index.jsx
│   │   │
│   │   ├── (buyer)/                     # Buyer Role Stack (Bottom Tabs)
│   │   │   ├── _layout.jsx              # Tabs: Home | Explore | Orders | Contracts | Profile
│   │   │   ├── index.jsx                # Buyer dashboard
│   │   │   ├── explore/
│   │   │   │   ├── index.jsx            # Produce search & greenhouse/open-field filters
│   │   │   │   └── farmer/
│   │   │   │       ├── [id].jsx         # Farmer profile & active listings
│   │   │   │       └── [id]/harvest/[harvestId].jsx # Verifiable cultivation history view
│   │   │   ├── orders/
│   │   │   │   ├── index.jsx            # Buyer purchase orders
│   │   │   │   └── [id].jsx
│   │   │   ├── contracts/
│   │   │   │   ├── index.jsx            # My contract requests
│   │   │   │   ├── new.jsx              # New contract request form
│   │   │   │   └── [id].jsx             # Contract tracking & milestone inspection
│   │   │   ├── messages/
│   │   │   │   ├── index.jsx
│   │   │   │   └── [userId].jsx
│   │   │   └── profile/
│   │   │       └── index.jsx
│   │   │
│   │   ├── (supplier)/                  # Supplier Role Stack (Bottom Tabs)
│   │   │   ├── _layout.jsx              # Tabs: Home | Catalogue | Orders | Farmers | Profile
│   │   │   ├── index.jsx                # Supplier dashboard
│   │   │   ├── catalogue/
│   │   │   │   ├── index.jsx            # My agro inputs catalog
│   │   │   │   ├── new.jsx              # Add input product
│   │   │   │   └── [id].jsx             # Edit product
│   │   │   ├── orders/
│   │   │   │   ├── index.jsx            # Orders received from farmers
│   │   │   │   └── [id].jsx
│   │   │   ├── buyback/
│   │   │   │   ├── index.jsx            # Harvest buyback proposals
│   │   │   │   └── [id].jsx
│   │   │   ├── farmers/
│   │   │   │   ├── index.jsx            # Supplied farmers list
│   │   │   │   └── [id]/history.jsx     # View farmer cultivation history
│   │   │   └── profile/
│   │   │       └── index.jsx
│   │   │
│   │   └── (admin)/                     # Mobile Admin Portal
│   │       └── index.jsx                # Quick links & redirect to web console
│   │
│   └── src/
│       ├── components/                  # Reusable UI Components (JSX)
│       │   ├── common/
│       │   │   ├── AppButton.jsx        # Primary, secondary, and ghost buttons
│       │   │   ├── AppInput.jsx         # Labelled text input with validation error states
│       │   │   ├── AppCard.jsx          # Rounded container card
│       │   │   ├── AppBadge.jsx         # Status pill badge
│       │   │   ├── AppModal.jsx         # Bottom-sheet modal
│       │   │   ├── LoadingSpinner.jsx
│       │   │   ├── EmptyState.jsx
│       │   │   ├── RoleIcon.jsx         # Farmer, Buyer, Supplier, Admin icons
│       │   │   └── Avatar.jsx
│       │   ├── auth/
│       │   │   ├── RoleSelector.jsx     # 4-role icon selector (Figma Screen 1)
│       │   │   └── GoogleSignInButton.jsx
│       │   ├── harvest/
│       │   │   ├── HarvestCard.jsx      # Card in "My Harvests" list
│       │   │   ├── HarvestStats.jsx     # Records / Photos / Days Grown row
│       │   │   ├── GrowthStageTimeline.jsx # Stage dots + accordion feed (Figma Screen 2)
│       │   │   ├── StageProgressBar.jsx # Horizontal stage progress indicators
│       │   │   ├── StageItem.jsx        # Accordion row for a specific stage
│       │   │   └── CultivationRecordRow.jsx # TR-XXXX item + ⏳ pending sync badge
│       │   ├── cultivation/
│       │   │   ├── RecordDetailCard.jsx # Stage / Activity / Date / GPS metadata grid
│       │   │   ├── InputsUsedChips.jsx  # "NPK Fertilizer — 2 kg" chips
│       │   │   ├── PhotoEvidence.jsx    # LIVE CAPTURE badge + full-width crop photo
│       │   │   ├── IntegrityBadge.jsx   # Shield icon + verified SHA-256 hash snippet
│       │   │   ├── PendingSyncBadge.jsx # ⏳ Pending Sync badge for offline items
│       │   │   └── CameraCapture.jsx    # Custom camera view (gallery blocked)
│       │   ├── marketplace/
│       │   │   ├── FarmerCard.jsx       # Farmer card in buyer explore screen
│       │   │   ├── HarvestListingCard.jsx # Listing card with price & available qty
│       │   │   ├── CatalogueItemCard.jsx# Supplier input item card
│       │   │   └── FilterBar.jsx        # Greenhouse vs. Open-field toggle pills
│       │   ├── contract/
│       │   │   ├── ContractCard.jsx
│       │   │   ├── ContractStatusBadge.jsx
│       │   │   └── ContractProgressTracker.jsx # Stage-linked contract milestone tracker
│       │   ├── map/
│       │   │   └── FarmLocationMap.jsx  # OpenStreetMap view via react-native-maps
│       │   └── messaging/
│       │       ├── MessageBubble.jsx
│       │       └── NoteComposer.jsx     # Direct buyer note composer
│       │
│       ├── hooks/                       # Custom React Hooks (JavaScript)
│       │   ├── useAuth.js               # Supabase session, user, and role hook
│       │   ├── useHarvests.js           # Harvest CRUD operations
│       │   ├── useCultivationRecords.js # History fetching & record creation
│       │   ├── useContracts.js          # Contract state machine hooks
│       │   ├── useMessages.js           # Realtime chat subscription hook
│       │   ├── useLocation.js           # expo-location wrapper
│       │   ├── useCamera.js             # expo-camera wrapper
│       │   ├── useReverseGeocode.js     # Nominatim OSM reverse geocoding
│       │   ├── useImageUpload.js        # Supabase Storage multipart uploader
│       │   └── useOfflineQueue.js       # MMKV queue manager & NetInfo sync trigger
│       │
│       ├── lib/                         # Core Libraries & Singletons (JavaScript)
│       │   ├── supabase.js              # Supabase Client with SecureStore adapter
│       │   ├── integrity.js             # SHA-256 hashing utility via expo-crypto
│       │   ├── queryClient.js           # TanStack Query client configuration
│       │   ├── mmkv.js                  # MMKV local storage singleton
│       │   └── theme.js                 # Design tokens (Figma colors, typography, spacing)
│       │
│       ├── services/                    # Business Service Layer (JavaScript)
│       │   ├── auth.service.js          # signIn, signUp, signOut, Google OAuth
│       │   ├── profiles.service.js      # getProfile, updateProfile, admin verify
│       │   ├── harvests.service.js      # createHarvest, updateStage, listPublic
│       │   ├── cultivationRecords.service.js # createCultivationRecord (Append-Only)
│       │   ├── catalogue.service.js     # Supplier catalog operations
│       │   ├── orders.service.js        # Supplier orders & Buyer orders
│       │   ├── contracts.service.js     # Contract creation, matching, completion
│       │   ├── messages.service.js      # Direct messaging & inquiries
│       │   ├── storage.service.js       # Upload cultivation photo & signed URLs
│       │   └── notifications.service.js # Expo push token registration
│       │
│       ├── store/                       # Zustand Global State Slices (JavaScript)
│       │   ├── authStore.js             # { user, session, role, setSession }
│       │   ├── offlineQueueStore.js     # { queue, enqueue, dequeue, pendingCount }
│       │   └── uiStore.js               # { toast, loading, modals }
│       │
│       └── utils/                       # Shared Utility Functions
│           ├── dateFormat.js            # formatDate("17 Sep 2026"), formatTime("09:20 AM")
│           ├── traceId.js               # formatTraceId(n) → "TR-0047"
│           ├── stageHelpers.js          # stageIndex, stageColor, stageIcon
│           └── validators.js            # Zod validation schemas for forms
│
└── admin-dashboard/                     # Web Admin Portal (React + Vite JavaScript)
    ├── index.html
    ├── vite.config.js                   # Vite configuration (JavaScript)
    ├── package.json                     # Vite + React dependencies
    ├── vercel.json                      # Single Page Application rewrites for Vercel
    └── src/
        ├── App.jsx                      # Main admin application router
        ├── main.jsx                     # Vite DOM mount point
        ├── lib/
        │   └── supabase.js              # Supabase Client with service_role key
        ├── pages/
        │   ├── Dashboard.jsx            # Platform KPI metrics
        │   ├── Users.jsx                # KYC verification & farmer deed approval
        │   ├── Farmers.jsx              # Farmer directory & cultivation auditor
        │   ├── Contracts.jsx            # Dispute oversight & contract monitor
        │   └── Reports.jsx              # CSV exportable audit logs
        └── components/
            ├── DataTable.jsx
            ├── UserRow.jsx
            └── VerifyButton.jsx
```

---

## 8. Key Implementation Reference (JavaScript / JSX)

### 8.1 Supabase Client with SecureStore Adapter

```javascript
// frontend/mobile/src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Required for React Native
  },
});
```

### 8.2 Cultivation Record Service (Append-Only + SHA-256)

```javascript
// frontend/mobile/src/services/cultivationRecords.service.js
import { supabase } from '../lib/supabase.js';
import { generateIntegrityHash } from '../lib/integrity.js';
import { uploadCultivationPhoto } from './storage.service.js';

/**
 * Creates an immutable cultivation record.
 * Executes INSERT ONLY. No UPDATE or DELETE is ever called.
 */
export async function createCultivationRecord(payload) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. Upload live-captured photo to Supabase Storage
  const photoUrl = await uploadCultivationPhoto(payload.photoUri, user.id, payload.harvestId);

  // 2. Compute SHA-256 tamper-detection hash
  const integrityHash = await generateIntegrityHash({
    harvestId: payload.harvestId,
    farmerId: user.id,
    stage: payload.stage,
    activityType: payload.activityType,
    photoUrl,
    latitude: payload.latitude,
    longitude: payload.longitude,
    recordedAt: new Date().toISOString(),
  });

  // 3. Insert record into PostgreSQL
  const { data, error } = await supabase
    .from('cultivation_records')
    .insert({
      harvest_id: payload.harvestId,
      farmer_id: user.id,
      stage: payload.stage,
      activity_type: payload.activityType,
      notes: payload.notes || null,
      inputs_used: payload.inputsUsed || [],
      conditions: payload.conditions || {},
      photo_url: photoUrl,
      photo_taken_at: new Date().toISOString(),
      is_live_capture: true,
      latitude: payload.latitude,
      longitude: payload.longitude,
      location_name: payload.locationName,
      sync_status: payload.syncStatus || 'synced',
      is_correction: payload.isCorrection || false,
      corrects_id: payload.correctsId || null,
      integrity_hash: integrityHash,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Retrieves the verifiable cultivation history for a harvest.
 * Read-only view for buyers, suppliers, and auditors.
 */
export async function getCultivationHistory(harvestId) {
  const { data, error } = await supabase
    .from('cultivation_records')
    .select('*')
    .eq('harvest_id', harvestId)
    .order('recorded_at', { ascending: true });

  if (error) throw error;
  return data;
}
```

### 8.3 SHA-256 Tamper-Detection Hash Utility

```javascript
// frontend/mobile/src/lib/integrity.js
import * as Crypto from 'expo-crypto';

/**
 * Generates a deterministic SHA-256 hash digest from record properties.
 * Sorts object keys alphabetically before stringifying to guarantee repeatability.
 */
export async function generateIntegrityHash(input) {
  const sortedPayload = JSON.stringify(input, Object.keys(input).sort());
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    sortedPayload
  );
}
```

### 8.4 Live Camera Capture (Gallery Blocked)

```jsx
// frontend/mobile/src/components/cultivation/CameraCapture.jsx
import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Button } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';

export function CameraCapture({ onCapture }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const takePicture = async () => {
    if (!cameraRef.current) return;

    // Direct hardware capture — no ImagePicker gallery import exists
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });

    // Capture device hardware GPS coordinates
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const [address] = await Location.reverseGeocodeAsync({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });

    onCapture(photo.uri, {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      name: address ? `${address.city || address.subregion || ''}, ${address.region || ''}` : 'Farm Plot',
    });
  };

  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access required for live evidence capture</Text>
        <Button onPress={requestPermission} title="Grant Camera Permission" color="#2D6A4F" />
      </View>
    );
  }

  return (
    <CameraView ref={cameraRef} style={styles.camera} facing="back">
      {/* Visual Live Capture Indicator (Figma Screen 3) */}
      <View style={styles.liveBadge}>
        <View style={styles.greenDot} />
        <Text style={styles.liveText}>LIVE CAPTURE ONLY</Text>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity onPress={takePicture} style={styles.captureButton} activeOpacity={0.7}>
          <View style={styles.captureInner} />
        </TouchableOpacity>
      </View>
    </CameraView>
  );
}

const styles = StyleSheet.create({
  camera: { flex: 1 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permissionText: { fontSize: 16, marginBottom: 16, textAlign: 'center', color: '#1B1B1B' },
  liveBadge: {
    position: 'absolute',
    top: 48,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },
  greenDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#52B788' },
  liveText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
});
```

### 8.5 OpenStreetMap via react-native-maps

```jsx
// frontend/mobile/src/components/map/FarmLocationMap.jsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';

export function FarmLocationMap({ latitude, longitude, locationName }) {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
        mapType="none" // Disable proprietary Google/Apple base maps
      >
        {/* OpenStreetMap Raster Tiles — 100% Free, No Billing Key */}
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        <Marker coordinate={{ latitude, longitude }} title={locationName} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 220, borderRadius: 16, overflow: 'hidden' },
  map: { ...StyleSheet.absoluteFillObject },
});
```

### 8.6 OpenStreetMap Reverse Geocoding (Nominatim)

```javascript
// frontend/mobile/src/hooks/useReverseGeocode.js

/**
 * Converts latitude and longitude to a human-readable location name
 * using OpenStreetMap's free Nominatim reverse geocoding API.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'User-Agent': 'TraceRoot-Agriculture-App/1.0 (contact@traceroot.ac.lk)',
        },
      }
    );
    const data = await res.json();
    const address = data.address || {};
    const district = address.city || address.town || address.village || address.county || '';
    const state = address.state || address.country || '';
    return `${district}, ${state}`.trim().replace(/^,\s*/, '');
  } catch (error) {
    console.warn('Nominatim reverse geocode fallback:', error);
    return 'Farm Location';
  }
}
```

### 8.7 Offline Queue Hook with ⏳ Pending Sync Badge

```javascript
// frontend/mobile/src/hooks/useOfflineQueue.js
import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { mmkvStorage } from '../lib/mmkv.js';
import { createCultivationRecord } from '../services/cultivationRecords.service.js';

const QUEUE_KEY = 'traceroot_offline_queue';

function readQueue() {
  const raw = mmkvStorage.getString(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function writeQueue(queue) {
  mmkvStorage.set(QUEUE_KEY, JSON.stringify(queue));
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState(readQueue);

  // Enqueue a record when farmer is offline
  const enqueue = (payload) => {
    const item = {
      id: Math.random().toString(36).substring(2, 9),
      payload: { ...payload, syncStatus: 'pending' },
      queuedAt: new Date().toISOString(),
    };
    const updated = [...queue, item];
    writeQueue(updated);
    setQueue(updated);
  };

  // Replay and synchronize all queued items
  const syncAll = async () => {
    const net = await NetInfo.fetch();
    if (!net.isConnected || queue.length === 0) return;

    const remaining = [];
    for (const item of queue) {
      try {
        await createCultivationRecord({ ...item.payload, syncStatus: 'synced' });
      } catch (err) {
        console.error('Failed to sync queued record, keeping in queue:', err);
        remaining.push(item);
      }
    }
    writeQueue(remaining);
    setQueue(remaining);
  };

  // Auto-sync whenever network connectivity is restored
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        syncAll();
      }
    });
    return unsubscribe;
  }, [queue]);

  return {
    queue,
    enqueue,
    syncAll,
    pendingCount: queue.length,
  };
}
```

### 8.8 Pending Sync Badge Component

```jsx
// frontend/mobile/src/components/cultivation/PendingSyncBadge.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function PendingSyncBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.icon}>⏳</Text>
      <Text style={styles.label}>Pending Sync</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFEBAA',
  },
  icon: { fontSize: 11 },
  label: {
    fontSize: 11,
    color: '#856404',
    fontWeight: '600',
  },
});
```

### 8.9 Role-Based Dynamic Navigation

```jsx
// frontend/mobile/app/_layout.jsx
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth.js';

const ROLE_ROUTES = {
  farmer: '/(farmer)',
  buyer: '/(buyer)',
  supplier: '/(supplier)',
  admin: '/(admin)',
};

export default function RootLayout() {
  const { session, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F5F0' }}>
        <ActivityIndicator size="large" color="#2D6A4F" />
      </View>
    );
  }

  // Not signed in -> send to authentication stack
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // Signed in -> navigate to role-specific dashboard
  const destination = ROLE_ROUTES[role] || '/(auth)/login';
  return <Redirect href={destination} />;
}
```

### 8.10 Google OAuth Integration

```javascript
// frontend/mobile/src/services/auth.service.js
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../lib/supabase.js';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle() {
  const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'traceroot' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) throw error || new Error('OAuth URL not returned');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

  if (result.type === 'success' && result.url) {
    const { params } = AuthSession.parseRedirectResult(result.url);
    if (params.access_token && params.refresh_token) {
      await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
    }
  }
}
```

### 8.11 Growth Stage Timeline Visualizer

```jsx
// frontend/mobile/src/components/harvest/GrowthStageTimeline.jsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { StageProgressBar } from './StageProgressBar.jsx';
import { StageItem } from './StageItem.jsx';

const STAGES = [
  { key: 'seedling', label: 'Seedling', icon: '🌱', color: '#74C69D' },
  { key: 'vegetative_growth', label: 'Vegetative Growth', icon: '🌿', color: '#74C69D' },
  { key: 'flowering', label: 'Flowering', icon: '🌸', color: '#E76F51' },
  { key: 'fruiting', label: 'Fruiting', icon: '🍅', color: '#74C69D' },
  { key: 'harvested', label: 'Harvested', icon: '📦', color: '#74C69D' },
];

export function GrowthStageTimeline({ harvest, records = [], pendingQueue = [] }) {
  const [expandedStage, setExpandedStage] = useState(harvest.current_stage);

  // Group synced records by stage
  const recordsByStage = STAGES.reduce((acc, stage) => {
    acc[stage.key] = records.filter((r) => r.stage === stage.key);
    return acc;
  }, {});

  // Group offline pending records by stage
  const pendingByStage = pendingQueue.reduce((acc, item) => {
    const st = item.payload.stage;
    acc[st] = [...(acc[st] || []), { ...item, sync_status: 'pending' }];
    return acc;
  }, {});

  const stageKeys = STAGES.map((s) => s.key);

  return (
    <ScrollView style={styles.container}>
      {/* Horizontal Stage Progress Dots */}
      <StageProgressBar currentStage={harvest.current_stage} stages={STAGES} />

      {/* Accordion List for Each Stage */}
      {STAGES.map((stage) => {
        const synced = recordsByStage[stage.key] || [];
        const pending = pendingByStage[stage.key] || [];
        const combined = [...synced, ...pending];
        const isCompleted = stageKeys.indexOf(stage.key) < stageKeys.indexOf(harvest.current_stage);
        const isCurrent = stage.key === harvest.current_stage;

        return (
          <StageItem
            key={stage.key}
            stage={stage}
            records={combined}
            pendingCount={pending.length}
            isCompleted={isCompleted}
            isCurrent={isCurrent}
            isExpanded={expandedStage === stage.key}
            onToggle={() =>
              setExpandedStage((prev) => (prev === stage.key ? null : stage.key))
            }
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F5F0', paddingHorizontal: 16 },
});
```

---

## 9. Figma Design System Tokens

The mobile app and web console implement the Figma green and warm cream palette:

```javascript
// frontend/mobile/src/lib/theme.js

export const colors = {
  primary: '#2D6A4F',       // Deep Forest Green (Primary CTA, headers)
  primaryLight: '#74C69D',  // Light Mint Green (Completed icons, pills)
  primarySoft: '#D8F3DC',   // Pale Mint (Background accents)
  accent: '#E76F51',        // Warm Terracotta Orange (Current stage, NOW badge)
  background: '#F8F5F0',    // Warm Cream (Main screen canvas)
  surface: '#FFFFFF',       // Clean White (Cards, bottom sheets, modals)
  border: '#E8E0D5',        // Subtle Divider Cream
  text: {
    primary: '#1B1B1B',     // Rich Charcoal Black
    secondary: '#6B6B6B',   // Neutral Grey
    muted: '#AAAAAA',       // Soft Hint Grey
    inverse: '#FFFFFF',     // Clean White
  },
  status: {
    verified: '#2D6A4F',    // Forest Green
    pending: '#856404',     // Amber
    pendingBg: '#FFF3CD',   // Pale Amber for ⏳ Pending Sync
    danger: '#E63946',      // Crimson Red
    info: '#4361EE',        // Royal Blue
  },
};

export const typography = {
  heading1: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  heading2: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  subheading: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  label: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};
```

---

## 10. End-to-End Data Flow Diagrams

### 10.1 Cultivation Record Submission (Online Flow)

```mermaid
sequenceDiagram
    autonumber
    participant Farmer as 👨‍🌾 Farmer (App)
    participant Camera as 📷 Hardware Camera
    participant GPS as 📍 Hardware GPS
    participant Service as ⚙️ cultivationRecords.service.js
    participant Storage as ☁️ Supabase Storage
    participant DB as 🗄️ Supabase PostgreSQL

    Farmer->>Camera: Trigger Live Shutter (Gallery Disabled)
    Camera-->>Farmer: photoUri (Local File)
    Farmer->>GPS: Request Current Coordinates
    GPS-->>Farmer: { latitude, longitude }
    Farmer->>Service: createCultivationRecord(payload)
    Service->>Storage: uploadCultivationPhoto(photoUri)
    Storage-->>Service: photoUrl (Permanent Storage URL)
    Service->>Service: generateIntegrityHash(fields)
    Service->>DB: INSERT INTO cultivation_records
    Note over DB: Immutability Trigger ensures INSERT-ONLY
    DB-->>Service: Created record (with TR-0042)
    Service-->>Farmer: Record Persisted & Verified ✅
```

### 10.2 Cultivation Record Submission (Offline Edge Sync Flow)

```mermaid
sequenceDiagram
    autonumber
    participant Farmer as 👨‍🌾 Farmer (App)
    participant Queue as 💾 MMKV Local Outbox
    participant NetInfo as 📡 NetInfo Listener
    participant Service as ⚙️ cultivationRecords.service.js
    participant DB as 🗄️ Supabase PostgreSQL

    Farmer->>Queue: enqueue(payload) [sync_status = 'pending']
    Note over Farmer: ⏳ Pending Sync badge displayed on record
    NetInfo->>NetInfo: Device reconnects to Internet
    NetInfo->>Service: Trigger syncAll()
    Service->>DB: INSERT INTO cultivation_records [sync_status = 'synced']
    DB-->>Service: Success Response
    Service->>Queue: Dequeue item
    Note over Farmer: ⏳ Badge removed; record verified ✅
```

---

## 11. Security, Privacy & Zero-Trust Governance

| Mechanism | Technical Implementation | Security Value |
|---|---|---|
| **Append-Only Immutability** | Database PL/pgSQL trigger + omission of `UPDATE`/`DELETE` RLS policies | Eradicates retrospective alteration of chemical, fertilizer, or harvest logs. |
| **Deterministic SHA-256 Digest** | `expo-crypto` hash computed across sorted JSON attributes | Detects tampering with photo URLs, timestamps, or geolocation values. |
| **Live-Only Photo Capture** | `CameraCapture.jsx` binds directly to `expo-camera`; gallery picker omitted | Prevents farmers from reusing historical, downloaded, or stock crop photos. |
| **GPS Boundary Validation** | Native coordinates captured at shutter click; reverse geocoded with OSM | Proves cultivation activities occurred within the farmer's registered parcel. |
| **Role-Based Row Security** | Supabase RLS policies evaluating `auth.uid()` and profile role | Restricts buyers from reading private farm deeds and protects contract terms. |
| **Tamper-Evident Corrections** | `is_correction = true` linked to `corrects_id` | Audit trails remain intact; mistakes are corrected via transparent adjustments. |
| **Admin Key Isolation** | Supabase `service_role` key restricted exclusively to Vercel Admin Dashboard | Zero exposure of administrative bypass credentials within the mobile bundle. |
| **Encrypted Token Storage** | `expo-secure-store` iOS Keychain / Android KeyStore wrapper | Prevents session hijacking and credential extraction on rooted devices. |

---

## 12. Development Phases, Sprint Plan & Team Ownership

### 12.1 Sprint Roadmap

```mermaid
flowchart LR
    P1["Sprint 1-2\n🔧 Core Setup\n& Schema"] -->
    P2["Sprint 3-4\n🔐 Auth & Role\nNavigation"] -->
    P3["Sprint 5-6\n🌱 Farmer Module\n& Live Camera"] -->
    P4["Sprint 7-8\n🏪 Buyer Market\n& Contracts"] -->
    P5["Sprint 9\n📦 Supplier & Offline\nSync (⏳ Badge)"] -->
    P6["Sprint 10\n🧪 Testing, Audits\n& Final Demo"]
```

### 12.2 Sprint Deliverables Schedule

| Sprint | Deliverables & Milestones | Lead / Focus |
|---|---|---|
| **Sprint 1** | Supabase cloud setup, PostgreSQL schema DDL, append-only triggers, and RLS policies. | Full Team |
| **Sprint 2** | Mobile project initialization, NativeWind styling, theme tokens, and `jsconfig.json`. | Full Team |
| **Sprint 3** | Authentication flow: Login, 4-role selector, Google OAuth via Supabase, and role redirection. | `22CSE0397` |
| **Sprint 4** | Farmer dashboard, crop cycle creation, and Growth Stage Timeline accordion UI (Figma Screen 2). | `22CSE0377` |
| **Sprint 5** | Live hardware camera capture, GPS auto-tagging, and Supabase Storage upload (Figma Screen 3). | `22CSE0377` |
| **Sprint 6** | Buyer marketplace: Category browsing, greenhouse/open-field filters, and provenance inspection. | `22CSE0365` |
| **Sprint 7** | Supplier module: Input catalog management, ordering flow, and harvest buyback proposals. | `22CSE0365` |
| **Sprint 8** | Contract farming module: Contract initiation, matching, harvest linking, and milestone tracker. | `22CSE0384` |
| **Sprint 9** | MMKV offline outbox, ⏳ Pending Sync badge, NetInfo auto-sync, and Web Admin dashboard on Vercel. | `22CSE0397` & `22CSE0384` |
| **Sprint 10** | End-to-end integration testing, tamper verification audit, documentation polish, and project demonstration. | Full Team |

### 12.3 Team Module Ownership

| Member Name | Student Reg. No. | Assigned Module | Owned Directories & Source Files |
|---|---|---|---|
| **K.G.T.R. Karunajeewa** | `22CSE0377` | **Farmer & Cultivation History** | `app/(farmer)/harvests/`<br/>`src/components/harvest/`<br/>`src/components/cultivation/`<br/>`src/services/cultivationRecords.service.js`<br/>`src/hooks/useCamera.js`<br/>`src/hooks/useOfflineQueue.js` |
| **A.M.H.B. Adasooriya** | `22CSE0365` | **Buyer & Supplier Module** | `app/(buyer)/explore/`<br/>`app/(supplier)/`<br/>`src/components/marketplace/`<br/>`src/services/orders.service.js`<br/>`src/services/catalogue.service.js`<br/>`src/hooks/useMessages.js` |
| **W.M.V. Chamith** | `22CSE0384` | **Contract Farming & Farmer Module** | `app/(buyer)/contracts/`<br/>`app/(farmer)/contracts/`<br/>`src/components/contract/`<br/>`src/services/contracts.service.js`<br/>`src/validators/contract.validator.js` |
| **M A.F. Nuha** | `22CSE0397` | **Admin Console & Authentication** | `admin-dashboard/`<br/>`app/(auth)/`<br/>`src/services/auth.service.js`<br/>`src/services/notifications.service.js`<br/>`src/components/auth/` |

---

## 13. Environment Configuration & Getting Started

### 13.1 Environment Variables Reference

#### Mobile App (`frontend/mobile/.env`)
```bash
# Public credentials safe for the mobile client bundle
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

#### Backend API (`backend/.env`)
```bash
PORT=5000
NODE_ENV=development

# Supabase Dual-Connection URLs
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
JWT_SECRET="your-256-bit-jwt-secret"
```

#### Admin Dashboard (`admin-dashboard/.env` or Vercel Environment Settings)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

> [!CAUTION]
> The **SUPABASE_SERVICE_ROLE_KEY** bypasses all PostgreSQL Row Level Security. Never commit it to git and never include it in the mobile client bundle.

---

### 13.2 Running the Project Locally

#### 1. Backend REST API
```bash
cd backend
npm install
npx prisma generate
npm run dev
```

#### 2. Mobile App (Expo SDK 51)
```bash
cd frontend/mobile
npm install
npx expo start
```
- Press `a` for Android Emulator.
- Press `i` for iOS Simulator.
- Scan QR code with the Expo Go app on a physical Android/iOS phone for live camera testing.

#### 3. Web Admin Dashboard (Vercel / Vite)
```bash
cd admin-dashboard
npm install
npm run dev
```

---
*Department of Software Engineering, Sabaragamuwa University of Sri Lanka*  
*Module: SE5104 — Mini Project (2022/2023 Batch)*  
*TraceRoot Group 06: Farm-to-Buyer Agricultural Contact and Transparency System*
