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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      setLoading(true);
      const { data, error } = await supabase
        .from("notification_logs")
        .select("id, member_id, type, message, sent_at, status")
        .or("status.eq.failed,type.in.(iphone_limitation,no_permission)")
        .order("sent_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setAlerts(data as AdminAlert[]);
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

  return { alerts, loading };
}
