import { useState, useRef } from "react";
import type { MemberWithStatus, PackageType, MembershipPlan } from "@/types";
import { PLAN_CONFIG } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { formatVisitAge } from "@/lib/status";
import { ChevronRight, MessageCircle, Bell, Pencil, Check, StickyNote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUpdateNote } from "@/hooks/useMembers";

interface MemberCardProps {
  member: MemberWithStatus;
  onClick?: () => void;
  navigateToPayment?: boolean;
}

/** Sends a WhatsApp reminder for members who haven't visited in a while. */
function sendWhatsAppReminder(member: MemberWithStatus) {
  const raw    = String(member.phone).replace(/\D/g, "");
  const phone  = raw.startsWith("91") ? raw : `91${raw}`;
  const days   = member.daysSinceVisit;
  const msg    = days !== null
    ? `Hi ${member.name}, we noticed you haven't visited the gym for ${days} day${days === 1 ? "" : "s"}. We'd love to see you back! 💪`
    : `Hi ${member.name}, we miss you at the gym! Come back soon. 💪`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
}

/** Returns the first line (up to 80 chars) of a note for the preview. */
function firstLine(note: string | null): string {
  if (!note) return "";
  const line = note.split("\n")[0].trim();
  return line.length > 80 ? line.slice(0, 80) + "…" : line;
}

export function MemberCard({ member, onClick, navigateToPayment }: MemberCardProps) {
  const navigate = useNavigate();
  const updateNote = useUpdateNote();

  // Note editor state
  const needsNoteSection =
    member.finalStatus === "At Risk" ||
    member.finalStatus === "Inactive" ||
    member.needsReminder;

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteValue, setNoteValue] = useState(member.notes ?? "");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleClick = () => {
    if (onClick) onClick();
    else if (navigateToPayment) navigate(`/payment?memberId=${member.id}`);
    else navigate(`/member/${member.id}`);
  };

  const openNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNoteOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 60);
  };

  const saveNote = async () => {
    if (noteValue === (member.notes ?? "")) { setNoteOpen(false); return; }
    setSaving(true);
    try {
      await updateNote.mutateAsync({ memberId: member.id, notes: noteValue });
    } finally {
      setSaving(false);
      setNoteOpen(false);
    }
  };

  const pkg       = (member.package_type as PackageType) || "strengthening";
  const plan      = (member.membership_plan as MembershipPlan) || "1_month";
  const planLabel = PLAN_CONFIG[pkg]?.[plan]?.label || member.membership_plan;

  const visitDays = member.daysSinceVisit;
  const visitText = formatVisitAge(visitDays);

  // Row highlight based on status
  const rowHighlight =
    member.finalStatus === "Inactive" ? "border-red-500/20 bg-red-500/5"
    : member.finalStatus === "At Risk" ? "border-yellow-500/20 bg-yellow-500/5"
    : "";

  // Visit text colour
  const visitColor =
    visitDays === null    ? "text-muted-foreground italic"
    : visitDays === 0     ? "text-green-600 dark:text-green-400 font-semibold"
    : visitDays <= 6      ? "text-emerald-600 dark:text-emerald-400"
    : visitDays <= 10     ? "text-yellow-600 dark:text-yellow-400 font-semibold"
    : "text-red-500 dark:text-red-400 font-semibold";

  const preview = firstLine(member.notes);

  return (
    <div className={`w-full rounded-lg glass-card transition-all animate-slide-up border ${rowHighlight}`}>
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 p-4 text-left hover:opacity-90 active:scale-[0.98] transition-all"
      >
        {/* Avatar */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold text-sm">
          {member.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold truncate leading-tight">{member.name}</p>
            {member.needsReminder && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                <Bell className="w-2.5 h-2.5" /> Reminder
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
            {pkg} • {planLabel}
          </p>

          {/* Last visit + payment mini-badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs ${visitColor}`}>
              Last visit: {visitText}
            </span>
            {member.isOverdue10Days ? (
              <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded font-semibold">Overdue</span>
            ) : member.hasDues ? (
              <span className="text-[10px] bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded font-semibold">Dues</span>
            ) : member.paymentStatus === "due" ? (
              <span className="text-[10px] bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded font-semibold">Due in {member.dueInDays}d</span>
            ) : null}
          </div>

          {/* Inactive / At Risk reason */}
          {member.inactiveReason && (
            <p className={`text-[11px] font-medium mt-0.5 ${member.finalStatus === "Inactive" ? "text-red-500" : "text-yellow-600 dark:text-yellow-400"}`}>
              {member.inactiveReason}
            </p>
          )}

          {/* Note preview — only for At Risk / Inactive / Reminder */}
          {needsNoteSection && !noteOpen && (
            <div 
              className="flex items-start gap-2 mt-2 min-w-0 p-2 rounded-md bg-secondary/30 border border-secondary/50 group hover:bg-secondary/50 transition-colors"
              onClick={openNote}
            >
              <StickyNote className="w-3.5 h-3.5 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
              <p className={`text-[11px] leading-relaxed flex-1 min-w-0 ${preview ? "text-muted-foreground" : "text-muted-foreground/50 italic"}`}>
                {preview || "Click to add feedback notes..."}
              </p>
              <button
                title="Edit note"
                className="flex-shrink-0 p-1 rounded-full opacity-0 group-hover:opacity-100 bg-background/50 hover:bg-background transition-all text-muted-foreground hover:text-primary"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Status badge + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge finalStatus={member.finalStatus} />
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>

      {/* ── Inline note editor — expands below the row ── */}
      {needsNoteSection && noteOpen && (
        <div
          className="px-4 pb-3 pt-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative bg-secondary/20 p-3 rounded-lg border border-secondary/50 mt-1">
            <div className="flex items-center gap-1.5 mb-2">
              <StickyNote className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Feedback Notes</span>
            </div>
            <textarea
              ref={textareaRef}
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setNoteOpen(false); setNoteValue(member.notes ?? ""); }
              }}
              placeholder="Write feedback notes about this member…"
              rows={3}
              className="w-full text-xs rounded-md border border-border/50 bg-background/80 px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40 text-foreground leading-relaxed shadow-sm"
            />
            <div className="flex items-center justify-end gap-2 mt-2.5">
              <button
                onClick={() => { setNoteOpen(false); setNoteValue(member.notes ?? ""); }}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={saveNote}
                disabled={saving}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-full px-4 py-1.5 transition-all shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                {saving ? "Saving…" : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp reminder button — only shown when reminder is needed */}
      {member.needsReminder && (
        <div className="px-4 pb-3 pt-0">
          <button
            onClick={(e) => { e.stopPropagation(); sendWhatsAppReminder(member); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 border border-green-200 dark:border-green-800 rounded-full px-3 py-1 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Send WhatsApp Reminder
          </button>
        </div>
      )}
    </div>
  );
}
