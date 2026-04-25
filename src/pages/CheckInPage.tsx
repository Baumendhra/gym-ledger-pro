import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// ─── localStorage keys ────────────────────────────────────────────────────────
const KEY_MEMBER_ID = "member_id";
const KEY_MEMBER_NAME = "member_name";
const KEY_GYM_ID = "gym_id";

// ─── Supabase helpers (replace Edge Function calls) ───────────────────────────

/**
 * POST /identify-member equivalent.
 * Queries members WHERE phone ends with last4 AND user_id = gymId.
 */
async function identifyMember(
  last5: string,
  gymId: string
): Promise<{ member_id: string; name: string }> {
  // DEBUG
  console.log("[identifyMember] gym_id:", gymId);
  console.log("[identifyMember] last5:", last5);

  // Fetch ALL members for this gym — strict filter client-side to avoid ilike false positives
  const { data, error } = await supabase
    .from("members")
    .select("id, name, phone, last_visit_date")
    .eq("user_id", gymId);

  console.log("[identifyMember] raw rows returned:", data?.length ?? 0, "| error:", error?.message ?? "none");

  // ⚠️ If 0 rows AND no error → Supabase RLS is blocking the anon read.
  // Fix: In Supabase dashboard → Authentication → Policies → members table
  // Add policy: FOR SELECT TO anon USING (true)
  if (!error && (!data || data.length === 0)) {
    console.warn(
      "[identifyMember] ⚠️ 0 members returned for gym_id:", gymId,
      "\nThis is likely a Supabase RLS issue. The anon key cannot read members.",
      "\nFix: Add a SELECT policy for the 'anon' role on the 'members' table in Supabase dashboard."
    );
    throw new IdentifyError("not_found");
  }

  if (error) throw new Error(error.message);

  // Strict last-5 match — ignores surrounding digits that ilike would wrongly include
  const match = (data ?? []).filter(
    (m) => m.phone && String(m.phone).replace(/\D/g, "").slice(-5) === last5
  );

  console.log("[identifyMember] matched members:", match);

  if (match.length === 0) throw new IdentifyError("not_found");
  if (match.length > 1)  throw new IdentifyError("multiple_match");

  return { member_id: match[0].id, name: match[0].name };
}


/**
 * POST /checkin equivalent.
 * Inserts a row into checkins. Returns already_checked_in=true if one exists today.
 */
async function checkInMember(
  memberId: string,
  gymId: string
): Promise<{ already_checked_in: boolean }> {
  // DEBUG
  console.log("[checkInMember] member_id:", memberId, "gym_id:", gymId);

  if (!memberId) {
    throw new Error("Member not identified");
  }

  // Fetch check-ins for the member
  const { data: existing, error: existErr } = await supabase
    .from("check_ins")
    .select("checked_in_at")
    .eq("member_id", memberId);

  if (existErr) console.warn("[checkInMember] duplicate-check error:", existErr);

  const today = new Date().toDateString();
  const alreadyChecked = (existing || []).some(c =>
    new Date(c.checked_in_at).toDateString() === today
  );

  if (alreadyChecked) {
    console.log("[checkInMember] already checked in today");
    return { already_checked_in: true };
  }

  // 1. Insert check-in record
  const now = new Date().toISOString();
  console.log("member_id:", memberId);
  
  const { error: insertError } = await supabase
    .from("check_ins")
    .insert({ member_id: memberId, checked_in_at: now });

  if (insertError) {
    console.error("[checkInMember] insert error:", insertError);
    throw new Error(insertError.message || "Failed to record check-in");
  }

  // 2. Update last_visit_date — scoped to this gym for multi-gym safety
  console.log("[checkInMember] updating last_visit_date for:", memberId, "gym:", gymId);
  const { error: updateError } = await supabase
    .from("members")
    .update({ last_visit_date: now })
    .eq("id", memberId)
    .eq("user_id", gymId);

  if (updateError) {
    console.error("[checkInMember] last_visit_date update error:", updateError);
    // Non-fatal: check-in row is already inserted; surface as warning not hard fail
    console.warn("Check-in was recorded but last_visit_date could not be updated.");
  }

  return { already_checked_in: false };
}

class IdentifyError extends Error {
  kind: "not_found" | "multiple_match";
  constructor(kind: "not_found" | "multiple_match") {
    super(kind);
    this.kind = kind;
  }
}

