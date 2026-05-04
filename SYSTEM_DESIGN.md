# Nirmaya Clinic Management System - Complete Design Document

## 1. SYSTEM OVERVIEW

- **Type**: Multi-tenant clinic management system
- **Architecture**: Node.js + Express + TypeScript + Drizzle ORM + Supabase
- **Deployment**: Vercel (serverless)
- **Database**: PostgreSQL (Supabase)
- **Storage**: Supabase Storage
- **Notifications**: Real-time + scheduled (15 min interval)
- **Auth**: JWT-based (receptionist/admin role)

---

## 2. MULTI-TENANCY APPROACH

Every table will have `clinic_id` field:
- Allows scaling to multiple clinics in future
- Single deployment per clinic initially
- All queries filtered by `clinic_id` from authenticated user

**User → Clinic mapping**:
- Each user belongs to exactly one clinic
- `clinic_id` derived from JWT token
- Enforced at middleware level

---

## 3. DATABASE SCHEMA

### 3.1 CORE TABLES

#### **clinics**
```
id (UUID, PK)
name (String)
phone (String)
email (String)
address (Text)
city (String)
state (String)
pincode (String)
gstin (String, optional)
created_at (Timestamp)
updated_at (Timestamp)
```

**Indexes**: `id`

---

#### **users**
```
id (UUID, PK)
clinic_id (UUID, FK → clinics.id)
phone (String, unique per clinic)
password_hash (String)
full_name (String)
role (Enum: 'receptionist', 'admin')
is_active (Boolean, default: true)
last_login (Timestamp, nullable)
created_at (Timestamp)
updated_at (Timestamp)
```

**Indexes**: `clinic_id, phone`, `clinic_id, is_active`

**Constraints**: Unique(clinic_id, phone)

---

#### **patients**
```
id (UUID, PK)
clinic_id (UUID, FK → clinics.id)
name (String)
phone (String)
email (String, nullable)
age (Integer, nullable)
gender (Enum: 'male', 'female', 'other', nullable)
height_cm (Decimal, nullable)
weight_kg (Decimal, nullable)
blood_group (String, nullable)
has_id_proof (Boolean, default: false)
is_active (Boolean, default: true)
created_at (Timestamp)
updated_at (Timestamp)
```

**Indexes**: `clinic_id, phone`, `clinic_id, created_at`, `clinic_id, is_active`

**Constraints**: Unique(clinic_id, phone)

---

#### **treatments**
```
id (UUID, PK)
clinic_id (UUID, FK → clinics.id)
patient_id (UUID, FK → patients.id)
title (String)
status (Enum: 'planned', 'ongoing', 'paused', 'completed', 'cancelled')
start_date (Date)
estimated_end_date (Date, nullable)
actual_end_date (Date, nullable)
total_fee (Decimal, NOT NULL)
discount_type (Enum: 'percentage', 'fixed_amount', nullable)
discount_value (Decimal, nullable)
final_fee (Decimal, NOT NULL)
notes (Text, nullable)
is_deleted (Boolean, default: false)
created_at (Timestamp)
updated_at (Timestamp)
```

**Indexes**: `clinic_id, patient_id`, `clinic_id, status`, `clinic_id, created_at`

**Notes**: 
- `balance = final_fee - sum(valid_transactions)`
- Derived on-query, never stored
- `final_fee` is editable, triggers audit log

---

#### **visits**
```
id (UUID, PK)
clinic_id (UUID, FK → clinics.id)
treatment_id (UUID, FK → treatments.id)
visit_date (Date)
notes (Text, nullable)
is_deleted (Boolean, default: false)
created_at (Timestamp)
updated_at (Timestamp)
```

**Indexes**: `clinic_id, treatment_id`, `clinic_id, visit_date`

---

