import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { subscription, title, body, data } = await req.json();
    if (!subscription?.endpoint || !title) {
      return new Response(
        JSON.stringify({ error: "Missing subscription or title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vapidPublicKey  = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidEmail      = Deno.env.get("VAPID_EMAIL") ?? "mailto:baumendhra@gmail.com";

    webPush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      data: data ?? {},
    });

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
    const status = message.includes("410") ? 410 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
