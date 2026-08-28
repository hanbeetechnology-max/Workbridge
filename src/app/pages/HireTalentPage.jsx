import { CheckCircle2, Code2, Lock, MessageSquare, ShieldCheck, Zap } from "lucide-react";
import PillarPageLayout from "../components/common/PillarPageLayout";

const FEATURES = [
  {
    icon: Zap,
    title: "Instant Matching",
    description: "Post a brief and get matched with qualified, available Workers in minutes, not weeks.",
  },
  {
    icon: ShieldCheck,
    title: "Behavior Score Verification",
    description: "Know Who You're Hiring: Live Behavior Scores Built on Real Worker Track Records",
  },
  {
    icon: CheckCircle2,
    title: "Quality Assurance",
    description: "Strict Vetting: We Verify Portfolios & Ratings Before Anyone Can Bid on Your Job",
  },
  {
    icon: Code2,
    title: "Hire Software Developers & More",
    description: "From full-stack developers to designers to SEO specialists — verified Workers across every skill you need.",
  },
  {
    icon: Lock,
    title: "Pay on Delivery",
    description: "Funds stay secured until you approve the work — you only release payment once you're satisfied.",
  },
  {
    icon: MessageSquare,
    title: "Direct, Fast Turnaround",
    description: "Message your hire directly inside WorkBridge and keep projects moving without email back-and-forth.",
  },
];

export default function HireTalentPage({ onSelect }) {
  return (
    <PillarPageLayout
      seoTitle="Hire Verified Workers & Software Developers | WorkBridge"
      seoDescription="Hire verified Workers and software developers with confidence. Instant matching, Behavior Score verification, and payment held until you approve the work."
      seoKeywords="Verified Workers, Hire Software Developers, Hire Workers, Freelance Talent"
      eyebrow="For Businesses"
      title="Hire Verified Talent. Instantly."
      subtitle="Match with Pre-Verified Pros. Check Their Trust Score. Keep Your Funds Safe Until You're Happy."
      heroContent={
        <div className="flex flex-wrap items-center justify-center gap-2">
          {["Instant Matching", "Behavior Score Verification", "Quality Assurance"].map((pill) => (
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