#### **transactions** (LEDGER MODEL)
```
id (UUID, PK)
clinic_id (UUID, FK → clinics.id)
treatment_id (UUID, FK → treatments.id)
patient_id (UUID, FK → patients.id)
visit_id (UUID, FK → visits.id, nullable)
type (Enum: 'payment', 'refund', 'adjustment')
amount (Decimal, positive values only)
payment_mode (Enum: 'cash', 'upi', 'card', 'bank', nullable)
reference_id (String, nullable)
notes (Text, nullable)
is_deleted (Boolean, default: false)
created_at (Timestamp)
updated_at (Timestamp)
```

**Indexes**: `clinic_id, treatment_id`, `clinic_id, patient_id`, `clinic_id, created_at`, `clinic_id, payment_mode`

**Important**: 
- Never overwrite transactions
- On edit: mark old as `is_deleted = true`, insert new
- Only count non-deleted transactions in balance

---

#### **installments** (INSTALLMENT TRACKING)
```
id (UUID, PK)
clinic_id (UUID, FK → clinics.id)
treatment_id (UUID, FK → treatments.id)
plan_name (String, e.g., "3 EMI", "6 months")
total_installments (Integer)
installment_amount (Decimal)
due_date (Date)
paid_date (Date, nullable)
status (Enum: 'pending', 'paid', 'overdue')
is_deleted (Boolean, default: false)
created_at (Timestamp)
updated_at (Timestamp)
```

**Indexes**: `clinic_id, treatment_id`, `clinic_id, status`, `clinic_id, due_date`

**Logic**: 
- Each installment can have multiple transactions linked
- Balance per installment = installment_amount - sum(transactions for that installment)

---

#### **follow_ups**
```
id (UUID, PK)
clinic_id (UUID, FK → clinics.id)
patient_id (UUID, FK → patients.id)
treatment_id (UUID, FK → treatments.id)
scheduled_date (Date)
status (Enum: 'scheduled', 'completed', 'missed', 'rescheduled')
notes (Text, nullable)
is_deleted (Boolean, default: false)
created_at (Timestamp)
updated_at (Timestamp)
```

**Indexes**: `clinic_id, patient_id`, `clinic_id, treatment_id`, `clinic_id, scheduled_date`, `clinic_id, status`

---

#### **documents**
```
id (UUID, PK)
clinic_id (UUID, FK → clinics.id)
patient_id (UUID, FK → patients.id)
treatment_id (UUID, FK → treatments.id, nullable)
visit_id (UUID, FK → visits.id, nullable)
category (Enum: 'prescription', 'report', 'cghs', 'echs', 'id_proof', 'other')
file_url (String, Supabase Storage path)
file_name (String)
file_size (Integer, bytes)
mime_type (String)
uploaded_by (UUID, FK → users.id)
is_deleted (Boolean, default: false)
created_at (Timestamp)
updated_at (Timestamp)
```

**Indexes**: `clinic_id, patient_id`, `clinic_id, treatment_id`, `clinic_id, category`

---

#### **audit_logs** (WRITE-ONLY TRACKING)
```
id (UUID, PK)
clinic_id (UUID, FK → clinics.id)
entity (Enum: 'patient', 'treatment', 'transaction', 'visit', 'installment', 'document', 'followup')
entity_id (UUID)
action (Enum: 'create', 'update', 'delete')
old_data (JSONB, nullable)
new_data (JSONB)
changed_by (UUID, FK → users.id)
timestamp (Timestamp)
```

**Indexes**: `clinic_id, entity, entity_id`, `clinic_id, timestamp`, `clinic_id, action`

**Data**: Stores complete before/after state for all writes

---

#### **notifications** (QUEUE + DELIVERY LOGS)
```
id (UUID, PK)
clinic_id (UUID, FK → clinics.id)
patient_id (UUID, FK → patients.id, nullable)
event_type (Enum: 'patient_created', 'treatment_created', 'visit_added', 'prescription_uploaded', 'payment_added', 'payment_updated', 'followup_created', 'payment_reminder')
channel (Enum: 'sms', 'email')
payload (JSONB)
status (Enum: 'pending', 'sent', 'failed')
retry_count (Integer, default: 0)
scheduled_at (Timestamp, when to send)
sent_at (Timestamp, nullable)
error_message (Text, nullable)
created_at (Timestamp)
updated_at (Timestamp)
```

