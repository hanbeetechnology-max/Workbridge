// ── Admin Console mock data ───────────────────────────────────────────────
// Every hardcoded array the Admin Panel tabs render lives here, so each tab
// component can import its own slice directly instead of drilling props
// through the layout shell.

// Platform-wide invoice/payment ledger (Transaction History)
export const ADMIN_TRANSACTIONS = [
  { id: "INV-2026-0142", business: "QuickCart Retail", worker: "Priya Sharma", project: "Product Photography Retouch", amount: 6846, status: "secured", date: "Jul 14, 2026" },
  { id: "INV-2026-0139", business: "AppCraft Labs", worker: "Vikram Singh", project: "Mobile App Development", amount: 41040, status: "disputed", date: "Jun 25, 2026" },
  { id: "INV-2026-0131", business: "FreshMart", worker: "Meera Pillai", project: "Logo & Branding Pack", amount: 4536, status: "disputed", date: "Jun 24, 2026" },
  { id: "INV-2026-0118", business: "TravelNest", worker: "Aditya Rao", project: "SEO Audit Report", amount: 10260, status: "released", date: "Jun 22, 2026" },
  { id: "INV-2026-0104", business: "GrowthPilot", worker: "Rohit Verma", project: "SEO Content – 20 Articles", amount: 11880, status: "released", date: "Jun 18, 2026" },
];

// Weekly revenue trend (Master Dashboard chart)
export const REVENUE = [
  { day: "Mon", commission: 580, subscriptions: 120, boosts: 45 },
  { day: "Tue", commission: 620, subscriptions: 118, boosts: 52 },
  { day: "Wed", commission: 710, subscriptions: 125, boosts: 61 },
  { day: "Thu", commission: 680, subscriptions: 122, boosts: 48 },
  { day: "Fri", commission: 847, subscriptions: 131, boosts: 67 },
  { day: "Sat", commission: 790, subscriptions: 128, boosts: 58 },
  { day: "Sun", commission: 640, subscriptions: 115, boosts: 42 },
];

// Real-time mock events for the Master Dashboard's "Live Platform Feed" ticker
export const LIVE_FEED_TEMPLATE = [
  { text: "Arun funded ₹15,000 into Escrow for E-Commerce Platform Dev", tone: "blue" },
  { text: "Priya Sharma earned +15 Pts for passing a skill quiz", tone: "purple" },
  { text: "Rohit Verma submitted milestone files for SEO Content project", tone: "slate" },
  { text: "GrowthPilot posted a new job: SEO Content – 20 Articles", tone: "emerald" },
  { text: "TechNova Solutions paid ₹399 for business verification", tone: "green" },
  { text: "Divya Nair accepted an invite from RetailX Pvt Ltd", tone: "orange" },
  { text: "Escrow released: ₹22,000 to Priya Sharma", tone: "emerald" },
  { text: "New business signup: Bright Ideas Co.", tone: "blue" },
  { text: "Arjun Mehta's Behavior Score crossed 750 (Elite tier)", tone: "purple" },
  { text: "AppCraft Labs opened a dispute on Mobile App Development", tone: "slate" },
];

// Pending business/Worker verifications (Verification Center)
export const VERIFY_QUEUE = [
  { id: 1, name: "Kiran Patel", type: "Worker", docs: ["Aadhaar Card", "PAN Card", "B.Tech Cert"], submitted: "2 hours ago", face: "Matched", status: "pending" },
  { id: 2, name: "Bloom Digital Pvt Ltd", type: "Business", docs: ["GST Certificate", "Company PAN", "Director ID"], submitted: "4 hours ago", face: "N/A", status: "pending" },
  { id: 3, name: "Sneha Joshi", type: "Worker", docs: ["Aadhaar Card", "Portfolio PDF"], submitted: "5 hours ago", face: "Matched", status: "pending" },
  { id: 4, name: "MetaGrowth Agency", type: "Business", docs: ["GST Certificate", "Company PAN"], submitted: "7 hours ago", face: "N/A", status: "review" },
  { id: 5, name: "Ravi Krishnan", type: "Worker", docs: ["Aadhaar Card", "PAN Card", "Diploma"], submitted: "Yesterday", face: "Mismatch", status: "flagged" },
];

