# Nirmaya Backend API Structure

Current implementation: Node.js + TypeScript + Express + Drizzle + Supabase + Vercel.

This document describes the APIs as they exist in code right now.

## Base URL

```text
/api
```

## Standard Response Shape

Success:

```json
{
  "success": true,
  "message": "Success message",
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

Error:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": "Detailed error message"
}
```

Paginated endpoints accept:

```text
page=1
limit=20
```

`limit` is capped at `100`.

## Authentication

Most APIs require:

```http
Authorization: Bearer <jwt>
```

The JWT contains:

```json
{
  "sub": "user_uuid",
  "clinicId": "clinic_uuid",
  "role": "admin | receptionist"
}
```

All protected APIs are scoped by `clinicId` from the logged-in user.

Current roles:

```text
admin
receptionist
```

No doctor role is active right now.

## Current Data Model

```text
clinics
  users
  patients
    treatments
      visits
      transactions
      installments
      bills
    documents
    followups
  audit_logs
  sms_notifications
  sms_delivery_logs
```

Important relationships:

```text
users.clinic_id -> clinics.id
patients.clinic_id -> clinics.id
treatments.patient_id -> patients.id
treatments.clinic_id -> clinics.id
visits.treatment_id -> treatments.id
transactions.treatment_id -> treatments.id
transactions.patient_id -> patients.id
transactions.visit_id -> visits.id, optional
installments.treatment_id -> treatments.id
documents.patient_id -> patients.id
documents.treatment_id -> treatments.id, optional
documents.visit_id -> visits.id, optional
followups.patient_id -> patients.id
followups.treatment_id -> treatments.id
bills.patient_id -> patients.id
bills.treatment_id -> treatments.id
```

Patient uniqueness is currently:

```text
clinic_id + name + phone
```

## Enums

```text
userRole: admin, receptionist
gender: male, female, other
treatmentStatus: planned, ongoing, paused, completed, cancelled
discountType: percentage, fixed_amount
transactionType: payment, refund, adjustment
paymentMode: cash, upi, card, bank
installmentStatus: pending, paid, overdue
followupStatus: scheduled, completed, missed, rescheduled
documentCategory: prescription, report, cghs, echs, id_proof, other
auditEntity: patient, treatment, transaction, visit, installment, document, followup, bill
auditAction: create, update, delete
smsEvent: patient_created, treatment_created, visit_added, prescription_uploaded, payment_added, payment_updated, followup_created, payment_reminder
smsStatus: pending, sent, failed
deliveryStatus: sent, failed, bounced
```

## Public APIs

### POST `/auth/login`

Login using phone and password.

Request:

```json
{
  "phone": "9999999999",
  "password": "password123"
}
```

