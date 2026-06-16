import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const {
      user_id,
      channel = "email",
      subject = "",
      message,
      to_email,
      to_phone,
      related_type = "",
      related_id = null,
    } = await req.json();

    if (!user_id || !message) {
      return new Response(
        JSON.stringify({ error: "user_id and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let status = "sent";
    const deliveryErrors: string[] = [];

    // ── Email delivery via Resend ──────────────────────────────────
    if (channel === "email" && to_email) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "GymFit <notifications@gymfit.app>",
              to: [to_email],
              subject: subject || "GymFit Notification",
              text: message,
              html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
                <h2 style="color:#a3e635;margin-bottom:16px">${subject || "GymFit Notification"}</h2>
                <p style="color:#e5e5e5;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>
                <hr style="border:none;border-top:1px solid #1f1f1f;margin:24px 0">
                <p style="color:#737373;font-size:12px">GymFit Reservation System</p>
              </div>`,
            }),
          });
          if (!res.ok) {
            const err = await res.text();
            deliveryErrors.push(`Resend: ${err}`);
            status = "failed";
          }
        } catch (e) {
          deliveryErrors.push(`Resend exception: ${e}`);
          status = "failed";
        }
      } else {
        // No API key — log as sent (notification stored in DB regardless)
        console.log(`[send-notification] Email to ${to_email}: ${message}`);
      }
    }

    // ── SMS delivery via Twilio ────────────────────────────────────
    if (channel === "sms" && to_phone) {
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");
      if (twilioSid && twilioToken && twilioFrom) {
        try {
          const params = new URLSearchParams({
            To: to_phone,
            From: twilioFrom,
            Body: message,
          });
          const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: params.toString(),
            }
          );
          if (!res.ok) {
            const err = await res.text();
            deliveryErrors.push(`Twilio: ${err}`);
            status = "failed";
          }
        } catch (e) {
          deliveryErrors.push(`Twilio exception: ${e}`);
          status = "failed";
        }
      } else {
        console.log(`[send-notification] SMS to ${to_phone}: ${message}`);
      }
    }

    // ── Always persist to notifications table ─────────────────────
    const { data, error: dbError } = await supabase
      .from("notifications")
      .insert({
        user_id,
        channel,
        subject,
        message,
        status,
        related_type,
        related_id,
      })
      .select()
      .single();

    if (dbError) {
      return new Response(
        JSON.stringify({ error: dbError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification: data,
        delivery_errors: deliveryErrors.length ? deliveryErrors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
