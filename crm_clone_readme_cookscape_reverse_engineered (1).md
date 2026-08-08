# 🚀 CRM Clone (Cookscape Reverse Engineered) — Production README

## 📌 Overview
A production-ready, scalable CRM system inspired by Cookscape. This repository provides a modern **MERN/PERN architecture**, complete API contracts, database schemas, auth/roles, and deployment instructions.

---

# 🧠 Architecture

```
Client (React + Vite/Next)
  ├─ UI (Tailwind/Bootstrap)
  ├─ State (Redux/Zustand/React Query)
  └─ Routing (React Router)
        ↓ 
API Gateway (Node.js + Express)
  ├─ Auth (JWT + RBAC)
  ├─ Services (Leads, Tasks, Reports, Masters)
  ├─ Validation (Zod/Joi)
  └─ Logging (Winston/Morgan)
        ↓
Database (MongoDB/PostgreSQL)
  ├─ Primary DB
  └─ Cache (Redis - optional)
```

---

# 📂 Monorepo Structure

```
root/
  apps/
    web/                 # React app
    api/                 # Node/Express API
  packages/
    ui/                  # shared UI components
    config/              # eslint, tsconfig
  infra/
    docker/
    k8s/                 # optional
  scripts/
  .env.example
  docker-compose.yml
```

---

# 🔐 Authentication & RBAC

## Roles
- ADMIN
- EMPLOYEE
- DESIGNER

## Auth Flow
- Login → returns JWT (access + refresh)
- Protected routes via middleware
- Role-based guards per endpoint

```ts
// middleware/auth.ts
export const requireRole = (roles: string[]) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  next();
};
```

---

# 🔌 API (Production Contracts)

## Base
```
/api/v1
```

## Leads

### Create Lead
POST /api/v1/leads

Request (multipart/form-data or JSON):
```
{
  "salutation_id": 1,
  "lead_name": "John",
  "lead_email": "john@mail.com",
  "country_id": 105,
  "country_code": "+91",
  "lead_phoneNo": "9999999999",
  "project_id": 12,
  "date_collected": "2026-04-07",
  "contactable_date": "2026-04-07 14:50",
  "lead_comments": "notes",
  "lead_rating": 1,
  "brand_id": 1,
  "lead_type": 3,
  "lead_source": 2,
  "vendor_source": null,
  "given_by": null,
  "instruction": null,
  "assigned_to": null,
  "tag_ids": []
}
```

Response:
```
{
  "status": true,
  "data": { "id": "uuid" }
}
```

### List Leads (server-side pagination)
POST /api/v1/leads/list

Request:
```
{ "page": 1, "limit": 10, "search": "", "sort": {"field":"created_at","order":"desc"} }
```

Response:
```
{ "data": [...], "total": 120, "page": 1, "limit": 10 }
```

### Get Lead
GET /api/v1/leads/:id

### Update Lead
PUT /api/v1/leads/:id

### Assign Lead
PUT /api/v1/leads/:id/assign

Request:
```
{ "user_id": "uuid" }
```

---

## Tasks
- POST /api/v1/tasks
- GET /api/v1/tasks
- PUT /api/v1/tasks/:id
- GET /api/v1/tasks?status=closed

---

## Masters (Settings)
- GET /api/v1/masters/stages
- GET /api/v1/masters/sources
- GET /api/v1/masters/projects
- GET /api/v1/masters/brands
- GET /api/v1/masters/tags

---

## Reports
- GET /api/v1/reports/leads
- GET /api/v1/reports/activity
- GET /api/v1/reports/attendance

---

# 🗄️ Database Schema

## Leads (Mongo)
```
{
  _id,
  lead_name,
  lead_email,
  lead_phone,
  country_id,
  country_code,
  salutation_id,
  project_id,
  block,
  door_no,
  date_collected,
  contactable_date,
  comments,
  rating,
  brand_id,
  lead_type,
  lead_source,
  vendor_source,
  given_by,
  instruction,
  assigned_to,
  tags: [],
  status,
  created_at,
  updated_at
}
```

## SQL (PostgreSQL)
```
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  lead_name TEXT,
  lead_email TEXT,
  lead_phone TEXT,
  country_id INT,
  country_code TEXT,
  salutation_id INT,
  project_id INT,
  block TEXT,
  door_no TEXT,
  date_collected DATE,
  contactable_date TIMESTAMP,
  comments TEXT,
  rating INT,
  brand_id INT,
  lead_type INT,
  lead_source INT,
  vendor_source INT,
  given_by INT,
  instruction TEXT,
  assigned_to UUID,
  status INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

# 🔄 Workflow

```
New → Assigned → Contacted → Qualified → Design → Closed
```

---

# 🎨 Frontend (React)

## Pages
- /dashboard
- /leads
- /lead/:id
- /tasks
- /reports

## Services
```
/services/api.ts
/services/leads.ts
/services/tasks.ts
```

---

# ⚙️ Environment Setup

## .env.example
```
PORT=5000
DB_URI=mongodb://localhost:27017/crm
JWT_SECRET=secret
REDIS_URL=redis://localhost:6379
```

---

# 🐳 Docker Setup

## docker-compose.yml
```
version: '3'
services:
  api:
    build: ./apps/api
    ports: ["5000:5000"]
  db:
    image: mongo
    ports: ["27017:27017"]
```

---

# 🚀 Deployment

## Option 1: VPS
- Node API (PM2)
- Nginx reverse proxy
- MongoDB Atlas

## Option 2: Cloud
- Frontend → Vercel
- Backend → Railway/Render
- DB → Atlas/Postgres

---

# 📊 Observability
- Logs: Winston
- Metrics: Prometheus (optional)
- Error Tracking: Sentry

---

# 🧪 Testing
- Unit: Jest
- API: Supertest
- E2E: Playwright/Cypress

---

# 📌 Notes
- Original system: PHP + jQuery (monolith)
- This: scalable microservice-ready architecture

---

# 💥 Next Steps
- Implement APIs
- Build UI components
- Add auth
- Deploy

---

# 👨‍💻 Author
Production-grade CRM blueprint 🚀

