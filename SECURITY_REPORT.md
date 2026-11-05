# TalentTrack EMS – Security Assessment Report

| | |
|---|---|
| **Tester** | Panchami Bandihalli Varadaraju |
| **Application** | TalentTrack EMS (Node.js/Express API, MongoDB, React front end) |
| **Scope** | All `/api/*` endpoints, the React front end, Docker configuration, dependencies |
| **Method** | Source code review + manual penetration testing with Burp Suite on Kali Linux |
| **Version tested** | `v1-vulnerable` (commit `a1a1098`) |
| **Version fixed** | `v2-secured` |
| **Test accounts** | One admin, one manager, one employee (from the seed script) |

> **How to use this report:** each finding has steps to reproduce on `v1-vulnerable` and a retest
> checklist for `v2-secured`. Add your Burp screenshots where it says *[evidence]* and tick each retest
> box only after you have run it yourself.

---

## 1. Executive summary

The original application had **15 security weaknesses**: 3 critical, 5 high, 6 medium and 1 low.
The most serious ones let **any visitor make themselves an administrator** (F-01), let **anyone forge
an admin login** using a secret published on GitHub (F-02), and let **employees approve their own leave**
(F-03). Most issues come from one root cause: the server **trusted values sent by the browser**
(role, employee ID, status, approver) instead of taking them from the logged-in user.

All findings were fixed in `v2-secured`. The fixes were checked with automated attack checks against
the code; the retest checklist below repeats them as real requests through Burp Suite.

## 2. Findings overview

Severity = likelihood × impact (each rated 1–3).

| ID | Finding | Likelihood | Impact | Severity | OWASP Top 10 (2021) | ISO/IEC 27001:2022 Annex A |
|---|---|---|---|---|---|---|
| F-01 | Anyone can register as admin | 3 | 3 | **Critical** | A01 Broken Access Control | 5.18, 8.2 |
| F-02 | JWT signing secret published on GitHub | 3 | 3 | **Critical** | A02 Cryptographic Failures, A05 | 5.17, 8.24, 8.9 |
| F-03 | Employees can self-approve leave (mass assignment) | 3 | 3 | **Critical** | A01, A04 Insecure Design | 8.26, 8.28 |
| F-04 | Acting as other employees (IDOR) in leave and attendance | 3 | 2 | **High** | A01 | 5.15, 8.3 |
| F-05 | Salary, date of birth and address visible to every employee | 3 | 2 | **High** | A01 | 8.3, 8.11, 8.12 |
| F-06 | Managers can change any field, including their own salary | 2 | 3 | **High** | A01 | 8.3, 8.28 |
| F-07 | NoSQL injection in login and filters | 2 | 3 | **High** | A03 Injection | 8.28 |
| F-08 | Leave approval workflow can be abused | 2 | 2 | **Medium** | A04 | 5.3, 8.26 |
| F-09 | Weak session handling (deactivated users, 7-day tokens) | 2 | 2 | **Medium** | A07 Identification & Auth. Failures | 5.18, 8.5 |
| F-10 | No brute-force protection, weak passwords allowed | 2 | 2 | **Medium** | A07 | 5.17, 8.5 |
| F-11 | Database exposed without password; demo passwords published | 2 | 3 | **High** | A05 Security Misconfiguration | 8.9, 8.20, 5.17 |
| F-12 | Search box allows regular-expression DoS (ReDoS) | 2 | 2 | **Medium** | A03, A04 | 8.6, 8.28 |
| F-13 | Error details leaked, missing security headers, container runs as root | 2 | 1 | **Low** | A05 | 8.9, 8.28 |
| F-14 | Dependencies with known vulnerabilities | 2 | 2 | **Medium** | A06 Vulnerable & Outdated Components | 8.8 |
| F-15 | No audit trail of sensitive actions | 2 | 2 | **Medium** | A09 Logging & Monitoring Failures | 8.15 |

Rating scale: Critical = 9, High = 6, Medium = 4, Low = 2–3.

---

## 3. Detailed findings

In the requests below, `<EMP_TOKEN>`, `<MGR_TOKEN>` and `<ADMIN_TOKEN>` are tokens from logging in
as the employee, manager and admin. `<ALICE_ID>` is the employee's own employee ID, `<BOB_ID>` the
manager's and `<CAROL_ID>` another employee's.

