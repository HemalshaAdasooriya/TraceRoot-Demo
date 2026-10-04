# TraceRoot
> Farm-to-Buyer Agricultural Contact and Transparency System

TraceRoot is a mobile-first digital agriculture platform connecting Farmers, Agricultural Suppliers, and Institutional Buyers (Supermarkets, Retailers, and Restaurants) with verifiable cultivation history, contract farming, and direct trade.

## 🛠 Core Technology Stack
- **Database & Hosting**: Supabase (Managed PostgreSQL 16, Supavisor Connection Pooling, PostGIS)
- **Backend API**: Node.js / Express.js (TypeScript), Prisma ORM (Dual-URL Pooling), Argon2id, JWT
- **Media & Evidence**: Supabase Storage / S3 (Live-captured crop photos with SHA-256 verification)
- **Mobile Client**: React Native (Expo bare workflow) with live camera-only capture and offline outbox
- **Admin Dashboard**: Next.js 14+ (App Router), React, Tailwind CSS

## 📚 Technical Documentation & Architecture
- 📐 [System Architecture (SYSTEM_ARCHITECTURE.md)](./SYSTEM_ARCHITECTURE.md) - High-level & sequence Mermaid diagrams, component breakdown, technology justifications, Supabase cloud pooling, and append-only database triggers.
- 📁 [File Structure Report (FILE_STRUCTURE_REPORT.md)](./FILE_STRUCTURE_REPORT.md) - Detailed directory trees, folder responsibilities, design patterns, Supabase database integration mapping, and team module ownership mappings.

---
*Department of Software Engineering, Sabaragamuwa University of Sri Lanka*  
*Module: SE5104 - Mini Project (2022/2023)*
