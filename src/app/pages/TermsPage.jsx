import LegalPageLayout, { LegalSection } from "../components/common/LegalPageLayout";

// Same structural upgrade as PrivacyPolicyPage.jsx — defined terms, numbered
// clauses, a real Prohibited Conduct list — grounded in the platform's real
// mechanics (project status flow, admin dispute resolution, tier-based
// fees, behavior score) rather than a generic template. Section 5 in
// particular says plainly that no live payment gateway is integrated yet —
// WorkBridge is early access, and a Terms page that implied an automated,
// instant payout would misrepresent how money actually moves today. That
// stays true regardless of how "enterprise" the rest of the page reads.
//
// When a real payment processor IS integrated: refer to it in user-facing
// copy (here, PrivacyPolicyPage.jsx, RefundCancellationPage.jsx, anywhere
// else) as "Payment Partners" rather than naming the specific vendor —
// product decision, not a technical constraint.
export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms & Conditions"
      lastUpdated="August 17, 2026"
      intro="These terms cover how WorkBridge actually works today — including what's still early access — not just boilerplate language."
    >
      <LegalSection id="acceptance" title="1. Acceptance & Eligibility">
        <p>WorkBridge is a Platform operated and powered by Hanbee Technologies ("<strong>Company</strong>", "<strong>we</strong>", "<strong>us</strong>", "<strong>our</strong>"). Hanbee Technologies is responsible for the Platform's hosting, verification systems, dispute administration, and day-to-day maintenance. By creating a WorkBridge account, you agree to these Terms and our Privacy Policy. You must be at least 18 years old and provide accurate account information. You're responsible for all activity that happens under your account.</p>
      </LegalSection>

      <LegalSection id="definitions" title="2. Definitions">
        <ul>
          <li><strong>Company</strong> — Hanbee Technologies, the entity that develops, operates, and maintains the WorkBridge Platform, including hosting, verification review, and dispute administration.</li>
          <li><strong>Platform</strong> — the WorkBridge website, applications, and services collectively, operated by the Company.</li>
          <li><strong>Worker</strong> — a User registered to find and deliver freelance work.</li>
          <li><strong>Business</strong> — a User registered to post Projects and hire Workers.</li>
          <li><strong>Project</strong> — a unit of work posted by a Business and tracked through its real status lifecycle on the Platform.</li>
          <li><strong>Secured Funds</strong> — the held state of a Project's budget from verified funding until the work is approved and released.</li>
        </ul>
      </LegalSection>

      <LegalSection id="user-obligations" title="3. User Obligations">
        <h3>3.1 Businesses</h3>
        <p>A Business may post Projects to the open board or invite a specific Worker directly. A Business account must complete our admin-reviewed verification flow before it can post jobs. A Business agrees to provide Secured Funds in good faith and to review submitted work in a timely manner.</p>

        <h3>3.2 Workers</h3>
        <p>A Worker may apply to open Projects or accept direct invites. A Worker agrees to deliver work that genuinely matches what was agreed, and to use the Platform's submission and messaging systems as intended rather than attempting to route around them.</p>
      </LegalSection>

      <LegalSection id="how-a-project-works" title="4. How a Project Works">
        <ul>
          <li>A Business invites a Worker, or a Worker applies to an open Project.</li>
          <li>Once accepted, the Business funds 100% of the agreed Project budget upfront — verified and marked as Secured Funds before work begins.</li>
          <li>The Worker submits completed work; the Business reviews it and either approves it or requests a revision.</li>
          <li>On approval, funds are released to the Worker's wallet, minus our platform fee.</li>
          <li>Either party can then leave a public review of the other.</li>
        </ul>
      </LegalSection>

      <LegalSection id="payments-secured-funds" title="5. Payments & Secured Funds (Early Access)">
        <p>
          WorkBridge's Secured Funds workflow is designed to be facilitated through RBI-authorized, licensed
          third-party Payment Gateway and Banking Partners ("<strong>Payment Partners</strong>"). WorkBridge is
          currently in early access, though: Secured Funds status, wallet balances, platform fees, and
          transaction history are all tracked as real records in our system, and funds must be deposited and
          verified before work on a Project begins, but <strong>we do not yet have a live automated payment
          gateway connecting to a bank or card network</strong> — no money moves automatically through WorkBridge
          today.
        </p>
        <p>
          Until that integration goes live, ledger balances, Secured Funds status, and every Project's
          money-movement state are strictly verified and managed directly by the Hanbee Technologies operations
          team. When a Business provides Secured Funds, our team verifies the transfer before the Project is
          marked secured. When a
          Worker requests a withdrawal, our team reviews the request and pays it out directly to the UPI ID or bank
          account provided. Payouts are processed promptly once approved, but remain subject to that manual
          verification step. We will update this section the moment a live Payment Partner integration is in
          place.
        </p>
      </LegalSection>

      {/* Product/eng-drafted disclosure, not legal advice — get real lawyer
          review on this section's wording before it ships to production. */}
      <LegalSection id="platform-fees" title="6. Platform Fees">
        <p>
          Hanbee Technologies, operating the WorkBridge Platform, retains a flat 15% platform fee on every
          completed Project, deducted automatically from the Worker's payout at the moment funds are released.
          This fee is not added on top of the budget a Business funds — a Business is never charged more than the
          Project budget they deposit as Secured Funds. The fee supports platform operations, trust &amp; safety
          review, dispute resolution, and payment verification.
        </p>
        <p>
          This fee is not itemized as a separate line in the app's invoices, wallet, or payment screens — the
          amount a Business pays and the amount a Worker receives are each shown as a single, final figure. This
          section is WorkBridge's disclosure of record for how that figure is calculated.
        </p>
      </LegalSection>

      <LegalSection id="dispute-resolution" title="7. Dispute Resolution">
        <p>A Project can be cancelled by either party before it's marked complete. If a deliverable deadline is missed, or the two sides disagree about the quality of work, a cancellation, or anything else affecting the Secured Funds, either party can raise a dispute — this opens a real ticket reviewed by our admin team, not an automated formula.</p>
        <p>Funds stay frozen the moment a dispute is raised until a WorkBridge admin reviews the situation and decides whether to release funds to the Worker or refund the Business. This is a human decision made after reviewing both sides' account of what happened.</p>
      </LegalSection>

      <LegalSection id="trust-safety" title="8. Trust, Safety & Behavior Score">
        <p>Every account has a Behavior Score reflecting real activity and conduct on the Platform. WorkBridge enforces a zero-tolerance policy on sharing off-Platform contact information (phone numbers, personal email addresses, direct bank/payment links, or any other contact method) inside Project chat to move communication or payment off-Platform — any attempt is blocked automatically and may affect your standing. Serious or repeated violations can lead to a warning, suspension, or account ban, at our admin team's discretion.</p>
      </LegalSection>

      <LegalSection id="reviews" title="9. Reviews">
        <p>Reviews are tied to a specific completed Project and are shown publicly, attached to the reviewer's name. Don't post reviews that are false, abusive, or written about a Project that didn't happen.</p>
      </LegalSection>

      <LegalSection id="business-verification" title="10. Business Verification">
        <p>Business verification today is a status reviewed and approved by our admin team based on your account information. It is not currently a substitute for your own independent diligence on who you're working with.</p>
      </LegalSection>

      <LegalSection id="preview-features" title="11. Features Shown As Preview">
        <p>Some parts of WorkBridge — like the Billing & Payments page's Subscription Plans and Trust & Verification tabs, or the Company Profile's activity stats — are shown as an honestly-labeled preview of what we're building toward. They are not currently active, charged, or backed by live data unless explicitly stated otherwise on the page itself.</p>
      </LegalSection>

      <LegalSection id="prohibited-conduct" title="12. Prohibited Conduct">
        <p>You agree that your use of the Platform will not:</p>
        <ul>
          <li>Circumvent WorkBridge to pay or be paid outside the Platform for work arranged here.</li>
          <li>Involve harassment, fraud, or providing false verification information.</li>
          <li>Attempt to access another account, or bypass a suspension or ban.</li>
          <li>Attempt to probe, scan, or test the vulnerability of the Platform, or interfere with its proper operation.</li>
          <li>Use automated means to scrape or crawl content from the Platform without our prior written permission.</li>
          <li>Impersonate any other person or entity, or misrepresent your affiliation with one.</li>
          <li>Upload or transmit content that is unlawful, threatening, abusive, defamatory, or otherwise objectionable.</li>
          <li>Reproduce, resell, or otherwise commercially exploit the Platform or its content without our prior written consent.</li>
        </ul>
      </LegalSection>

      <LegalSection id="suspension" title="13. Suspension & Termination">
        <p>We can suspend or ban an account for violating these Terms. You can deactivate your own account at any time from Settings → Danger Zone; this is reversible by contacting Support.</p>
      </LegalSection>

      <LegalSection id="disclaimer" title="14. Disclaimer & Limitation of Liability">
        <p>WorkBridge is provided "as is." We mediate disputes in good faith but don't guarantee a particular outcome. To the fullest extent the law allows, WorkBridge is not liable for indirect or consequential damages arising from your use of the Platform, including from the conduct of other Users.</p>
      </LegalSection>

      <LegalSection id="governing-law" title="15. Governing Law & Disputes">
        <p>Hanbee Technologies, the Company operating the WorkBridge Platform, is an Indian company, and these Terms are governed by the laws of India. Any dispute arising out of your use of the Platform that cannot be resolved directly through our Support team will be subject to the exclusive jurisdiction of the courts of India.</p>
      </LegalSection>

      <LegalSection id="changes" title="16. Changes to These Terms">
        <p>We may update these Terms as the Platform evolves — especially as payments and verification move from early access to fully live. We'll update the "Last updated" date above when we do.</p>
      </LegalSection>

      <LegalSection id="contact" title="17. Contact Us">
        <p>Questions about these Terms? Use the Support tab in your WorkBridge dashboard — it's a real, staff-monitored conversation.</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