### F-01 – Anyone can register as admin · Critical

**Where:** `POST /api/auth/register` · `authController.register`, `Register.js`

**Description.** The API saved whatever `role` the request contained, and the sign-up page even offered
"Admin" in a dropdown.

**Reproduce (v1):**
```http
POST /api/auth/register
Content-Type: application/json

{"name":"Attacker","email":"attacker@test.com","password":"secret123","role":"admin"}
```
Response `201` with `"role":"admin"`. With that token, `DELETE /api/employees/<CAROL_ID>` succeeds. *[evidence]*

**Impact.** An anonymous attacker gets full control: all personal and salary data, deletions, approvals.

**Fix.** The server ignores `role` and always creates an `employee`. The dropdown was removed. Admins
change roles with the new admin-only `PUT /api/auth/users/:id`, which cannot be used on your own account.

**Retest (v2):**
- [ ] Same request → account created with `"role":"employee"`
- [ ] `DELETE /api/employees/<CAROL_ID>` with the new token → `403`
- [ ] `PUT /api/auth/users/<id>` with `<EMP_TOKEN>` → `403`; with `<ADMIN_TOKEN>` → `200`

---

### F-02 – JWT signing secret published on GitHub · Critical

**Where:** `docker-compose.yml`, `README.md`

**Description.** The secret that signs every login token (`talenttrack_super_secret_jwt_key_2024`) was
committed to a public repository. Anyone who knows it can create a valid token for any user.

**Reproduce (v1):** In Burp's JWT Editor (or jwt.io), take any token, change the `id` in the payload to
the admin user's ID and re-sign it with the published secret. Call `GET /api/auth/me` → returns the admin. *[evidence]*

**Impact.** Full account takeover of every user, including admins, without any password.

**Fix.**
- Secrets removed from `docker-compose.yml` and the README; they now come from a `.env` file that git ignores (`.env.example` is the template).
- The server refuses to start if `JWT_SECRET` is missing or shorter than 32 characters.
- **Action required:** the old secret remains in git history forever, so it must never be used again. Generate a new random secret.

**Retest (v2):**
- [ ] A token signed with the old secret → `401`
- [ ] Starting the server with `JWT_SECRET=short` → server stops with an error
- [ ] `git grep -i "secret" -- '*.yml' '*.md'` finds no real secret

---

### F-03 – Employees can self-approve leave (mass assignment) · Critical

**Where:** `POST /api/leaves` · `leaveController.applyLeave`

**Description.** The whole request body was passed to `Leave.create(req.body)`, so a client could set
fields it should never control, such as `status`.

**Reproduce (v1):**
```http
POST /api/leaves
Authorization: Bearer <EMP_TOKEN>
Content-Type: application/json

{"employee":"<ALICE_ID>","leaveType":"annual","startDate":"2026-12-01","endDate":"2026-12-20",
 "reason":"holiday","status":"approved"}
```
The leave is saved as **approved** with no manager decision and no balance deducted. *[evidence]*

**Impact.** Unlimited paid leave without approval; payroll and HR records become unreliable.

**Fix.** Only `leaveType`, `startDate`, `endDate` and `reason` are accepted (plus `employee` for
managers/admins). New requests are always `pending`. Dates and reason are validated.

**Retest (v2):**
- [ ] Same request → `201` with `"status":"pending"`
- [ ] End date before start date → `400`

---

### F-04 – Acting as other employees (IDOR) · High

**Where:** `POST /api/leaves`, `PUT /api/leaves/:id/cancel`, `GET /api/leaves`,
`POST /api/attendance/checkin|checkout`, `GET /api/attendance`

**Description.** The employee an action was for came from the request (`employee`, `employeeId`) instead
of the login. Any user could also cancel any leave and read everyone's leave and attendance.

**Reproduce (v1):** with `<EMP_TOKEN>`:
1. `POST /api/attendance/checkin` with `{"employeeId":"<CAROL_ID>"}` → Carol is checked in.
2. `POST /api/leaves` with `"employee":"<CAROL_ID>"` → leave filed in Carol's name.
3. `PUT /api/leaves/<CAROL_LEAVE_ID>/cancel` → Carol's (even approved) leave is cancelled.
4. `GET /api/leaves` → every employee's leave requests and reasons. *[evidence]*