**Indexes**: `clinic_id, status, scheduled_at`, `clinic_id, patient_id`, `clinic_id, event_type`

---

#### **notification_delivery_logs** (GOOGLE SHEETS SYNC)
```
id (UUID, PK)
clinic_id (UUID, FK → clinics.id)
notification_id (UUID, FK → notifications.id)
recipient (String, phone or email)
message_preview (String)
status (Enum: 'sent', 'failed', 'bounced')
delivery_status (String, provider-specific)
delivered_at (Timestamp)
synced_to_sheets (Boolean, default: false)
sync_timestamp (Timestamp, nullable)
error_details (Text, nullable)
created_at (Timestamp)
```

**Indexes**: `clinic_id, notification_id`, `clinic_id, delivered_at`, `synced_to_sheets`

---

#### **bills** (OPTIONAL, FOR FUTURE)
```
id (UUID, PK)
clinic_id (UUID, FK → clinics.id)
patient_id (UUID, FK → patients.id)
treatment_id (UUID, FK → treatments.id)
bill_number (String, unique per clinic)
pdf_url (String, Supabase Storage)
total_amount (Decimal)
paid_amount (Decimal)
balance_amount (Decimal)
generated_at (Timestamp)
created_at (Timestamp)
```

**Indexes**: `clinic_id, bill_number`, `clinic_id, patient_id`, `clinic_id, generated_at`

---

## 4. RELATIONSHIPS & FOREIGN KEYS

```
clinics (root)
├── users (clinic_id)
├── patients (clinic_id)
│   ├── treatments (patient_id)
│   │   ├── visits (treatment_id)
│   │   ├── installments (treatment_id)
│   │   └── transactions (treatment_id)
│   ├── follow_ups (patient_id, treatment_id)
│   ├── documents (patient_id)
│   └── audit_logs (clinic_id)
└── notifications (clinic_id, patient_id)
    └── notification_delivery_logs (notification_id)
```

---

## 5. INDEXING STRATEGY

### Composite Indexes (High Priority)
```
treatments: (clinic_id, patient_id, status)
transactions: (clinic_id, treatment_id, is_deleted)
visits: (clinic_id, treatment_id, visit_date)
patients: (clinic_id, phone) - for search
users: (clinic_id, phone) - for auth
notifications: (clinic_id, status, scheduled_at) - for job queue
follow_ups: (clinic_id, treatment_id, status)
```

### Single Column Indexes
```
All tables: clinic_id (multi-tenant filtering)
Timestamps: created_at, updated_at (range queries)
Foreign Keys: All FK columns
Soft Deletes: is_deleted (where relevant)
```

---

## 6. QUERY PATTERNS & EXAMPLES

### 6.1 BALANCE CALCULATION
```sql
-- Balance per treatment
SELECT 
  t.id,
  t.final_fee,
  COALESCE(SUM(tr.amount), 0) as paid_amount,
  (t.final_fee - COALESCE(SUM(tr.amount), 0)) as balance
FROM treatments t
LEFT JOIN transactions tr ON t.id = tr.treatment_id 
  AND tr.clinic_id = t.clinic_id 
  AND tr.is_deleted = false
WHERE t.id = $1 AND t.clinic_id = $2 AND t.is_deleted = false
GROUP BY t.id, t.final_fee;
```

### 6.2 TREATMENT FILTERS
```sql
-- Completed (balance = 0)
SELECT * FROM treatments 
WHERE clinic_id = $1 AND status = 'completed' AND is_deleted = false;

-- Pending (balance > 0)
SELECT t.* FROM treatments t
LEFT JOIN transactions tr ON t.id = tr.treatment_id 
  AND tr.is_deleted = false
WHERE t.clinic_id = $1 AND t.is_deleted = false
GROUP BY t.id
HAVING (t.final_fee - COALESCE(SUM(tr.amount), 0)) > 0;

-- Overdue (balance > 0 AND past estimated_end_date)
SELECT t.* FROM treatments t
LEFT JOIN transactions tr ON t.id = tr.treatment_id 
  AND tr.is_deleted = false
WHERE t.clinic_id = $1 
  AND t.is_deleted = false
  AND t.estimated_end_date < NOW()::date
GROUP BY t.id
HAVING (t.final_fee - COALESCE(SUM(tr.amount), 0)) > 0;
```

