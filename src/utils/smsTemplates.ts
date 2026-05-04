export const buildSmsMessage = (eventType: string, payload: any) => {
  switch (eventType) {
    case "patient_created":
      return `Welcome ${payload.patientName || ""}. Your patient profile is created.`;
    case "treatment_created":
      return `Treatment ${payload.treatmentTitle || ""} created. Total: INR ${payload.totalFee || ""}.`;
    case "visit_added":
      return `Visit recorded on ${payload.visitDate || ""} for ${payload.treatmentTitle || ""}.`;
    case "prescription_uploaded":
      return `Prescription uploaded for ${payload.patientName || ""}.`;
    case "payment_added":
      return `Payment received INR ${payload.amount || ""} via ${payload.paymentMode || ""}.`;
    case "payment_updated":
      return `Payment updated. Old INR ${payload.oldAmount || ""}, New INR ${payload.newAmount || ""}.`;
    case "followup_created":
      return `Follow-up scheduled on ${payload.scheduledDate || ""}.`;
    case "payment_reminder":
      return `Payment reminder: balance INR ${payload.balance || ""} for ${payload.treatmentTitle || ""}.`;
    default:
      return "Notification from clinic.";
  }
};
