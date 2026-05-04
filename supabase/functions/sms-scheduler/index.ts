import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, serviceKey);

Deno.serve(async () => {
  if (!supabaseUrl || !serviceKey) {
    return new Response("Missing Supabase configuration", { status: 500 });
  }

  const today = new Date().toISOString().split("T")[0];

  const { data: treatments, error } = await supabase
    .from("treatments")
    .select("id, clinic_id, patient_id, title, final_fee")
    .eq("is_deleted", false)
    .lt("estimated_end_date", today);

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  for (const treatment of treatments || []) {
    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount")
      .eq("treatment_id", treatment.id)
      .eq("is_deleted", false);

    const paid = (transactions || []).reduce(
      (sum, t) => sum + Number(t.amount || 0),
      0
    );
    const balance = Number(treatment.final_fee) - paid;

    if (balance <= 0) {
      continue;
    }

    const { data: existing } = await supabase
      .from("sms_notifications")
      .select("id")
      .eq("treatment_id", treatment.id)
      .eq("event_type", "payment_reminder")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      continue;
    }

    await supabase.from("sms_notifications").insert({
      clinic_id: treatment.clinic_id,
      patient_id: treatment.patient_id,
      treatment_id: treatment.id,
      event_type: "payment_reminder",
      payload: {
        balance,
        treatmentTitle: treatment.title,
      },
      status: "pending",
      scheduled_at: new Date().toISOString(),
    });
  }

  return new Response("OK", { status: 200 });
});
