# CircleCare — Elderly Care & Medication Management Platform

> *"Their health, their choices, your whole family beside them."*

🌐 **Live Demo:** [https://project-3mkgw.vercel.app](https://project-3mkgw.vercel.app)  
📁 **Repository:** [https://github.com/sourit007/carecircle.git](https://github.com/sourit007/carecircle.git)

---

## 📖 Overview

**CircleCare** is an accessible, elder-first web application designed to connect elderly family members, caretakers, and relatives into one shared **Care Circle** via a simple 6-digit passcode. 

The elder stays at the centre of care decisions:
- **Elders** have direct authority over their prescriptions and approvals.
- **Caretakers & Family** collaborate seamlessly by assisting with daily dose logs, scheduling clinic visits, and proposing medication adjustments that wait for the elder's personal review and confirmation.

---

## 🛠️ Technology Stack

### Frontend & Build System
- **[React 18](https://react.dev/)**: Component-based UI architecture with hooks and concurrent rendering.
- **[Vite 6](https://vitejs.dev/)**: Next-generation lightning-fast frontend tooling and Hot Module Replacement (HMR).
- **[JavaScript (ES Modules)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)**: Clean, modular modern JavaScript.
- **[React Router DOM v6](https://reactrouter.com/)**: Client-side routing with query parameter synchronization, protected routes, and onboarding flow.

### Styling, UI & Accessibility
- **[Tailwind CSS v3](https://tailwindcss.com/)**: Utility-first CSS framework customized for high-contrast palettes and flexible responsive layouts.
- **Elder Mode Design System**:
  - High-contrast visual hierarchy with calm, readable color tones.
  - Generous touch targets (min 48px to 68px height) optimized for mobile, tablet, and touch screens.
  - Interactive **Text Size Switcher** (`Large` ↔ `Standard`) allowing elders to customize their interface sizing.
  - Standard, clean UI scale automatically applied for Caretakers and Family members.
- **[Lucide React](https://lucide.dev/)**: Crisp, semantic icon system.
- **Web Speech API**: Integrated Text-to-Speech audio read-aloud functionality for elderly users with vision impairment.
- **Custom Family Logo**: Meaningful SVG brand icon depicting a united family in care.

### Backend, Database & Authentication
- **[Supabase](https://supabase.com/)**: Backend-as-a-Service powering the entire platform directly through `@supabase/supabase-js` without custom server code or service role keys.
- **PostgreSQL with Row Level Security (RLS)**: Client access governed by row-level security policies.
- **Supabase Auth**:
  - Email & Password authentication.
  - **Google OAuth**: One-click "Continue with Google" sign-in with automatic session discovery.
- **PostgreSQL Stored Procedures (RPCs)**: Secure business logic for circle creation, joining, dose logging, approvals, and compliance analytics.
- **Supabase Realtime**: Live Postgres change streams across `dose_logs`, `medications`, `appointments`, and `change_requests`.

---

## ✨ Key Features & Tabs

### 1. Daily Schedule (`Today` Tab)
- Computes today's schedule dynamically in the circle's local timezone (`circles.timezone`).
- Large dose cards displaying scheduled time, medicine name, dosage, notes, and color-coded status badges (`STATUS: PENDING`, `STATUS: TAKEN`, `STATUS: MISSED`).
- Accessible **"I took it"** action button calling the `mark_dose_taken` RPC (available to Elders and Caretakers; Family has read-only visibility).
- Prominent **"Next Upcoming Dose"** banner at the top.
- **"Today's Medical Appointment"** alert card linking doctor visits to the daily routine.
- **"Read Schedule Aloud"** button providing audio read-out of daily doses using the browser's speech synthesis engine.
- Realtime live updates when doses are logged on other devices.

### 2. Prescription Registry (`Medications` Tab)
- Active prescriptions list with dosages, instructions, and multiple daily reminder times (e.g. `8:00 AM`, `8:00 PM`).
- **Role-Based Governance**:
  - **Elder**: Can directly add medications, edit prescriptions, or stop medications (`active = false`).
  - **Caretaker & Family**: Submits proposals to `change_requests` with toast confirmation: *"Sent to [Elder] for approval"*.
- Search bar & status filters: `Active`, `Stopped`, and `All`.
- "My Pending Requests" tracking section.

### 3. Medical Calendar (`Appointments` Tab)
- Doctor consultations, checkups, and clinic visits sorted chronologically in the circle's timezone.
- Accessible form with `datetime-local` input for title, doctor name, clinic location, and special instructions.
- Full create, edit, and delete permissions for all circle members.
- Historical view of past clinic visits.

### 4. Governance & Decision-Making (`Approvals` Tab)
- Live notification badge on the Approvals tab counter showing pending proposals.
- Review pending medication additions, dosage changes, and discontinuation requests.
- Side-by-side comparison diff showing current record vs. proposed updates.
- **Elder**: Large, accessible **"Approve Change"** and **"Reject Request"** buttons invoking `approve_change` and `reject_change` RPCs.
- **Caretaker / Family**: Transparent status review of submitted proposals.
- Decided requests archive showing recently approved/rejected actions.

### 5. Health Compliance (`Adherence` Tab)
- Visual analytics calculated by the `adherence_summary` RPC.
- Selectable time ranges: **7 Days**, **14 Days**, and **30 Days**.
- Overall adherence score percentage with health status grades (*Perfect Consistency*, *Good Consistency*, *Attention Needed*).
- Day-by-day stacked progress bars displaying taken (green), missed (red), and pending (amber) doses.

---

## 🗄️ Database Architecture & RPCs

### Database Schema
```
circles
  ├── id (uuid, pk)
  ├── name (text)
  ├── passcode (text, unique 6-digit code)
  └── timezone (text)

members
  ├── id (uuid, pk)
  ├── circle_id (uuid, fk -> circles.id)
  ├── user_id (uuid)
  ├── role ('elder' | 'caretaker' | 'family')
  ├── display_name (text)
  └── email (text)

medications
  ├── id (uuid, pk)
  ├── circle_id (uuid, fk -> circles.id)
  ├── name (text)
  ├── dosage (text)
  ├── times (text[], e.g. {'08:00', '20:00'})
  ├── notes (text)
  ├── active (boolean)
  ├── start_date (date)
  └── end_date (date)

dose_logs
  ├── id (uuid, pk)
  ├── medication_id (uuid, fk -> medications.id)
  ├── circle_id (uuid, fk -> circles.id)
  ├── scheduled_at (timestamptz)
  ├── status ('pending' | 'taken' | 'missed')
  └── taken_at (timestamptz)

appointments
  ├── id (uuid, pk)
  ├── circle_id (uuid, fk -> circles.id)
  ├── title (text)
  ├── doctor (text)
  ├── location (text)
  ├── starts_at (timestamptz)
  └── notes (text)

change_requests
  ├── id (uuid, pk)
  ├── circle_id (uuid, fk -> circles.id)
  ├── medication_id (uuid, nullable)
  ├── requested_by (uuid)
  ├── action ('add' | 'update' | 'delete')
  ├── payload (jsonb)
  └── status ('pending' | 'approved' | 'rejected')
```

### Stored Procedures (RPCs)
- `create_circle(p_name, p_display_name, p_role, p_timezone)` → Creates circle and initial member.
- `join_circle(p_passcode, p_role, p_display_name)` → Joins circle using passcode.
- `mark_dose_taken(p_dose)` → Marks scheduled dose log as taken with current timestamp.
- `approve_change(p_id)` → Elder approves change request; updates medications table.
- `reject_change(p_id)` → Elder rejects change request.
- `adherence_summary(p_circle, p_days)` → Aggregates taken, missed, and pending logs per day.

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 18+ installed on your machine
- A Supabase project with the schema above

### 1. Clone the repository
```bash
git clone https://github.com/sourit007/carecircle.git
cd carecircle
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy the example environment file:
```bash
cp .env.example .env
```

Open `.env` and fill in your Supabase project credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Run the development server
```bash
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

### 5. Build for production
```bash
npm run build
npm run preview
```

---

## 🔒 Security & Privacy

- **Never exposes the Supabase service role key**: All client operations run through the public `anon` key.
- **Row-Level Security (RLS)**: Enforces access control at the database level.
- **Private Environment Files**: `.env` is strictly excluded from version control via `.gitignore`.

---

## 📄 License
MIT License. Built for supporting elderly care, dignity, and family connection.
