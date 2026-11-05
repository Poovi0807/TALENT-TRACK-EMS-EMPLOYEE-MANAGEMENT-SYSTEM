# 🏢 TalentTrack EMS — Employee Management System

A full-stack MERN (MongoDB, Express, React, Node.js) Employee Management System, security-tested and hardened.
See **[SECURITY_REPORT.md](SECURITY_REPORT.md)** for the penetration test findings and fixes.

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Node.js v20 or newer (https://nodejs.org)
- MongoDB Community Server 7 (https://www.mongodb.com/try/download/community)
- VS Code

---

## Step 1 — Start MongoDB

**Windows:** Open Services → Start "MongoDB" — OR run in terminal:
```
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
```

**Mac:**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

---

## Step 2 — Configure the backend

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and set `JWT_SECRET` to a long random value. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The server will not start without a secret of at least 32 characters. **Never commit `.env`.**

---

## Step 3 — Install & Run Backend

```bash
cd backend
npm install
npm run seed        # Creates demo data (run once) and prints the demo password
npm run dev         # Starts on http://localhost:5000
```

---

## Step 4 — Install & Run Frontend

Open a **second** terminal:

```bash
cd frontend
npm install
npm start           # Opens http://localhost:3000
```

---

## 🔑 Demo Accounts (local only)

`npm run seed` creates three local demo accounts:

| Role     | Email                     |
|----------|---------------------------|
| Admin    | admin@talenttrack.com     |
| Manager  | manager@talenttrack.com   |
| Employee | employee@talenttrack.com  |

The password is `SEED_PASSWORD` from your `.env`, or a random password the seed script prints once.
No password is published in this repository.

New users who sign up on the Register page are always **employees**. An admin promotes users and links
them to an employee record with the admin API below.

---

## 🐳 Docker (Optional)

```bash
cp .env.example .env      # in the project root; fill in JWT_SECRET and the database password
docker compose up --build
```

This starts a password-protected MongoDB (not exposed outside Docker) and the backend on `http://localhost:5000`.
Create the demo data once with:

```bash
docker compose run --rm -e NODE_ENV=development backend node backend/scripts/seed.js
```

Then run the frontend separately with `npm start`.

---

## 📁 Project Structure

```
├── backend/
│   ├── config/         → DB config
│   ├── controllers/    → Business logic (auth, employees, attendance, leaves, dashboard)
│   ├── middleware/     → JWT auth & role authorization
│   ├── models/         → Mongoose schemas (User, Employee, Attendance, Leave, AuditLog)
│   ├── routes/         → Express route definitions
│   ├── scripts/        → Seed script
│   ├── utils/          → Token generator, input security helpers, audit logging
│   ├── .env.example    → Environment variable template
│   └── server.js       → App entry point (security headers, rate limiting, input sanitising)
│
├── frontend/
│   └── src/
│       ├── components/ → Navbar, PrivateRoute, StatCard
│       ├── context/    → AuthContext (global auth state)
│       ├── pages/      → auth, dashboard, employees, attendance, leaves
│       ├── services/   → api.js (all Axios API calls)
│       └── App.js      → Router & layout
│
├── docker-compose.yml  → MongoDB (with authentication) + backend
├── .env.example        → Template for Docker secrets
└── SECURITY_REPORT.md  → Penetration test report
```

---

## 🔐 Roles and Permissions

| Action | Employee | Manager | Admin |
|---|---|---|---|
| See colleague directory (name, department, position) | ✅ | ✅ | ✅ |
| See salary, date of birth, address | Own record only | ✅ | ✅ |
| Check in / out | Self only | Anyone | Anyone |
| Apply for leave | Self only | Anyone | Anyone |
| See leave requests | Own only | All | All |
| Approve / reject leave | ❌ | ✅ (not own) | ✅ (not own) |
| Add / edit employees | ❌ | ✅ (not own record, no salary) | ✅ |
| Change salary or leave balance | ❌ | ❌ | ✅ |
| Delete employees | ❌ | ❌ | ✅ |
| Manage user roles, read audit log | ❌ | ❌ | ✅ |

### Admin API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/auth/users` | List user accounts |
| PUT | `/api/auth/users/:id` | Change `role`, link `employeeId`, or set `isActive` |
| GET | `/api/audit-logs?action=&limit=` | Read the audit log |

---

## ✅ Features

- **Employee Management** — CRUD with search & filters
- **Attendance Tracking** — Check-in/out, working hours, monthly view
- **Leave Management** — Apply, approve, reject, cancel leaves with balance checks
- **Role-Based Access** — Admin / Manager / Employee permissions, enforced on the server
- **Dashboard** — Stats, department overview, today's attendance
- **JWT Authentication** — Short-lived tokens, rate-limited login, strong password rules
- **Audit Log** — Records who approved, edited, deleted or changed access, and when
- **Hardened API** — Security headers, NoSQL-injection protection, input validation, safe error messages