Response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token",
    "user": {
      "id": "user_uuid",
      "clinicId": "clinic_uuid",
      "phone": "9999999999",
      "fullName": "Receptionist Name",
      "role": "receptionist"
    }
  }
}
```

### GET `/auth/verify`

Requires auth token.

Response:

```json
{
  "success": true,
  "message": "Token verified",
  "data": {
    "user": {
      "id": "user_uuid",
      "clinicId": "clinic_uuid",
      "role": "receptionist"
    }
  }
}
```

### GET `/health/health`

Current implemented health route.

Response:

```json
{
  "success": true,
  "message": "Health check passed",
  "data": {
    "status": "healthy",
    "timestamp": "2026-05-05T00:00:00.000Z",
    "database": {
      "connected": true,
      "status": "connected"
    },
    "uptime": 123.45,
    "environment": "development"
  }
}
```

## Dashboard APIs

Dashboard APIs are protected and clinic-scoped.

### GET `/dashboard/patients`

Returns patient rows for the receptionist dashboard.

Query params:

```text
search optional, matches patient name or phone
status optional, filters patients having at least one treatment with this status
sortBy optional: createdAt, name, lastVisitDate, balance
sortOrder optional: asc, desc
page optional
limit optional
```

Example:

```http
GET /api/dashboard/patients?search=raj&status=ongoing&sortBy=createdAt&sortOrder=desc&page=1&limit=20
```

Response:

```json
{
  "success": true,
  "message": "Dashboard patients fetched",
  "data": [
    {
      "id": "patient_uuid",
      "name": "Raj Sharma",
      "phone": "9999999999",
      "email": "raj@example.com",
      "age": 32,
      "gender": "male",
      "hasIdProof": true,
      "createdAt": "2026-05-05T00:00:00.000Z",
      "updatedAt": "2026-05-05T00:00:00.000Z",
      "treatmentCount": 2,
      "ongoingTreatmentCount": 1,
      "completedTreatmentCount": 1,
      "lastVisitDate": "2026-05-05",
      "totalFee": "60000.00",
      "paidAmount": "20000.00",
      "balance": "40000.00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### GET `/dashboard/patient`

Returns full patient data for the dashboard patient detail screen.

Query params:

```text
id required, patient UUID
```

Example:

```http
GET /api/dashboard/patient?id=patient_uuid
```

Response:

```json
{
  "success": true,
  "message": "Dashboard patient fetched",
  "data": {
    "patient": {
      "id": "patient_uuid",
      "clinicId": "clinic_uuid",
      "name": "Raj Sharma",
      "phone": "9999999999",
      "email": "raj@example.com",
      "age": 32,
      "gender": "male",
      "heightCm": "172.00",
      "weightKg": "70.00",
      "bloodGroup": "B+",
      "hasIdProof": true,
      "isActive": true,
      "createdAt": "2026-05-05T00:00:00.000Z",
      "updatedAt": "2026-05-05T00:00:00.000Z"
    },
    "treatments": [
      {
        "id": "treatment_uuid",
        "clinicId": "clinic_uuid",
        "patientId": "patient_uuid",
        "title": "Braces",
        "status": "ongoing",
        "startDate": "2026-05-05",
        "estimatedEndDate": "2027-05-05",
        "actualEndDate": null,
        "totalFee": "60000.00",
        "discountType": null,
        "discountValue": null,
        "finalFee": "60000.00",
        "notes": "Upper and lower braces",
        "isDeleted": false,
        "createdAt": "2026-05-05T00:00:00.000Z",
        "updatedAt": "2026-05-05T00:00:00.000Z",
        "paidAmount": 20000,
        "balance": 40000,
        "visits": [],
        "transactions": [],
        "installments": [],
        "documents": [],
        "bills": []
      }
    ],
    "visits": [],
    "documents": [],
    "transactions": [],
    "followups": [],
    "installments": [],
    "bills": []
  }
}
```

## Patient APIs

### POST `/patients`

Creates a patient in the logged-in user's clinic.

Request:

```json
{
  "name": "Raj Sharma",
  "phone": "9999999999",
  "email": "raj@example.com",
  "age": 32,
  "gender": "male",
  "heightCm": 172,
  "weightKg": 70,
  "bloodGroup": "B+",
  "hasIdProof": true
}
```

Required:

```text
name
phone
```

Response:

```json
{
  "success": true,
  "message": "Patient created",
  "data": {
    "id": "patient_uuid",
    "clinicId": "clinic_uuid",
    "name": "Raj Sharma",
    "phone": "9999999999",
    "email": "raj@example.com",
    "age": 32,
    "gender": "male",
    "heightCm": "172.00",
    "weightKg": "70.00",
    "bloodGroup": "B+",
    "hasIdProof": true,
    "isActive": true,
    "createdAt": "2026-05-05T00:00:00.000Z",
    "updatedAt": "2026-05-05T00:00:00.000Z"
  }
}
```

### GET `/patients`

Lists active patients.

Query params:

```text
search optional, matches name or phone
page optional
limit optional
```

Example:

```http
GET /api/patients?search=raj&page=1&limit=20
```

Response:

```json
{
  "success": true,
  "message": "Patients fetched",
  "data": [
    {
      "id": "patient_uuid",
      "clinicId": "clinic_uuid",
      "name": "Raj Sharma",
      "phone": "9999999999",
      "email": "raj@example.com",
      "age": 32,
      "gender": "male",
      "heightCm": "172.00",
      "weightKg": "70.00",
      "bloodGroup": "B+",
      "hasIdProof": true,
      "isActive": true,
      "createdAt": "2026-05-05T00:00:00.000Z",
      "updatedAt": "2026-05-05T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### GET `/patients/:id`

Returns patient with related treatments, visits, documents, transactions, and followups.

Response:

```json
{
  "success": true,
  "message": "Patient fetched",
  "data": {
    "patient": {},
    "treatments": [],
    "visits": [],
    "documents": [],
    "transactions": [],
    "followups": []
  }
}
```

### PATCH `/patients/:id`

Updates patient fields.

Request:

```json
{
  "name": "Raj S Sharma",
  "phone": "9999999999",
  "email": "raj@example.com",
  "age": 33,
  "gender": "male",
  "heightCm": 172,
  "weightKg": 71,
  "bloodGroup": "B+",
  "hasIdProof": true
}
```

All fields are optional.

Response:

```json
{
  "success": true,
  "message": "Patient updated",
  "data": {}
}
```

### DELETE `/patients/:id`

Soft-deactivates patient by setting `isActive = false`.

Response:

```json
{
  "success": true,
  "message": "Patient deactivated",
  "data": {}
}
```

## Treatment APIs

### POST `/treatments`

Creates a treatment for a patient.

Request:

```json
{
  "patientId": "patient_uuid",
  "title": "Braces",
  "status": "ongoing",
  "startDate": "2026-05-05",
  "estimatedEndDate": "2027-05-05",
  "actualEndDate": null,
  "totalFee": 60000,
  "discountType": "fixed_amount",
  "discountValue": 5000,
  "finalFee": 55000,
  "notes": "Upper and lower braces"
}
```

Required:

```text
patientId
title
status
startDate
totalFee
finalFee
```

Response:

```json
{
  "success": true,
  "message": "Treatment created",
  "data": {}
}
```

### GET `/treatments`

Lists treatments with calculated paid amount and balance.

Query params:

```text
patientId optional
status optional: planned, ongoing, paused, completed, cancelled
filter optional: completed, pending, overdue
page optional
limit optional
```

Response:

```json
{
  "success": true,
  "message": "Treatments fetched",
  "data": [
    {
      "id": "treatment_uuid",
      "title": "Braces",
      "status": "ongoing",
      "startDate": "2026-05-05",
      "estimatedEndDate": "2027-05-05",
      "finalFee": "55000.00",
      "patientId": "patient_uuid",
      "createdAt": "2026-05-05T00:00:00.000Z",
      "paidAmount": "10000.00",
      "balance": "45000.00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### GET `/treatments/:id`

Returns treatment, visits, transactions, and balance.

Response:

```json
{
  "success": true,
  "message": "Treatment fetched",
  "data": {
    "treatment": {},
    "visits": [],
    "transactions": [],
    "balance": {
      "treatmentId": "treatment_uuid",
      "finalFee": "55000.00",
      "paidAmount": "10000.00",
      "balance": "45000.00"
    }
  }
}
```

### PATCH `/treatments/:id`

Updates treatment fields.

Request:

```json
{
  "title": "Braces",
  "status": "completed",
  "startDate": "2026-05-05",
  "estimatedEndDate": "2027-05-05",
  "actualEndDate": "2027-04-20",
  "totalFee": 60000,
  "discountType": "fixed_amount",
  "discountValue": 5000,
  "finalFee": 55000,
  "notes": "Completed"
}
```

All fields are optional.

Response:

```json
{
  "success": true,
  "message": "Treatment updated",
  "data": {}
}
```

### DELETE `/treatments/:id`

Soft-deletes treatment by setting `isDeleted = true`.

Response:

```json
{
  "success": true,
  "message": "Treatment deleted",
  "data": {}
}
```

## Visit APIs

### POST `/visits`

Creates a visit for a treatment.

Request:

```json
{
  "treatmentId": "treatment_uuid",
  "visitDate": "2026-05-05",
  "notes": "Wire adjustment done"
}
```

Response:

```json
{
  "success": true,
  "message": "Visit created",
  "data": {}
}
```

### GET `/visits`

Query params:

```text
treatmentId optional
dateFrom optional, YYYY-MM-DD
dateTo optional, YYYY-MM-DD
page optional
limit optional
```

Response:

```json
{
  "success": true,
  "message": "Visits fetched",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

### PATCH `/visits/:id`

Request:

```json
{
  "visitDate": "2026-05-06",
  "notes": "Updated notes"
}
```

All fields are optional.

Response:

```json
{
  "success": true,
  "message": "Visit updated",
  "data": {}
}
```

### DELETE `/visits/:id`

Soft-deletes visit.

Response:

```json
{
  "success": true,
  "message": "Visit deleted",
  "data": {}
}
```

## Transaction APIs

### POST `/transactions`

Creates a ledger transaction.

Request:

```json
{
  "treatmentId": "treatment_uuid",
  "patientId": "patient_uuid",
  "visitId": "visit_uuid",
  "type": "payment",
  "amount": 10000,
  "paymentMode": "upi",
  "referenceId": "UPI123",
  "notes": "First installment payment"
}
```

Required:

```text
treatmentId
patientId
type
amount
```

Optional:

```text
visitId
paymentMode
referenceId
notes
```

Response:

```json
{
  "success": true,
  "message": "Transaction created",
  "data": {}
}
```

### GET `/transactions`

Query params:

```text
treatmentId optional
patientId optional
paymentMode optional: cash, upi, card, bank
dateFrom optional, ISO date
dateTo optional, ISO date
month optional, YYYY-MM-DD date inside target month
page optional
limit optional
```

Response:

```json
{
  "success": true,
  "message": "Transactions fetched",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

### PATCH `/transactions/:id`

Ledger edit. The old transaction is soft-deleted and a new transaction is inserted.

Request:

```json
{
  "amount": 12000,
  "paymentMode": "cash",
  "referenceId": "CASH001",
  "notes": "Corrected amount"
}
```

Response:

```json
{
  "success": true,
  "message": "Transaction updated",
  "data": {
    "oldTransactionId": "old_transaction_uuid",
    "newTransactionId": "new_transaction_uuid"
  }
}
```

### DELETE `/transactions/:id`

Soft-deletes transaction.

Response:

```json
{
  "success": true,
  "message": "Transaction deleted",
  "data": {}
}
```

Payment math note:

```text
Current balance calculations sum all non-deleted transaction amounts.
Refund and adjustment business rules have not been finalized yet.
```

## Installment APIs

### POST `/installments`

Creates one installment row. The API currently defaults `status` to `pending`.

Request:

```json
{
  "treatmentId": "treatment_uuid",
  "planName": "6 month plan",
  "totalInstallments": 6,
  "installmentAmount": 10000,
  "dueDate": "2026-06-05"
}
```

Response:

```json
{
  "success": true,
  "message": "Installment created",
  "data": {
    "id": "installment_uuid",
    "clinicId": "clinic_uuid",
    "treatmentId": "treatment_uuid",
    "planName": "6 month plan",
    "totalInstallments": 6,
    "installmentAmount": "10000.00",
    "dueDate": "2026-06-05",
    "paidDate": null,
    "status": "pending",
    "isDeleted": false,
    "createdAt": "2026-05-05T00:00:00.000Z",
    "updatedAt": "2026-05-05T00:00:00.000Z"
  }
}
```

### GET `/installments`

Query params:

```text
treatmentId optional
status optional: pending, paid, overdue
page optional
limit optional
```

Response:

```json
{
  "success": true,
  "message": "Installments fetched",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

### PATCH `/installments/:id`

Request:

```json
{
  "status": "paid",
  "dueDate": "2026-06-05",
  "paidDate": "2026-06-04"
}
```

Response:

```json
{
  "success": true,
  "message": "Installment updated",
  "data": {}
}
```

Current limitation:

```text
Installments are not directly linked to transactions yet.
There is no installmentId field on transactions.
```

## Document APIs

### POST `/documents/upload`

Uploads a document to Supabase Storage and stores metadata.

Content type:

```text
multipart/form-data
```

Fields:

```text
file required
patientId required
treatmentId optional
visitId optional
category required: prescription, report, cghs, echs, id_proof, other
```

Example form body:

```text
file=@report.pdf
patientId=patient_uuid
treatmentId=treatment_uuid
visitId=visit_uuid
category=report
```

Response:

```json
{
  "success": true,
  "message": "Document uploaded",
  "data": {
    "id": "document_uuid",
    "clinicId": "clinic_uuid",
    "patientId": "patient_uuid",
    "treatmentId": "treatment_uuid",
    "visitId": "visit_uuid",
    "category": "report",
    "fileUrl": "https://supabase-storage-url/report.pdf",
    "fileName": "report.pdf",
    "fileSize": 12345,
    "mimeType": "application/pdf",
    "uploadedBy": "user_uuid",
    "isDeleted": false,
    "createdAt": "2026-05-05T00:00:00.000Z",
    "updatedAt": "2026-05-05T00:00:00.000Z"
  }
}
```

### GET `/documents`

Query params:

```text
patientId optional
treatmentId optional
category optional
page optional
limit optional
```

Response:

```json
{
  "success": true,
  "message": "Documents fetched",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

### DELETE `/documents/:id`

Soft-deletes document metadata.

Response:

```json
{
  "success": true,
  "message": "Document deleted",
  "data": {}
}
```

## Follow-up APIs

### POST `/followups`

Creates a follow-up.

Request:

```json
{
  "patientId": "patient_uuid",
  "treatmentId": "treatment_uuid",
  "scheduledDate": "2026-06-05",
  "status": "scheduled",
  "notes": "Monthly review"
}
```

Required:

```text
patientId
treatmentId
scheduledDate
status
```

Response:

```json
{
  "success": true,
  "message": "Follow-up created",
  "data": {}
}
```

### GET `/followups`

Query params:

```text
patientId optional
treatmentId optional
status optional: scheduled, completed, missed, rescheduled
page optional
limit optional
```

Response:

```json
{
  "success": true,
  "message": "Follow-ups fetched",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

### PATCH `/followups/:id`

Request:

```json
{
  "scheduledDate": "2026-06-06",
  "status": "rescheduled",
  "notes": "Patient requested another date"
}
```

All fields from create are optional.

Response:

```json
{
  "success": true,
  "message": "Follow-up updated",
  "data": {}
}
```

## Bill APIs

### POST `/bills/generate`

Generates a PDF bill for a treatment and uploads it to Supabase Storage.

Request:

```json
{
  "treatmentId": "treatment_uuid"
}
```

Response:

```json
{
  "success": true,
  "message": "Bill generated",
  "data": {
    "id": "bill_uuid",
    "clinicId": "clinic_uuid",
    "patientId": "patient_uuid",
    "treatmentId": "treatment_uuid",
    "billNumber": "BILL-1770000000000",
    "pdfUrl": "https://supabase-storage-url/bill.pdf",
    "totalAmount": "55000.00",
    "paidAmount": "10000.00",
    "balanceAmount": "45000.00",
    "generatedAt": "2026-05-05T00:00:00.000Z",
    "createdAt": "2026-05-05T00:00:00.000Z"
  }
}
```

### GET `/bills/:id`

Returns bill and related treatment transactions.

Response:

```json
{
  "success": true,
  "message": "Bill fetched",
  "data": {
    "bill": {},
    "transactions": []
  }
}
```

## Audit Log APIs

### GET `/audit-logs`

Lists audit logs for the logged-in clinic.

Query params:

```text
entity optional: patient, treatment, transaction, visit, installment, document, followup, bill
entityId optional
action optional: create, update, delete
dateFrom optional, ISO date
dateTo optional, ISO date
page optional
limit optional
```

Response:

```json
{
  "success": true,
  "message": "Audit logs fetched",
  "data": [
    {
      "id": "audit_uuid",
      "clinicId": "clinic_uuid",
      "entity": "patient",
      "entityId": "patient_uuid",
      "action": "update",
      "oldData": {},
      "newData": {},
      "changedBy": "user_uuid",
      "timestamp": "2026-05-05T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

## Automatic Side Effects

The code queues SMS notifications for these events:

```text
patient_created
treatment_created
visit_added
prescription_uploaded
payment_added
payment_updated
followup_created
```

The code writes audit logs for create/update/delete actions on:

```text
patients
treatments
visits
transactions
installments
documents
followups
bills
```

## Known Current Limitations

```text
No clinic creation API exists yet.
No staff creation API exists yet.
No doctor role is active.
No role-based permission middleware is active beyond login + clinic scope.
Receptionist/admin are currently treated the same by protected routes.
Some create APIs rely on foreign keys more than explicit clinic ownership checks.
Refund and adjustment payment math is not finalized.
Installments are not linked directly to transactions.
Health route is currently /api/health/health.
```
