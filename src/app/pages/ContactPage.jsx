import LegalPageLayout, { LegalSection } from "../components/common/LegalPageLayout";

// Address/email/phone below are placeholders only, called out explicitly in-page —
// swap them for real business details before using this page in any compliance
// or payment-gateway submission.
export default function ContactPage() {
  return (
    <LegalPageLayout
      title="Contact Us"
      lastUpdated="August 14, 2026"
      intro="How to reach WorkBridge Technologies Pvt. Ltd."
    >
      <LegalSection id="support" title="1. In-App Support (Fastest)">
        <p>
          If you already have a WorkBridge account, the fastest way to reach us is the Support tab in your
          dashboard once signed in — it's a real, staff-monitored conversation, not a bot.
        </p>
      </LegalSection>

      <LegalSection id="details" title="2. Business & Contact Details">
        <p>
          <em>
            The details below are placeholders pending our registered office and support contact rollout — they
            will be replaced with real, verified details before this page is used for any official or
            compliance-facing purpose.
          </em>
        </p>
        <ul>
          <li><strong>Legal entity:</strong> Hanbee Technologies Pvt. Ltd.</li>
          <li><strong>Registered address:</strong> [PLACEHOLDER — registered office address, India]</li>
          <li><strong>Support email:</strong> [PLACEHOLDER — e.g. support@hanbee.in]</li>
          <li><strong>Phone:</strong> [PLACEHOLDER — support phone number]</li>
          <li><strong>Support hours:</strong> [PLACEHOLDER — e.g. Mon–Sat, 10:00–18:00 IST]</li>
        </ul>
      </LegalSection>

      <LegalSection id="other-pages" title="3. Related Pages">
        <p>
          For how refunds and cancellations work, see our <a href="/refund-policy">Refund &amp; Cancellation
          Policy</a>. For our fee and payment policy and full terms, see our <a href="/terms">Terms &amp;
          Conditions</a>, and for how we handle your data, see our <a href="/privacy">Privacy Policy</a>.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
