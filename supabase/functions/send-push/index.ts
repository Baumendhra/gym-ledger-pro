// ============================================================
// Supabase Edge Function: send-push
// Sends a Web Push notification to a subscribed member.
//
// Environment secrets required (set via Supabase CLI):
//   supabase secrets set VAPID_PUBLIC_KEY="..."
//   supabase secrets set VAPID_PRIVATE_KEY="..."
//   supabase secrets set VAPID_EMAIL="mailto:gym@example.com"
//   supabase secrets set SUPABASE_SERVICE_KEY="..."  (auto-set)
//
// Deploy:
//   supabase functions deploy send-push
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Parse request body ──────────────────────────────────
    const {
      subscription,   // { endpoint, keys: { p256dh, auth } }
      title,          // notification title
      body,           // notification body
      data,           // { type, member_id, log_id, gym_phone }
    } = await req.json();

    if (!subscription?.endpoint || !title) {
      return new Response(
        JSON.stringify({ error: "Missing subscription or title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Configure web-push with VAPID keys ──────────────────
    const vapidPublicKey  = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidEmail      = Deno.env.get("VAPID_EMAIL") ?? "mailto:baumendhra@gmail.com";

    webPush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

    // ── Build notification payload ──────────────────────────
    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      data: data ?? {},
    });

    // ── Send push ───────────────────────────────────────────
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys?.p256dh ?? subscription.p256dh,
          auth:   subscription.keys?.auth   ?? subscription.auth,
        },
      },
      notificationPayload
    );

    // ── Log the notification in DB (using service role) ─────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (data?.member_id && data?.type) {
      await supabase.from("notification_logs").insert({
        member_id: data.member_id,
        type:      data.type,
        message:   body,
        status:    "sent",
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[send-push] Error:", message);

    // 410 Gone = subscription is expired, caller should delete it
    const status = message.includes("410") ? 410 : 500;

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