**Impact.** Falsified attendance and leave records, and exposure of private leave reasons (e.g. sickness).

**Fix.** A shared `resolveEmployee` check takes the employee from the login token. Employees act only for
themselves; admins and managers (HR) may still act for anyone, as the app intends. Employees see only
their own leave and attendance, and can cancel only their own **pending** requests.

**Retest (v2):**
- [ ] Steps 1–2 with `<EMP_TOKEN>` → record created for **Alice**, not Carol
- [ ] Step 3 → `403`
- [ ] Step 4 → only Alice's leave
- [ ] `GET /api/attendance?employeeId=<CAROL_ID>` with `<EMP_TOKEN>` → only Alice's records

---

### F-05 – Sensitive personal data visible to every employee · High

**Where:** `GET /api/employees`, `GET /api/employees/:id`

**Description.** Any logged-in user received full employee records, including `salary`, `dateOfBirth`,
`address` and `leaveBalance`, even though the page did not show them.

**Reproduce (v1):** `GET /api/employees` with `<EMP_TOKEN>` → all salaries in the JSON response. *[evidence]*

**Impact.** Confidential HR and personal data (GDPR) exposed to all staff.

**Fix.** Employees receive only directory fields (name, email, phone, department, position, status) for
colleagues, and full details only for their own record. Managers and admins still see everything.

**Retest (v2):**
- [ ] `GET /api/employees` with `<EMP_TOKEN>` → no `salary`, `dateOfBirth`, `address`, `leaveBalance`
- [ ] `GET /api/employees/<ALICE_ID>` with `<EMP_TOKEN>` → full own record
- [ ] `GET /api/employees` with `<MGR_TOKEN>` → full records

---

### F-06 – Managers can change any field · High

**Where:** `PUT /api/employees/:id`, `POST /api/employees` · `employeeController`

**Description.** The full request body went to `findByIdAndUpdate`, so a manager could change salaries and
leave balances, including on their own record.

**Reproduce (v1):**
```http
PUT /api/employees/<BOB_ID>
Authorization: Bearer <MGR_TOKEN>
Content-Type: application/json

{"salary":999999,"leaveBalance":{"annual":200}}
```
→ `200`, Bob's own salary and leave changed. *[evidence]*

**Impact.** Financial fraud and manipulation of leave entitlements.

**Fix.** A whitelist of editable fields. `salary` and `leaveBalance` are admin-only (other users' values
are ignored). Managers cannot edit their own employee record. The salary field is hidden in the form for non-admins.

**Retest (v2):**
- [ ] Same request → `403` (own record)
- [ ] `PUT /api/employees/<CAROL_ID>` with `<MGR_TOKEN>` and `"salary":999999` → salary unchanged
- [ ] Same with `<ADMIN_TOKEN>` → salary changed

---

### F-07 – NoSQL injection · High

**Where:** `POST /api/auth/login`, query filters on `/api/employees`, `/api/leaves`, `/api/attendance`

**Description.** JSON bodies and query strings could contain MongoDB operators such as `$ne`, which were
passed straight into database queries.

**Reproduce (v1):**
```http
POST /api/auth/login
Content-Type: application/json

{"email":{"$ne":null},"password":"password123"}
```
→ logged in as the first user in the database (the admin) without knowing the email. Also
`GET /api/leaves?status[$ne]=cancelled` changes the filter logic. *[evidence]*

**Impact.** Authentication bypass when combined with a known or guessed password; unintended data access.

**Fix.**
- Every input is type-checked (e.g. email must be a string).
- A global middleware removes any key starting with `$` or containing `.` from body, query and params.
- Express uses the "simple" query parser, so `status[$ne]` never becomes an object.
- Filter values are checked against allowed lists (statuses, departments, leave types).

**Retest (v2):**
- [ ] The login request above → `400`
- [ ] `?status[$ne]=cancelled` → filter ignored

---

### F-08 – Leave approval workflow can be abused · Medium

**Where:** `PUT /api/leaves/:id/status` · `leaveController.updateLeaveStatus`

**Description.**
- Status could be set to any value, so an approved leave could be set back to `pending` and approved again, deducting the balance twice.
- `approvedBy` came from the request, so the approver could be faked.
- A manager could approve their own leave (no segregation of duties).