### 6.3 TRANSACTION FILTERS
```sql
-- By date range
SELECT * FROM transactions 
WHERE clinic_id = $1 AND is_deleted = false
  AND created_at >= $2 AND created_at < $3
ORDER BY created_at DESC;

-- By month
SELECT * FROM transactions 
WHERE clinic_id = $1 AND is_deleted = false
  AND DATE_TRUNC('month', created_at) = $2
ORDER BY created_at DESC;

-- By payment mode
SELECT * FROM transactions 
WHERE clinic_id = $1 AND is_deleted = false
  AND payment_mode = $2
ORDER BY created_at DESC;
```

### 6.4 PATIENT SEARCH
```sql
-- Search by name or phone
SELECT * FROM patients 
WHERE clinic_id = $1 AND is_active = true
  AND (phone ILIKE $2 OR name ILIKE $2)
LIMIT 20;
```

### 6.5 DASHBOARD QUERIES
```sql
-- All treatments for patient with balance
SELECT 
  t.id, t.title, t.status, t.final_fee,
  COALESCE(SUM(tr.amount), 0) as paid_amount,
  (t.final_fee - COALESCE(SUM(tr.amount), 0)) as balance
FROM treatments t
LEFT JOIN transactions tr ON t.id = tr.treatment_id 
  AND tr.is_deleted = false
WHERE t.patient_id = $1 AND t.clinic_id = $2 AND t.is_deleted = false
GROUP BY t.id;
```

---

## 7. API STRUCTURE & ENDPOINTS

### 7.1 AUTHENTICATION
```
POST /api/auth/login
  Body: { phone, password }
  Response: { token, user: { id, name, role, clinic_id } }
  Status: 200 | 400 | 401

POST /api/auth/logout
  Status: 200

GET /api/auth/verify
  Headers: Authorization: Bearer <token>
  Status: 200 | 401
```

### 7.2 PATIENTS
```
POST /api/patients
  Body: { name, phone, email, age?, gender?, ... }
  Response: { patient }
  Status: 201 | 400

GET /api/patients
  Query: { search?, page, limit }
  Response: { patients[], total, page, limit }
  Status: 200

GET /api/patients/:id
  Response: { patient, treatments[], visits[], documents[], transactions[] }
  Status: 200 | 404

PATCH /api/patients/:id
  Body: { name?, phone?, email?, ... }
  Response: { patient }
  Status: 200 | 400 | 404

DELETE /api/patients/:id (soft delete)
  Status: 200 | 404
```

### 7.3 TREATMENTS
```
POST /api/treatments
  Body: { patient_id, title, total_fee, discount_type?, discount_value?, start_date, ... }
  Response: { treatment }
  Status: 201 | 400

GET /api/treatments
  Query: { patient_id?, status?, filter?, page, limit }
  Response: { treatments[], total }
  Status: 200

GET /api/treatments/:id
  Response: { treatment, balance, visits[], transactions[] }
  Status: 200 | 404

PATCH /api/treatments/:id
  Body: { status?, final_fee?, notes?, ... }
  Response: { treatment }
  Status: 200 | 400 | 404

DELETE /api/treatments/:id (soft delete)
  Status: 200 | 404
```

### 7.4 VISITS
```
POST /api/visits
  Body: { treatment_id, visit_date, notes? }
  Response: { visit }
  Status: 201 | 400

GET /api/visits
  Query: { treatment_id, date_from?, date_to?, page, limit }
  Response: { visits[], total }
  Status: 200

PATCH /api/visits/:id
  Body: { visit_date?, notes? }
  Response: { visit }
  Status: 200 | 400 | 404

DELETE /api/visits/:id (soft delete)
  Status: 200 | 404
```

