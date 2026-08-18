import LegalPageLayout, { LegalSection } from "../components/common/LegalPageLayout";

// Support email and hours are still placeholders pending rollout — legal
// entity, registered address, and phone are real, confirmed details.
export default function ContactPage() {
  return (
    <LegalPageLayout
      title="Contact Us"
      lastUpdated="August 18, 2026"
      intro="How to reach Hanbee Technologies Private Limited."
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
            Support email and hours below are still placeholders pending rollout — everything else on this list
            is real and confirmed.
          </em>
        </p>
        <ul>
          <li><strong>Legal entity:</strong> Hanbee Technologies Private Limited</li>
          <li><strong>Registered address:</strong> Plot No. 28, 2nd Cross Street, Thiurpur Kumaran Nagar, Thirukkalukundram, Tamil Nadu 603109, India</li>
          <li><strong>Support email:</strong> support@hanbee.in</li>
          <li><strong>Phone:</strong> <a href="tel:+919344477512">+91 93444 77512</a></li>
          <li><strong>Support hours:</strong> Mon–Fri, 10:00–19:00 IST</li>
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