// ─── Phase type ───────────────────────────────────────────────────────────────
type Phase =
  | "loading"
  | "pin_input"
  | "identifying"
  | "checking_in"
  | "success"
  | "already_checked"
  | "not_found"
  | "multiple_match"
  | "error"
  | "no_gym";

// ─── Component ────────────────────────────────────────────────────────────────
export default function CheckInPage() {
  const [searchParams] = useSearchParams();
  const gymId = searchParams.get("gym_id") ?? "";

  const [phase, setPhase] = useState<Phase>("loading");
  const [memberName, setMemberName] = useState("");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const pinRef = useRef<HTMLInputElement>(null);

  // ── On mount ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Disable PWA popup
    const handler = (e: Event) => {
      e.preventDefault();
      return false;
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (!gymId) { setPhase("no_gym"); return; }

    const savedId = localStorage.getItem(KEY_MEMBER_ID);
    const savedGym = localStorage.getItem(KEY_GYM_ID);
    const savedName = localStorage.getItem(KEY_MEMBER_NAME) ?? "";

    if (savedId && savedGym === gymId) {
      setMemberName(savedName);
      runCheckIn(savedId, gymId);
    } else {
      setPhase("pin_input");
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId]);

  // Auto-focus pin input
  useEffect(() => {
    if (phase === "pin_input") requestAnimationFrame(() => pinRef.current?.focus());
  }, [phase]);

  // ── runCheckIn ────────────────────────────────────────────────────────────
  async function runCheckIn(memberId: string, currentGymId: string) {
    setPhase("checking_in");
    try {
      const res = await checkInMember(memberId, currentGymId);
      setPhase(res.already_checked_in ? "already_checked" : "success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Check-in failed");
      setPhase("error");
    }
  }

  // ── handlePinChange ───────────────────────────────────────────────────────
  function handlePinChange(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 5);
    setPinError("");
    setPin(digits);
    if (digits.length === 5) setTimeout(() => runIdentify(digits), 80);
  }

  // ── runIdentify ───────────────────────────────────────────────────────────
  async function runIdentify(digits: string) {
    setPhase("identifying");
    try {
      const res = await identifyMember(digits, gymId);
      localStorage.setItem(KEY_MEMBER_ID, res.member_id);
      localStorage.setItem(KEY_MEMBER_NAME, res.name);
      localStorage.setItem(KEY_GYM_ID, gymId);
      setMemberName(res.name);
      await runCheckIn(res.member_id, gymId);
    } catch (err) {
      if (err instanceof IdentifyError) {
        setPhase(err.kind);
      } else {
        setErrorMsg(err instanceof Error ? err.message : "Identification failed");
        setPhase("error");
      }
      setPin("");
    }
  }

  // ── handleReset ───────────────────────────────────────────────────────────
  function handleReset() {
    localStorage.removeItem(KEY_MEMBER_ID);
    localStorage.removeItem(KEY_MEMBER_NAME);
    localStorage.removeItem(KEY_GYM_ID);
    setMemberName(""); setPin(""); setPinError(""); setErrorMsg("");
    setPhase("pin_input");
  }

  function retry() { setPin(""); setPinError(""); setErrorMsg(""); setPhase("pin_input"); }

  const isSpinning = phase === "loading" || phase === "identifying" || phase === "checking_in";

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ci-root">

      {/* NO GYM */}
      {phase === "no_gym" && (
        <Centered>
          <span className="ci-emoji">⚠️</span>
          <h1 className="ci-title">Invalid Link</h1>
          <p className="ci-sub">Missing gym ID — please scan the correct QR code.</p>
        </Centered>
      )}

      {/* SPINNER */}
      {isSpinning && (
        <Centered>
          <div className="ci-spinner" />
          <p className="ci-sub" style={{ marginTop: "1.25rem" }}>
            {phase === "identifying" ? "Looking you up…" : "Checking you in…"}
          </p>
        </Centered>
      )}

      {/* PIN INPUT */}
      {phase === "pin_input" && (
        <Centered>
          <div className="ci-logo-pill">
            <div className="ci-logo-dot" />
            <span className="ci-logo-text">Quick Check-in</span>
          </div>

          <div className="ci-gym-icon">🏋️</div>

          <h1 className="ci-title">Enter last 5 digits</h1>
          <p className="ci-sub">of your registered phone number</p>

          {/* Real input — triggers mobile numpad */}
          <input
            ref={pinRef}
            className="ci-pin-hidden"
            type="tel"
            inputMode="numeric"
            maxLength={5}
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            autoComplete="off"
          />

          {/* Visual dots */}
          <div
            className="ci-pin-dots"
            onClick={() => pinRef.current?.focus()}
            role="button"
            tabIndex={0}
            aria-label="PIN entry"
            onKeyDown={(e) => e.key === "Enter" && pin.length === 5 && runIdentify(pin)}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={[
                  "ci-pin-dot",
                  pin.length > i ? "ci-pin-dot--filled" : "",
                  pinError ? "ci-pin-dot--error" : "",
                ].join(" ")}
              />
            ))}
          </div>

          {pinError && <p className="ci-error-text">{pinError}</p>}
          <p className="ci-hint-small">Auto-submits when 5 digits are entered</p>
        </Centered>
      )}

      {/* SUCCESS */}
      {phase === "success" && (
        <Centered>
          <div className="ci-check-ring">
            <svg viewBox="0 0 52 52" fill="none" className="ci-check-svg">
              <circle cx="26" cy="26" r="25" stroke="currentColor" strokeWidth="2" />
              <path
                d="M14 26l8 8 16-16"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ci-check-path"
              />
            </svg>
          </div>
          <h1 className="ci-title" style={{ marginTop: "1.25rem" }}>
            {memberName ? `Welcome, ${memberName.split(" ")[0]}!` : "Welcome back!"}
          </h1>
          <p className="ci-success-pill">Checked In ✅</p>
          <p className="ci-time">
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <button className="ci-ghost-btn" onClick={handleReset}>
            Not you? Change user
          </button>
        </Centered>
      )}

      {/* ALREADY CHECKED */}
      {phase === "already_checked" && (
        <Centered>
          <div className="ci-already-ring"><span style={{ fontSize: "2rem" }}>📋</span></div>
          <h1 className="ci-title ci-amber">Already checked in</h1>
          {memberName && <p className="ci-member-name">{memberName}</p>}
          <p className="ci-sub">You already checked in today.</p>
          <button className="ci-ghost-btn" onClick={handleReset}>Not you? Change user</button>
        </Centered>
      )}

      {/* NOT FOUND */}
      {phase === "not_found" && (
        <Centered>
          <span className="ci-emoji">🔍</span>
          <h1 className="ci-title ci-red">Member not found</h1>
          <p className="ci-sub">No member matched those 5 digits.<br />Please try again or contact the gym.</p>
          <button className="ci-primary-btn" onClick={retry}>Try again</button>
        </Centered>
      )}

      {/* MULTIPLE MATCH */}
      {phase === "multiple_match" && (
        <Centered>
          <span className="ci-emoji">👥</span>
          <h1 className="ci-title ci-amber">Multiple matches</h1>
          <p className="ci-sub">More than one member shares those digits.<br />Please contact the gym reception.</p>
          <button className="ci-ghost-btn" onClick={retry}>← Try again</button>
        </Centered>
      )}

      {/* ERROR */}
      {phase === "error" && (
        <Centered>
          <span className="ci-emoji">⚠️</span>
          <h1 className="ci-title ci-red">Something went wrong</h1>
          <p className="ci-sub">{errorMsg || "Please try again."}</p>
          <button className="ci-primary-btn" onClick={retry}>Try again</button>
        </Centered>
      )}

      {/* ── Scoped styles ─────────────────────────────────────────────────── */}
      <style>{`
        .ci-root {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(150deg, hsl(222,60%,6%) 0%, hsl(245,40%,10%) 100%);
          color: #fff;
          font-family: 'Inter', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }
        .ci-root::before {
          content: '';
          position: fixed; inset: 0;
          background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.033) 1px, transparent 0);
          background-size: 30px 30px;
          pointer-events: none;
        }

        /* Centered wrapper */
        .ci-centered {
          position: relative; z-index: 1;
          flex: 1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 2.5rem 1.75rem;
          text-align: center;
          gap: 0.3rem;
          animation: ci-fade 0.28s ease;
        }
        @keyframes ci-fade {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Logo pill */
        .ci-logo-pill {
          display: inline-flex; align-items: center; gap: 0.4rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 999px;
          padding: 0.3rem 0.85rem;
          margin-bottom: 0.5rem;
        }
        .ci-logo-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: linear-gradient(135deg, #60a5fa, #22d3ee);
          box-shadow: 0 0 8px rgba(96,165,250,0.7);
        }
        .ci-logo-text {
          font-size: 0.7rem; font-weight: 600;
          letter-spacing: 0.09em; text-transform: uppercase;
          color: rgba(255,255,255,0.5);
        }

        /* Gym icon */
        .ci-gym-icon {
          font-size: 3rem; line-height: 1;
          margin: 0.5rem 0;
          filter: drop-shadow(0 0 16px rgba(96,165,250,0.4));
        }

        /* Typography */
        .ci-title {
          font-size: clamp(1.5rem, 6vw, 2rem);
          font-weight: 700; color: #fff;
          margin: 0.5rem 0 0;
          letter-spacing: -0.02em; line-height: 1.2;
        }
        .ci-red   { color: #f87171; }
        .ci-amber { color: #fbbf24; }
        .ci-sub {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.42);
          margin: 0.3rem 0; line-height: 1.55;
        }
        .ci-hint-small {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.22);
          margin-top: 0.5rem;
        }
        .ci-member-name {
          font-size: 1.1rem; font-weight: 600;
          color: #93c5fd; margin: 0.1rem 0;
        }
        .ci-success-pill {
          font-size: 1.15rem; font-weight: 600;
          color: #34d399; margin: 0.3rem 0;
          background: rgba(52,211,153,0.12);
          border: 1px solid rgba(52,211,153,0.25);
          border-radius: 999px; padding: 0.3rem 1.2rem;
          letter-spacing: 0.01em;
        }
        .ci-time {
          font-size: 0.82rem; color: rgba(255,255,255,0.28);
          margin: 0.1rem 0 1.5rem;
        }
        .ci-emoji { font-size: 3.2rem; line-height: 1; }

        /* Spinner */
        .ci-spinner {
          width: 54px; height: 54px; border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #60a5fa;
          animation: ci-spin 0.65s linear infinite;
        }
        @keyframes ci-spin { to { transform: rotate(360deg); } }

        /* Check ring */
        .ci-check-ring {
          width: 96px; height: 96px; border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 45px rgba(16,185,129,0.5);
          animation: ci-pop 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes ci-pop {
          0%   { transform: scale(0.4); opacity: 0; }
          100% { transform: scale(1);   opacity: 1; }
        }
        .ci-check-svg { width: 52px; height: 52px; color: #fff; }
        .ci-check-path {
          stroke-dasharray: 40; stroke-dashoffset: 40;
          animation: ci-draw 0.4s ease 0.38s forwards;
        }
        @keyframes ci-draw { to { stroke-dashoffset: 0; } }

        /* Already ring */
        .ci-already-ring {
          width: 84px; height: 84px; border-radius: 50%;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 35px rgba(245,158,11,0.4);
          animation: ci-pop 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }

        /* PIN */
        .ci-pin-hidden {
          position: absolute; opacity: 0;
          width: 1px; height: 1px; pointer-events: none;
        }
        .ci-pin-dots {
          display: flex; gap: 1.1rem;
          cursor: text; padding: 1.25rem 1rem;
          margin-top: 0.75rem;
        }
        .ci-pin-dot {
          width: 22px; height: 22px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.22);
          background: transparent;
          transition: background 0.2s, border-color 0.2s, transform 0.15s;
        }
        .ci-pin-dot--filled {
          background: #3b82f6; border-color: #3b82f6;
          transform: scale(1.18);
          box-shadow: 0 0 14px rgba(59,130,246,0.6);
        }
        .ci-pin-dot--error {
          border-color: #f87171;
          animation: ci-shake 0.35s ease;
        }
        @keyframes ci-shake {
          0%,100% { transform: translateX(0); }
          25%      { transform: translateX(-5px); }
          75%      { transform: translateX(5px); }
        }
        .ci-error-text {
          color: #f87171; font-size: 0.83rem;
          animation: ci-fade 0.2s ease;
        }

        /* Buttons */
        .ci-ghost-btn {
          margin-top: 2rem;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.13);
          color: rgba(255,255,255,0.42);
          border-radius: 999px;
          padding: 0.5rem 1.3rem;
          font-size: 0.82rem;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .ci-ghost-btn:hover { border-color: rgba(255,255,255,0.38); color: rgba(255,255,255,0.78); }

        .ci-primary-btn {
          margin-top: 1.75rem;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: #fff; border: none; border-radius: 999px;
          padding: 0.78rem 2.2rem;
          font-size: 0.97rem; font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 4px 20px rgba(59,130,246,0.3);
        }
        .ci-primary-btn:hover {
          transform: scale(1.03);
          box-shadow: 0 8px 28px rgba(59,130,246,0.45);
        }
      `}</style>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="ci-centered">{children}</div>;
}
