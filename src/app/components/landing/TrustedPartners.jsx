// Real, built trust pillars — not company logos. WorkBridge doesn't have
// disclosable enterprise partners to name yet, and this app's whole
// philosophy (see LandingPage.jsx's WallOfLove — live reviews, nothing
// written by us) is real data or nothing. Every claim below is something
// this platform actually does, not a number we'd have to make up.
const TRUST_SIGNALS = [
  "ID-Verified Pros",
  "Protected Payments",
  "Real Dispute Resolution",
  "Behavior-Score Trust System",
  "Instant Payouts",
  "Transparent Hiring",
];

// Items are duplicated so the CSS loop transition is seamless
const TRACK = [...TRUST_SIGNALS, ...TRUST_SIGNALS];

export function TrustedPartners() {
  return (
    <div className="wb-partners">
      <p className="wb-partners-label">THE WORKBRIDGE GUARANTEE</p>
      <div className="wb-partners-viewport">
        <div className="wb-partners-track">
          {TRACK.map((name, i) => (
            <span key={i} className="wb-partner-chip">{name}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