// AI confidence score shown per verification row — mismatched/flagged
// submissions score low, giving the admin an automated second opinion.
export const AI_CONFIDENCE = { 1: 98, 2: 95, 3: 97, 4: 89, 5: 42 };

// Active escrow disputes (Dispute Resolution)
export const DISPUTES = [
  { id: "D-2847", project: "Mobile App Development", worker: "Vikram Singh", business: "AppCraft Labs", amount: "₹38,000", filed: "Jun 25, 2026", reason: "Final files not delivered as per agreed scope", status: "open" },
  { id: "D-2841", project: "Logo & Branding Pack", worker: "Meera Pillai", business: "FreshMart", amount: "₹4,200", filed: "Jun 24, 2026", reason: "Quality does not match portfolio samples shown", status: "investigating" },
  { id: "D-2835", project: "SEO Audit Report", worker: "Aditya Rao", business: "TravelNest", amount: "₹9,500", filed: "Jun 22, 2026", reason: "Work fully completed, payment withheld unfairly", status: "resolved" },
];

// Threads auto-flagged by the contact-info leak scanner — off-platform
// escape attempts (phone numbers, emails, external app handles).
export const FLAGGED_THREADS = [
  {
    id: "FT-118",
    worker: "Karan Mehta",
    business: "TechNova Solutions",
    project: "Inventory Dashboard Build",
    severity: "high",
    flaggedAt: "12 minutes ago",
    messages: [
      { from: "business", text: "Hey, the milestone looks good. Quick question on the API rate limits.", time: "10:02 AM" },
      { from: "worker", text: "Sure — happy to walk through it, I can explain faster than typing it all out.", time: "10:04 AM" },
      { from: "business", text: "Works for me, do you have a preferred way to connect?", time: "10:05 AM" },
      { from: "worker", text: "You can call me at 98 for 45 to 33, easier to discuss there.", time: "10:06 AM", flagged: true },
    ],
  },
  {
    id: "FT-112",
    worker: "Sana Sheikh",
    business: "Bright Ideas Co.",
    project: "Instagram Content Calendar",
    severity: "medium",
    flaggedAt: "1 hour ago",
    messages: [
      { from: "worker", text: "Batch 2 captions are uploaded. Let me know if the tone needs adjusting.", time: "9:10 AM" },
      { from: "business", text: "Loved these! Do you have a personal portfolio site I can bookmark?", time: "9:22 AM" },
      { from: "worker", text: "Ping me on WhatsApp at nine-eight-double-zero for quicker replies going forward.", time: "9:24 AM", flagged: true },
    ],
  },
  {
    id: "FT-104",
    worker: "Farhan Ali",
    business: "QuickCart Retail",
    project: "Product Photography Retouch",
    severity: "low",
    flaggedAt: "Yesterday",
    messages: [
      { from: "business", text: "Can you send the raw files separately from the edited set?", time: "Yesterday, 4:40 PM" },
      { from: "worker", text: "Yep, uploading both folders now — referencing order 2200 for the batch split, one sec.", time: "Yesterday, 4:48 PM", flagged: true },
      { from: "business", text: "Perfect, thank you!", time: "Yesterday, 4:50 PM" },
    ],
  },
];

// RBAC team roster (Team Access)
export const INITIAL_TEAM = [
  {
    id: 1,
    name: "You (Owner)",
    role: "Super Admin",
    status: "Active",
    permissions: {
      viewChats: true, redactMessages: true, sendWarnings: true,
      refundEscrow: true, forceRelease: true,
      approveKyc: true, banUsers: true,
    },
  },
  {
    id: 2,
    name: "Rahul K.",
    role: "Tier 1 Support",
    status: "Active",
    permissions: {
      viewChats: true, redactMessages: true, sendWarnings: true,
      refundEscrow: false, forceRelease: false,
      approveKyc: true, banUsers: false,
    },
  },
  {
    id: 3,
    name: "Sneha Iyer",
    role: "Tier 1 Support",
    status: "Active",
    permissions: {
      viewChats: true, redactMessages: false, sendWarnings: true,
      refundEscrow: false, forceRelease: false,
      approveKyc: false, banUsers: false,
    },
  },
];