### 7.5 TRANSACTIONS (PAYMENT LEDGER)
```
POST /api/transactions
  Body: { treatment_id, visit_id?, patient_id, type, amount, payment_mode?, reference_id?, notes? }
  Response: { transaction }
  Status: 201 | 400

GET /api/transactions
  Query: { treatment_id?, patient_id?, date_from?, date_to?, payment_mode?, page, limit }
  Response: { transactions[], total }
  Status: 200

PATCH /api/transactions/:id (EDIT - soft delete + recreate)
  Body: { amount?, payment_mode?, notes? }
  Response: { old_transaction_id, new_transaction_id }
  Status: 200 | 400 | 404

DELETE /api/transactions/:id (soft delete)
  Status: 200 | 404
```

### 7.6 INSTALLMENTS
```
POST /api/installments
  Body: { treatment_id, plan_name, total_installments, installment_amount, due_date }
  Response: { installments[] }
  Status: 201 | 400

GET /api/installments
  Query: { treatment_id, status?, page, limit }
  Response: { installments[], total }
  Status: 200

PATCH /api/installments/:id
  Body: { status?, due_date?, notes? }
  Response: { installment }
  Status: 200 | 400 | 404
```

### 7.7 DOCUMENTS
```
POST /api/documents/upload
  Body (multipart): { file, category, patient_id, treatment_id?, visit_id? }
  Response: { document }
  Status: 201 | 400

GET /api/documents
  Query: { patient_id?, treatment_id?, category?, page, limit }
  Response: { documents[], total }
  Status: 200

DELETE /api/documents/:id
  Status: 200 | 404
```

### 7.8 FOLLOW-UPS
```
POST /api/followups
  Body: { patient_id, treatment_id, scheduled_date, notes? }
  Response: { followup }
  Status: 201 | 400

GET /api/followups
  Query: { patient_id?, treatment_id?, status?, page, limit }
  Response: { followups[], total }
  Status: 200

PATCH /api/followups/:id
  Body: { status?, scheduled_date?, notes? }
  Response: { followup }
  Status: 200 | 400 | 404
```

### 7.9 BILLS (OPTIONAL)
```
POST /api/bills/generate
  Body: { treatment_id }
  Response: { bill }
  Status: 201 | 400

GET /api/bills/:id
  Response: { bill, transactions[], pdf_url }
  Status: 200 | 404
```

### 7.10 AUDIT LOGS
```
GET /api/audit-logs
  Query: { entity?, entity_id?, action?, date_from?, date_to?, page, limit }
  Response: { logs[], total }
  Status: 200
```

---

## 8. HTTP STATUS CODES

