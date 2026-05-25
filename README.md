# 🏢 TalentTrack EMS — Employee Management System

A full-stack MERN (MongoDB, Express, React, Node.js) Employee Management System.

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Node.js v18+ (https://nodejs.org)
- MongoDB Community Server (https://www.mongodb.com/try/download/community)
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

## Step 2 — Install & Run Backend

Open a terminal in VS Code (`Ctrl+\``), then:

```bash
cd backend
npm install
npm run seed        # Seeds demo data (run once)
npm run dev         # Starts on http://localhost:5000
```

---

## Step 3 — Install & Run Frontend

Open a **second** terminal:

```bash
cd frontend
npm install
npm start           # Opens http://localhost:3000
```

---

## 🔑 Demo Login Credentials

| Role     | Email                        | Password    |
|----------|------------------------------|-------------|
| Admin    | admin@talenttrack.com        | password123 |
| Manager  | manager@talenttrack.com      | password123 |
| Employee | employee@talenttrack.com     | password123 |

> Click the **Quick Demo Login** buttons on the login page for instant access.

---

## 📁 Project Structure

```
04-IMPLEMENTATION/
├── backend/
│   ├── config/         → DB config
│   ├── controllers/    → Business logic (auth, employees, attendance, leaves, dashboard)
│   ├── middleware/     → JWT auth & role authorization
│   ├── models/         → Mongoose schemas (User, Employee, Attendance, Leave)
│   ├── routes/         → Express route definitions
│   ├── scripts/        → Seed script
│   ├── utils/          → Token generator
│   ├── .env            → Environment variables
│   └── server.js       → App entry point
│
└── frontend/
    └── src/
        ├── components/ → Navbar, PrivateRoute, StatCard
        ├── context/    → AuthContext (global auth state)
        ├── pages/
        │   ├── auth/        → Login.js
        │   ├── dashboard/   → Dashboard.js
        │   ├── employees/   → EmployeeList, AddEmployee, EditEmployee
        │   ├── attendance/  → Attendance.js
        │   └── leaves/      → LeaveManagement.js
        ├── services/   → api.js (all Axios API calls)
        ├── App.js      → Router & layout
        └── App.css     → All styles
```

---

## 🔧 Environment Variables (backend/.env)

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/talenttrack
JWT_SECRET=talenttrack_super_secret_jwt_key_2024
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

---

## 🐳 Docker (Optional)

```bash
docker-compose up --build
```
Starts MongoDB + Backend. Still run the frontend separately with `npm start`.

---

## ✅ Features

- **Employee Management** — CRUD with search & filters
- **Attendance Tracking** — Check-in/out, working hours, monthly view
- **Leave Management** — Apply, approve, reject, cancel leaves
- **Role-Based Access** — Admin / Manager / Employee permissions
- **Dashboard** — Stats, department overview, today's attendance
- **JWT Authentication** — Secure token-based login
