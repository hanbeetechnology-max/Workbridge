import { BarChart3, FileCheck2, Headset, ShieldCheck, Users, UserCog } from "lucide-react";
import PillarPageLayout from "../components/common/PillarPageLayout";

const FEATURES = [
  {
    icon: UserCog,
    title: "Dedicated Account Management",
    description: "Your Dedicated WorkBridge Expert: Handling Your Hiring, Rollout, and Support from Day One",
  },
  {
    icon: Users,
    title: "Bulk Hiring",
    description: "Scale Your Team Fast: Bulk Job Posts, Shared Shortlists & Seamless Group Onboarding",
  },
  {
    icon: FileCheck2,
    title: "Service Level Agreements",
    description: "Guaranteed Delivery & Lightning-Fast Support—Backed by a Real SLA, Not Just Promises",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise-Grade Security",
    description: "Total Security: SSO, Audit Logs & Custom Access to Keep Your Hiring Data Locked Down",
  },
  {
    icon: BarChart3,
    title: "Custom Invoicing & Reporting",
    description: "Finance-Friendly: One Simple Bill, Live Spend Tracking & Easy-to-Export Reports",
  },
  {
    icon: Headset,
    title: "Priority Support",
    description: "Skip the queue — enterprise accounts get a direct line to WorkBridge support, 24/7.",
  },
];

export default function EnterprisePage({ onSelect }) {
  return (
    <PillarPageLayout
      seoTitle="Enterprise Freelance Solutions | Scale Your Team with WorkBridge"
      seoDescription="Scale your team with WorkBridge Enterprise — dedicated account management, bulk hiring, and Service Level Agreements built for organizations."
      seoKeywords="Enterprise Freelance Solutions, Scale Team, Bulk Hiring, Enterprise Workers"
      eyebrow="For Enterprise"
      title="Scale Your Team with Enterprise Freelance Solutions"
      subtitle="Enterprise-Grade Hiring: Bulk Tools, Dedicated Support & Custom SLAs for Scaling Teams"
      heroContent={
        <div className="flex flex-wrap items-center justify-center gap-2">
          {["Account Management", "Bulk Hiring", "Service Level Agreements"].map((pill) => (
            <span
              key={pill}
              className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300"
            >
              {pill}
            </span>
          ))}
        </div>
      }
      ctaLabel="Get Started Now"
      onCta={() => onSelect?.("business")}
      features={FEATURES}
    />
  );
}
