# Glamour Accessories

E-commerce store for luxury watches, eyewear, and mobile accessories. Cash on Delivery (COD) only, with manual courier tracking-ID assignment by an admin.

**Stack:** React 18 + Vite (frontend) · Express 4 + Mongoose 8 (backend) · MongoDB

---

## Prerequisites

| Requirement | Version                                                     |
| ----------- | ----------------------------------------------------------- |
| Node.js     | 18 LTS or newer                                             |
| npm         | 9 or newer                                                  |
| MongoDB     | 6 or newer, running locally or a connection string to Atlas |

---

## Setup

**1. Install dependencies** (root, backend, and frontend are separate packages):

```bash
npm install && npm install --prefix backend && npm install --prefix frontend
```

**2. Configure the backend.** Copy the example and fill in the required values:

```bash
cp backend/.env.example backend/.env
```

`MONGODB_URI` and `JWT_SECRET` are both **required** — the server refuses to start without them (see `backend/src/config/env.js`). Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**3. Configure the frontend** (optional in development):

```bash
cp frontend/.env.example frontend/.env
```

Leave `VITE_API_URL` blank locally — Vite proxies `/api` and `/uploads` to `localhost:5000`. Set it only for production builds.

**4. Seed the database** with categories, sub-categories, sample products, and two accounts:

```bash
npm run seed
```

The seeder prints the created account emails and passwords to the console on completion. The administrator uses the fixed backend credentials `ibrahim@admin.com` / `admin007`. The customer password is generated randomly on every run; set `SEED_CUSTOMER_PASSWORD` in `backend/.env` to pin it across re-seeds.

The seeder refuses to run when `NODE_ENV=production`, because it deletes every user, category, and product first.

**5. Sign in.** Customers use `/login`. Administrators use a separate page at `/admin/login`, which is not linked from anywhere on the storefront and is not offered on the customer login form.

Signing in with a customer account at `/admin/login` fails with the same generic "Invalid credentials" the wrong password gives — deliberately, so the endpoint cannot be used to discover which email addresses exist or which of them are administrators. When a sign-in you expect to work is rejected, read the backend console: it logs which of the three cases it actually was.

There is no code path anywhere that grants an existing account the `admin` role — `POST /api/auth/register` hard-codes `role: 'customer'`. Besides re-seeding, the only way to promote someone is directly in the database:

```bash
mongosh "$MONGO_URI" --eval 'db.users.updateOne({ email: "owner@example.com" }, { $set: { role: "admin" } })'
```

**6. Start both servers:**

```bash
npm run dev
```

* Frontend → http://localhost:5173
* Backend API → http://localhost:5000/api

---

## Scripts

Run from the repository root:

| Command            | What it does                                          |
| ------------------ | ----------------------------------------------------- |
| `npm run dev`      | Backend and frontend together, in parallel            |
| `npm run backend`  | Backend only, with nodemon reload                     |
| `npm run frontend` | Frontend only, Vite dev server                        |
| `npm run build`    | Production build of the frontend into `frontend/dist` |
| `npm run seed`     | Reset and re-seed the database                        |
| `npm start`        | Backend in production mode (no reload)                |

The frontend also has `npm run lint --prefix frontend` and `npm run preview --prefix frontend`.

---

## Project structure

```text
backend/
  src/
    config/       env validation + shared business constants
    controllers/  request handlers
    middleware/   auth, validation, uploads, error handling
    models/       Mongoose schemas
    routes/       route definitions
    services/     email
    utils/        logger, order-ID generation, seed script
  uploads/        user-uploaded product images (gitignored)

frontend/
  public/         static assets served at the web root
  src/
    components/   admin/, common/, product/
    context/      AuthContext, CartContext
    pages/        one file per route
    services/     axios instance
    styles/       index.css — design tokens and shared classes
```

### Where the business rules live

`backend/src/config/constants.js` is the single source of truth for shipping thresholds, the order status state machine, pagination limits, and per-item quantity caps. The frontend reads shipping values from `GET /api/config/shipping` — do not hardcode them in components.

---

## Architecture notes

* **Auth** is JWT bearer tokens, sent in the `Authorization` header. Admin routes are protected by `protect` + `requireAdmin` middleware. The `/admin` URL is **not** a security boundary — authorization is enforced server-side on every admin route.

* **`POST /api/auth/admin-login` is a separate door, not a separate privilege.** The token it issues is identical to the one `/api/auth/login` issues; `protect` re-reads the user from MongoDB on every request and `requireAdmin` checks **that** row's role. Do not add claims to the admin token, and do not weaken `requireAdmin` on the assumption that reaching the admin endpoint proves anything about the caller.

* **All three admin-login failure modes return the same response.** Unknown email, wrong password, and a valid customer account are indistinguishable to the client, and a bcrypt comparison runs on every request — against a dummy hash when no account matches — so response time does not leak which case occurred either.

* **Prices are computed server-side only.** `POST /api/orders` ignores any price sent by the client and recalculates from the database. Never change this.

* **Stock is deducted atomically** via a conditional `findOneAndUpdate`, with a compensating rollback if a later item in the same order fails.

* **Order status transitions** are validated against `ORDER.VALID_TRANSITIONS`. Cancelling an order restocks its items.

---

## Status

This project is mid-remediation against a full review. Several admin features are known to be broken or incomplete and are being fixed in phases — notably product editing, category editing, dual pricing (original + selling price), the Buy Now flow, and responsive layout across the admin panel. Check with the team before assuming a given admin screen works end to end.