- **200**: Success (GET, PATCH, DELETE)
- **201**: Created (POST)
- **400**: Bad Request (validation error)
- **401**: Unauthorized (missing/invalid token)
- **404**: Not Found (resource doesn't exist)

---

## 9. NOTIFICATION SYSTEM

### 9.1 EVENT TRIGGERS

| Event | When | Channels | Payload |
|-------|------|----------|---------|
| `patient_created` | New patient registered | SMS, Email | patient_name, phone |
| `treatment_created` | New treatment added | SMS, Email | patient_name, treatment_title, total_fee |
| `visit_added` | Visit recorded | SMS, Email | visit_date, treatment_title |
| `prescription_uploaded` | Document uploaded | Email | document_name, category |
| `payment_added` | Transaction created | SMS, Email | amount, payment_mode, treatment_title |
| `payment_updated` | Transaction edited | SMS, Email | old_amount, new_amount |
| `followup_created` | Follow-up scheduled | SMS, Email | scheduled_date, patient_name |
| `payment_reminder` | (Scheduled job) | SMS | treatment_title, balance, due_date |

### 9.2 NOTIFICATION FLOW

1. **Immediate**: Event triggered → create `notifications` entry with `status = 'pending'`, `scheduled_at = NOW()`
2. **Real-time**: Edge Function polls for `scheduled_at <= NOW()` and `status = 'pending'`
3. **Send**: Call SMS/Email provider (Twilio/MSG91 for SMS, SendGrid for Email)
4. **Log**: Create `notification_delivery_logs` entry
5. **Retry**: If failed and `retry_count < 3`, reschedule for +5 mins
6. **Scheduled Job**: Every 15 mins, trigger payment reminders for overdue treatments

### 9.3 EDGE FUNCTION STRUCTURE

```typescript
// Process notifications every minute (or on-demand)
Deno.serve(async (req) => {
  // 1. Fetch pending notifications
  // 2. Process each notification
  // 3. Call SMS/Email provider
  // 4. Log delivery status
  // 5. Update notification status
  // 6. Sync to Google Sheets
  // 7. Return response
});

// Scheduled job every 15 minutes
// 1. Find overdue treatments with balance > 0
// 2. Create notification entries for payment reminders
```

---

## 10. AUDIT LOGGING IMPLEMENTATION

Every write operation:
1. Capture current state (if update/delete)
2. Apply changes
3. Create `audit_logs` entry:
   ```json
   {
     "entity": "treatment",
     "entity_id": "uuid",
     "action": "update",
     "old_data": { "status": "ongoing", "final_fee": 10000 },
     "new_data": { "status": "completed", "final_fee": 9500 },
     "changed_by": "user_id",
     "timestamp": "2024-01-01T10:00:00Z"
   }
   ```

---

## 11. TRANSACTION EDIT LOGIC

When editing a transaction:
1. Fetch original transaction
2. Create `audit_logs` entry (old_data, new_data)
3. Mark original as `is_deleted = true`
4. Insert new transaction with same `treatment_id, patient_id, visit_id`
5. Create notification for `payment_updated`
6. Return { old_transaction_id, new_transaction_id }

---

## 12. FILE STORAGE (SUPABASE STORAGE)

Structure:
```
clinic-{clinic_id}/
├── patients/
│   └── {patient_id}/
│       ├── id_proofs/
│       └── reports/
└── prescriptions/
    └── {visit_id}/
```

---

## 13. MIDDLEWARE & AUTH

- **JWT Middleware**: Verify token, extract `clinic_id, user_id, role`
- **Clinic Scope Middleware**: Enforce `clinic_id` in all queries
- **Error Handler**: Standardized error responses
- **Validation**: Input validation on all endpoints

---

## 14. RESPONSE FORMAT

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Phone number already exists",
  "statusCode": 400
}
```

---

## 15. IMPLEMENTATION CHECKLIST

- [ ] Schema files (Drizzle)
- [ ] Database migrations
- [ ] Auth (login, JWT)
- [ ] Patients CRUD
- [ ] Treatments CRUD + balance calculation
- [ ] Visits CRUD
- [ ] Transactions CRUD (with edit logic)
- [ ] Installments CRUD
- [ ] Documents (upload, retrieve, delete)
- [ ] Follow-ups CRUD
- [ ] Audit logging middleware
- [ ] Notification system (DB + queue)
- [ ] Edge Functions (notifications + scheduled jobs)
- [ ] API endpoints (all routes)
- [ ] Error handling
- [ ] Input validation
- [ ] Pagination
- [ ] Google Sheets sync (notifications)
- [ ] Bills generation (optional)
- [ ] Dashboard queries

---

## 16. ENVIRONMENT VARIABLES

```
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...supabase.co
SUPABASE_KEY=...
JWT_SECRET=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE=...
SENDGRID_API_KEY=...
GOOGLE_SHEETS_API_KEY=...
GOOGLE_SHEETS_ID=...
```

---

## SUMMARY

This is a **production-ready, audit-safe, multi-tenant clinic management system** with:
- ✅ Complete schema with relationships
- ✅ Soft deletes only (no hard deletes)
- ✅ Comprehensive audit logging
- ✅ Ledger-based transaction model
- ✅ Real-time + scheduled notifications
- ✅ Installment tracking
- ✅ Multi-clinic scalability
- ✅ Serverless-optimized (Vercel)
- ✅ Full pagination support
- ✅ Proper indexing strategy

**Ready to implement?**
