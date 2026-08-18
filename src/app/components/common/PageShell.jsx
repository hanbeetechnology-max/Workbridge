import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Briefcase, Building2, X } from "lucide-react";
import logoSrc from "../../assets/logo.png";
import { Button } from "./Button";

const navItems = [
  { label: "Find Work",  to: "/find-work"  },
  { label: "Post Job", to: "/hire-talent" },
  { label: "About Us", to: "/enterprise" },
];

// ── Role-picker modal — shown when nav "Log In" / "Sign Up" is clicked ──────
function RoleModal({ onSelect, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xs p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        </button>

        <h3 className="font-display font-extrabold text-[#0A1128] dark:text-white text-lg text-center mb-1">
          I am a…
        </h3>
        <p className="text-slate-400 text-sm text-center mb-5">
          Choose your account type to continue
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => { onSelect("worker"); onClose(); }}
            className="flex items-center gap-3 w-full p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 hover:border-[#FF6B2C] hover:bg-orange-50/40 dark:hover:bg-[#FF6B2C]/10 transition-all duration-200 text-left group"
          >
            <div className="w-9 h-9 bg-[#FF6B2C]/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#FF6B2C]/20 transition-colors">
              <Briefcase className="w-[18px] h-[18px] text-[#FF6B2C]" />
            </div>
            <div>
              <div className="font-bold text-[#0A1128] dark:text-white text-sm">Freelancer</div>
              <div className="text-slate-400 text-xs">Find Freelance Work · Protected Payouts</div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-[#FF6B2C] transition-colors" />
          </button>

          <button
            onClick={() => { onSelect("business"); onClose(); }}
            className="flex items-center gap-3 w-full p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 hover:border-[#1B3FAB] hover:bg-blue-50/40 dark:hover:bg-[#1B3FAB]/10 transition-all duration-200 text-left group"
          >
            <div className="w-9 h-9 bg-[#1B3FAB]/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#1B3FAB]/20 transition-colors">
              <Building2 className="w-[18px] h-[18px] text-[#1B3FAB]" />
            </div>
            <div>
              <div className="font-bold text-[#0A1128] dark:text-white text-sm">Business</div>
              <div className="text-slate-400 text-xs">Hire Top Talent · Pay Only Upon Approval</div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-[#1B3FAB] transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function PageShell({ children, onSelect }) {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const location = useLocation();
  const reducedMotion = useReducedMotion();

  return (
    <div className="wb-shell">
      <div className="wb-aurora" aria-hidden="true">
        <span className="wb-blob wb-blob--one" />
        <span className="wb-blob wb-blob--two" />
        <span className="wb-blob wb-blob--three" />
        <span className="wb-blob wb-blob--four" />
        <span className="wb-blob wb-blob--five" />
      </div>

      {showRoleModal && (
        <RoleModal onSelect={onSelect} onClose={() => setShowRoleModal(false)} />
      )}

      <header className="wb-nav">
        <Link to="/" className="wb-brand font-display">
          <span className="wb-brand-mark">
            <img src={logoSrc} alt="" />
          </span>
          <span>WorkBridge</span>
        </Link>

        <nav className="wb-nav-links" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="wb-nav-actions">
          <Button variant="ghost" onClick={() => setShowRoleModal(true)}>
            Log In
          </Button>
          <Button onClick={() => setShowRoleModal(true)}>
            Sign Up <ArrowRight size={16} />
          </Button>
        </div>
      </header>

      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* relative z-10 — without an explicit position, this footer is a
          static in-flow element, which paints BEHIND .wb-aurora (fixed,
          z-index:0) in the CSS stacking order regardless of its own solid
          background or DOM order — positioned elements paint as a group,
          static ones paint before all of them. Invisible with the old,
          much dimmer aurora; a real bleed-through now that it's vivid. */}
      <footer className="relative z-10 bg-[#0A1128] text-slate-400">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="flex items-center gap-2.5"
              >
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
                  <img src={logoSrc} alt="" className="h-full w-full object-contain" />
                </span>
                <span className="font-display text-lg font-extrabold text-white">
                  WorkBridge
                </span>
              </button>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
                More than a freelance marketplace—WorkBridge helps businesses hire with confidence through open jobs, protected payments, and trust built from real project outcomes
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Platform</p>
              <ul className="mt-4 space-y-3 text-sm">
                <li><Link to="/find-work" className="transition-colors hover:text-white">Find Work</Link></li>
                <li><Link to="/hire-talent" className="transition-colors hover:text-white">Hire Talent</Link></li>
                <li><Link to="/enterprise" className="transition-colors hover:text-white">Enterprise</Link></li>
                {/* <li><Link to="/jobs" className="transition-colors hover:text-white">Browse Open Jobs</Link></li> */}
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Legal</p>
              <ul className="mt-4 space-y-3 text-sm">
                <li><Link to="/privacy" className="transition-colors hover:text-white">Privacy Policy</Link></li>
                <li><Link to="/terms" className="transition-colors hover:text-white">Terms &amp; Conditions</Link></li>
                <li><Link to="/refund-policy" className="transition-colors hover:text-white">Refund &amp; Cancellation</Link></li>
                <li><Link to="/pricing" className="transition-colors hover:text-white">Pricing</Link></li>
                <li><Link to="/contact" className="transition-colors hover:text-white">Contact Us</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 text-xs text-slate-500 sm:flex-row">
            <p>© {new Date().getFullYear()} Hanbee Technologies Pvt. Ltd. All rights reserved.</p>
            <p>Need help? Sign in and open Support — it's a real, staff-monitored conversation.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
