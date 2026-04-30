 

📘 Gym Ledger Pro

A smart gym management system with QR-based attendance, automated member tracking, and interactive push notifications to improve member retention.


---

🚀 Features

🧾 Attendance System

QR code based check-in

Instant attendance marking

No manual entry required



---

⚠️ Smart Member Detection

At Risk → 5–6 days inactive

Needs Reminder → 7+ days inactive

Uses existing attendance data (no extra tracking needed)



---

🔔 Push Notification System (Core Feature)

Fully automated reminders

No WhatsApp / SMS required

Works even when app is closed


✨ Notification Types

At Risk (Day 5–6):

Hey Ravi 👋  
It’s been a few days — don’t lose your streak 💪

Needs Reminder (Day 7+):

Hi Ravi 😔  
We miss you! Come back strong 💪


---

⚡ Interactive Notifications

Users can respond directly from notification:

💪 I'm coming

⏰ Remind me later

💪 Start Today

📞 Call Gym



---

📊 Notification Tracking (CRM-like)

Gym owner can see:

Who received notification

Who responded

Who ignored


Inside member profile:

🔔 Notification Activity

Day 5 → Sent → Coming 💪
Day 7 → Sent → No response ❌


---

🏗️ Architecture

QR Scan
   ↓
Attendance (existing system)
   ↓
Enable Notifications (one-time)
   ↓
Store device subscription
   ↓
Detection (At Risk / Reminder)
   ↓
Edge Function sends push
   ↓
User receives notification 🔔
   ↓
User action tracked in DB


---

🧩 Tech Stack

Frontend

React + TypeScript

Service Worker (for push notifications)


Backend

Supabase (Database)

Supabase Edge Functions (Push sender)


Notifications

Web Push API (VAPID)

No Firebase / OneSignal (fully self-hosted)



---

🗄️ Database Tables

1. push_subscriptions

Stores device info for push delivery

Column	Description

member_id	Linked to member
endpoint	Push endpoint
p256dh	Public key
auth	Auth key
created_at	Timestamp



---

2. notification_logs

Tracks all notifications

Column	Description

member_id	Member reference
type	at_risk / reminder
message	Notification content
sent_at	Sent time
status	sent / coming / later / restart / called
action_time	User interaction time



---

🔐 Push Notification Setup

1. Generate VAPID Keys

npx web-push generate-vapid-keys


---

2. Add to Environment

VITE_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key


---

3. Edge Function

Sends push notifications securely

Uses private key (never exposed to frontend)



---

⚙️ Setup Instructions

1. Install Dependencies

npm install


---

2. Run Project

npm run dev


---

3. Setup Supabase

Create tables:

push_subscriptions

notification_logs


Deploy Edge Function



---

4. Service Worker

Ensure public/sw.js includes:

push event listener

notificationclick handler



---

📱 User Flow

First Time:

Scan QR
↓
Attendance marked
↓
"Enable Notifications"
↓
User clicks Allow


---

Later:

System detects inactivity
↓
Push notification sent 🔔
↓
User interacts directly


---

🛡️ Safety Rules

No duplicate notifications

Only triggered from existing logic

No changes to core system

Works silently in background



---

🎯 Goals

Improve gym member retention

Reduce manual follow-ups

Provide smart automation

Keep system simple & user-friendly



---

🧠 Key Concept

> “Same QR → One-time permission → Fully automatic reminders forever”




---

📌 Future Improvements

Smart priority scoring (high-risk members)

AI-based message personalization

Analytics dashboard (engagement rate)



---

👨‍💻 Author

Built as a smart automation system for gym management using modern web technologies.


---

If you want, I can also: 👉 Add screenshots section
👉 Create GitHub badges
👉 Or make it more “open-source style” 👍
