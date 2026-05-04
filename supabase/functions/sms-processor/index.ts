import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const twilioPhone = Deno.env.get("TWILIO_PHONE") || "";

const supabase = createClient(supabaseUrl, serviceKey);

const buildSmsMessage = (eventType: string, payload: any) => {
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

const sendTwilioSms = async (to: string, body: string) => {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
  const auth = btoa(`${twilioSid}:${twilioToken}`);
  const form = new URLSearchParams({
    To: to,
    From: twilioPhone,
    Body: body,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Twilio SMS failed");
  }

  return data;
};

Deno.serve(async () => {
  if (!supabaseUrl || !serviceKey || !twilioSid || !twilioToken || !twilioPhone) {
    return new Response("Missing SMS configuration", { status: 500 });
  }

  const { data: notifications, error } = await supabase
    .from("sms_notifications")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .limit(50);

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  for (const notification of notifications || []) {
    try {
      let recipient = notification.payload?.phone;
      if (!recipient && notification.patient_id) {
        const { data: patient } = await supabase
          .from("patients")
          .select("phone")
          .eq("id", notification.patient_id)
          .single();
        recipient = patient?.phone;
      }

      if (!recipient) {
        throw new Error("Recipient phone not found");
      }

      const message = buildSmsMessage(notification.event_type, notification.payload);
      const twilioRes = await sendTwilioSms(recipient, message);

      await supabase.from("sms_delivery_logs").insert({
        clinic_id: notification.clinic_id,
        notification_id: notification.id,
        recipient,
        message_preview: message.slice(0, 255),
        status: "sent",
        delivery_status: twilioRes.status,
        delivered_at: new Date().toISOString(),
      });

      await supabase
        .from("sms_notifications")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", notification.id);
    } catch (err) {
      const retryCount = (notification.retry_count || 0) + 1;
      const shouldRetry = retryCount < 3;

      await supabase.from("sms_delivery_logs").insert({
        clinic_id: notification.clinic_id,
        notification_id: notification.id,
        recipient: notification.payload?.phone || "unknown",
        message_preview: "SMS failed",
        status: "failed",
        error_details: String(err?.message || err),
      });

      await supabase
        .from("sms_notifications")
        .update({
          status: shouldRetry ? "pending" : "failed",
          retry_count: retryCount,
          scheduled_at: shouldRetry
            ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
            : new Date().toISOString(),
          error_message: String(err?.message || err),
        })
        .eq("id", notification.id);
    }
  }

  return new Response("OK", { status: 200 });
});
