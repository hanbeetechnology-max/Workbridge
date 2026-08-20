import LegalPageLayout, { LegalSection } from "../components/common/LegalPageLayout";

export default function PricingPage() {
  return (
    <LegalPageLayout
      title="Pricing"
      lastUpdated="August 17, 2026"
      intro="WorkBridge is free to use for both Businesses and Workers."
    >
      <LegalSection id="whats-free" title="1. What's Free">
        <ul>
          <li>Creating an account, as a Business or a Worker</li>
          <li>Posting a job</li>
          <li>Applying to a job or inviting a Worker</li>
          <li>Messaging, file sharing, and project management tools</li>
          <li>Business Verification</li>
          <li>Standard-tier withdrawals</li>
        </ul>
      </LegalSection>

      <LegalSection id="perks-shop" title="2. Perks Shop">
        <p>
          Both Businesses and Workers can optionally spend Bridge Tokens (an in-app currency, not real money) in the
          Perks Shop on things like post visibility boosts or priority queueing for disputes and withdrawals. These
          are optional add-ons layered on top of the free core platform, not required to post, apply, or get paid —
          see the <a href="/refund-policy">Refund &amp; Cancellation Policy</a> for how Perks Shop purchases are
          handled.
        </p>
      </LegalSection>

      <LegalSection id="not-live" title="3. Subscription Plans & Trust Tiers">
        <p>
          WorkBridge is previewing (but has not launched) optional paid Subscription Plans and an expanded Trust &amp;
          Verification tier system. Both are shown in the app as a preview only — nothing is chargeable today, and
          no user is billed for them. This page will be updated with real pricing if and when they launch.
        </p>
      </LegalSection>

      <LegalSection id="payment-gateway-note" title="4. A Note on Live Payments">
        <p>
          As described in our <a href="/terms">Terms &amp; Conditions</a> §5, WorkBridge does not yet have a live,
          automated payment gateway — Secured Funds deposits and Worker payouts are currently verified and processed
          manually by our team.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="5. Questions About Pricing">
        <p>
          If you're a signed-in user, the fastest way to reach us is the Support tab in your dashboard. You can also
          reach us using the details on our <a href="/contact">Contact Us</a> page.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