**Reproduce (v1):** with `<MGR_TOKEN>`: approve a leave, then send `{"status":"pending"}`, then
`{"status":"approved"}` → balance deducted twice. Approve Bob's own leave → succeeds. *[evidence]*

**Impact.** Incorrect leave balances, untraceable approvals, approvals without independent review.

**Fix.**
- Only `approved` or `rejected` are accepted, and only for `pending` requests.
- The approver is taken from the login.
- Nobody can decide on their own leave.
- The status change and balance deduction are atomic, so two simultaneous approvals cannot both succeed.

**Retest (v2):**
- [ ] `{"status":"pending"}` → `400`
- [ ] Approving an already approved leave → `400`
- [ ] Manager approving own leave → `403`
- [ ] `approvedBy` in the body is ignored

---

### F-09 – Weak session handling · Medium

**Where:** `middleware/auth.js`, `utils/generateToken.js`

**Description.** Tokens were valid for 7 days, and the `protect` middleware never checked `isActive`,
so a deactivated (e.g. dismissed) user kept access until the token expired.

**Reproduce (v1):** log in as the employee, set `isActive:false` in the database, reuse the token on
`GET /api/employees` → `200`. *[evidence]*

**Impact.** Former employees keep access to HR data for up to a week.

**Fix.** Tokens expire after 1 hour, only HS256-signed tokens are accepted, and every request checks that
the account is still active.

**Retest (v2):**
- [ ] Deactivated user's token → `401`
- [ ] A token's `exp` is 1 hour after `iat` (decode it in Burp)
- [ ] An unsigned token (`"alg":"none"`) → `401`

---

### F-10 – No brute-force protection, weak passwords · Medium

**Where:** `POST /api/auth/login`, `POST /api/auth/register`, `User` model

**Description.** Unlimited login attempts, 6-character passwords allowed, and an unknown email answered
faster than a known one (timing difference).

**Reproduce (v1):** Burp Intruder on `/api/auth/login` with a password list → no blocking after hundreds
of attempts. *[evidence]*

**Impact.** Account takeover by password guessing.

**Fix.**
- Login is limited to 10 attempts per 15 minutes per IP, and registration to 5 per hour.
- Passwords need 8+ characters with a letter and a number.
- Logins always run the password check, so response times match.
- The password hash is never returned by queries.

**Retest (v2):**
- [ ] 11th login attempt within 15 minutes → `429 Too Many Requests`
- [ ] Register with `"password":"abc123"` → `400`

---

### F-11 – Database exposed without password; demo passwords published · High

**Where:** `docker-compose.yml`, `README.md`, `scripts/seed.js`, `Login.js`

**Description.** MongoDB was published on port 27017 with no authentication. The README, seed script and
login page ("Quick Demo Login") published `password123` for the admin, manager and employee accounts.

**Reproduce (v1):** `mongosh mongodb://<host>:27017/talenttrack` → full database access without a
password. Log in as `admin@talenttrack.com` / `password123`. *[evidence]*

**Impact.** Complete data theft or deletion by anyone who can reach the server.

**Fix.**
- MongoDB requires a username and password from `.env` and is not published outside Docker.
- The backend port is bound to `127.0.0.1`.
- Demo passwords and the "Quick Demo Login" buttons were removed.
- The seed script uses `SEED_PASSWORD` or a random password, and refuses to run in production.

**Retest (v2):**
- [ ] `mongosh mongodb://localhost:27017` from the host → connection refused
- [ ] `password123` no longer works

---

### F-12 – Regular-expression DoS in search · Medium

**Where:** `GET /api/employees?search=` · `employeeController.getEmployees`

**Description.** The search text was used directly as a regular expression, so users control the pattern
the database runs against every employee's name, email and code.

**Reproduce (v1):**
1. `GET /api/employees?search=.*` → returns everyone, which proves the input is treated as a pattern, not text.
2. Send an expensive pattern such as `search=(.*a){25}` (URL-encoded) in Burp Repeater and compare the response
   time with a normal search. Repeat it with Burp Intruder to see the whole API slow down. *[evidence]*

**Impact.** One user can slow down or block the service for everyone.

