import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminAlert {
  id: string;
  member_id: string;
  type: string;
  message: string;
  sent_at: string;
  status: string;
}

export function useAdminAlerts() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [handledMemberIds, setHandledMemberIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      setLoading(true);
      const { data, error } = await supabase
        .from("notification_logs")
        .select("id, member_id, type, message, sent_at, status")
        .order("sent_at", { ascending: false })
        .limit(200);

      if (!error && data) {
        const failedAlerts = data.filter(
          (a) => a.status === "failed" || ["iphone_limitation", "no_permission", "failed_push"].includes(a.type)
        );
        setAlerts(failedAlerts as AdminAlert[]);

        const successful = data.filter(
          (a) => a.status !== "failed" && !["iphone_limitation", "no_permission", "failed_push"].includes(a.type)
        );
        setHandledMemberIds(new Set(successful.map((a) => a.member_id)));
      }
      setLoading(false);
    }

    fetchAlerts();
    
    // Subscribe to changes
    const channel = supabase
      .channel("admin_alerts_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notification_logs",
        },
        () => fetchAlerts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { alerts, handledMemberIds, loading };
}