**Fix.** Search text is limited to 100 characters and all regex special characters are escaped, so it is
treated as plain text.

**Retest (v2):**
- [ ] `search=.*` → no results (it is now literal text)
- [ ] `search=(.*a){25}` → as fast as a normal search

---

### F-13 – Information leaks and weak hardening · Low

**Where:** all controllers, `server.js`, `Dockerfile`

**Description.**
- Internal error messages were returned to users.
- Security headers were missing, and `X-Powered-By: Express` was sent.
- Request size was unlimited.
- The container ran as root on Node 18, which is end-of-life.

**Reproduce (v1):** `GET /api/employees/abc` → raw Mongoose `CastError` message in the response. Check
response headers in Burp → no `Content-Security-Policy`, `X-Content-Type-Options` etc. *[evidence]*

**Fix.**
- Errors return generic messages, and details are logged on the server only.
- `helmet` adds security headers, and `X-Powered-By` is removed.
- JSON bodies are limited to 100 KB, and a general rate limit applies to the API.
- The Dockerfile uses Node 22, `npm ci --omit=dev`, the unprivileged `node` user and a `.dockerignore`.

**Retest (v2):**
- [ ] `GET /api/employees/abc` → `{"message":"Invalid employee id"}`
- [ ] Security headers present, no `X-Powered-By`
- [ ] `docker compose exec backend whoami` → `node`

---

### F-14 – Dependencies with known vulnerabilities · Medium

**Where:** `backend/package-lock.json`

**Description.** `npm audit` reported 6 vulnerabilities in production dependencies (1 critical, 2 high),
for example denial of service in `body-parser` and `path-to-regexp`, and IP spoofing in `proxy-addr`.

**Reproduce (v1):** `cd backend && npm audit --omit=dev` *[evidence]*

**Fix.**
- Updated `express` (4.22.3), `mongoose` (8.24.8) and `morgan` (1.12.1).
- Pinned a patched `qs`, and updated `nodemon`.
- `npm audit --omit=dev` now reports **0 vulnerabilities**. The frontend's out-of-sync `package-lock.json` was repaired.

**Retest (v2):**
- [ ] `npm audit --omit=dev` in `backend` → 0 vulnerabilities

---

### F-15 – No audit trail · Medium

**Description.** There was no record of who approved leave, changed salaries, deleted employees or
changed user roles.

**Impact.** Disputes and misuse cannot be investigated; this does not meet ISO 27001 logging expectations.

**Fix.** A new `AuditLog` collection records the user, role, action, target, details, IP address and time
for:
- employee create, update and delete,
- leave apply, approve, reject and cancel,
- check-in and check-out,
- role and access changes.

Admins read it at `GET /api/audit-logs`.

**Retest (v2):**
- [ ] Approve a leave, then `GET /api/audit-logs` with `<ADMIN_TOKEN>` → entry `leave.approve` with your user
- [ ] Same with `<EMP_TOKEN>` → `403`

---

## 4. Other fixes

- **Employee code bug:** codes were "count + 1", so after deleting an employee the next code already
  existed and creating employees failed. Codes now continue from the highest existing code.
- **Seed script:** sets employee codes explicitly, because `insertMany` skips the save hook.

## 5. Remaining risks and recommendations

| Risk | Recommendation |
|---|---|
| Login token is stored in `localStorage`, so it could be read if an XSS bug is ever introduced | React escapes output by default and no `dangerouslySetInnerHTML` is used. Next step: move to an `httpOnly` cookie with CSRF protection. |
| Front end uses Create React App (`react-scripts`), which is no longer maintained and has dev-tool vulnerabilities | Migrate the front end to Vite. These packages are only used for building, not in the running app. |
| `nodemon` (development only) still has dev-dependency audit findings | Not shipped in the Docker image (`--omit=dev`); update when a fixed version is released. |
| No account lockout or MFA | Add MFA for admin accounts and lockout after repeated failures. |
| No automated security tests in CI | Add Jest + Supertest tests for each retest step and run them with `npm audit` in GitHub Actions. |

## 6. Tools used

- **Burp Suite Community Edition:** Proxy, Repeater, Intruder, JWT Editor extension
- **Kali Linux** (virtual machine)
- `mongosh`, `npm audit`, browser developer tools
