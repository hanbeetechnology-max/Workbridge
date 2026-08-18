import LegalPageLayout, { LegalSection } from "../components/common/LegalPageLayout";

// Grounded in the same real mechanics TermsPage.jsx §4/§7 already describe
// (project status flow, the Ghosting Failsafe, admin-reviewed disputes) —
// this page exists specifically because a payment gateway application asks
// "what happens if a project is cancelled," not as generic boilerplate.
export default function RefundCancellationPage() {
  return (
    <LegalPageLayout
      title="Refund & Cancellation Policy"
      lastUpdated="August 14, 2026"
      intro="How cancellations, refunds, and disputes actually work on WorkBridge's Secured Funds system — including what happens before and after a project is funded."
    >
      <LegalSection id="overview" title="1. Overview">
        <p>
          WorkBridge holds a Business's project budget as Secured Funds once it's verified as funded, and only
          releases it to the Worker once the Business approves the delivered work. All Secured Funds cancellations, refund
          calculations, and dispute disbursements on WorkBridge are arbitrated and administered by Hanbee
          Technologies, the company that operates the Platform, and executed back to the original funding source
          through our registered Payment Partners once live payment processing is integrated. This page explains
          what happens to that money if a project is cancelled at any stage, instead.
        </p>
      </LegalSection>

      <LegalSection id="before-funding" title="2. Cancellation Before Funds Are Secured">
        <p>
          Before a Business provides Secured Funds, no money has moved — cancelling an invite, application, or an accepted
          project at this stage is free and immediate for either party. Nothing to refund, since nothing was charged.
        </p>
      </LegalSection>

      <LegalSection id="after-funding" title="3. Cancellation After Funds Are Secured">
        <p>
          Once a Business's transfer is verified and the project is marked Funds Secured, that budget is genuinely
          held as Secured Funds. From this point, a project can end one of three ways:
        </p>
        <ul>
          <li><strong>Approved on completion</strong> — funds release to the Worker, minus our platform fee (see our <a href="/terms">Terms &amp; Conditions</a>).</li>
          <li><strong>The Ghosting Failsafe</strong> — if the Worker never delivers by the real project deadline, the Business can cancel and receive a full refund of the held Secured Funds, approved instantly and without an admin review; the refunded amount is returned to the original funding source within 5–7 business days.</li>
          <li><strong>A raised dispute</strong> — see Section 5 below.</li>
        </ul>
      </LegalSection>

      <LegalSection id="momentum-shield" title="4. Momentum Shield">
        <p>
          Momentum Shield is a Worker-purchased perk (paid for with Bridge Tokens, WorkBridge's in-app currency —
          never real money) that protects one specific active, funded project from the Ghosting Failsafe above. If a
          Worker's shield is active on a project, the Business's one-click Ghosting cancellation is blocked for that
          project while the shield lasts — instead, any cancellation request is routed directly to the Hanbee
          Technologies Admin Dispute Resolution team for a formal review (Section 5). The shield does not block a
          formally raised dispute — it only prevents the instant, no-review cancellation path.
        </p>
      </LegalSection>

      <LegalSection id="disputes" title="5. Dispute Resolution & Refunds">
        <p>
          If the Business and Worker disagree about a cancellation, the quality of delivered work, or anything else
          affecting the Secured Funds, either party can raise a dispute directly from the project. This freezes the held
          funds immediately — neither an automatic refund nor an automatic release happens at this point.
        </p>
        <p>
          A Hanbee Technologies admin then reviews both sides' account of what happened — including the actual
          workspace communication logs and any submitted deliverables — and makes a real, human decision: either
          releasing the funds to the Worker in full, or refunding them to the Business in full. There is no fixed
          turnaround time we guarantee today, since every dispute is reviewed individually rather than resolved by
          a formula.
        </p>
      </LegalSection>

      <LegalSection id="business-cancellation" title="6. Business-Initiated Cancellation Without a Missed Deadline">
        <p>
          A Business that wants to cancel a funded project before its deadline has passed — where the Worker hasn't
          done anything wrong — should raise a dispute (Section 5) rather than use the Ghosting Failsafe, which is
          gated specifically on the deadline having passed. An admin reviewing that dispute can approve a refund
          where warranted.
        </p>
      </LegalSection>

      <LegalSection id="non-refundable" title="7. What's Not Refundable">
        <p>
          Bridge Tokens / Corporate Credits spent on Perks Shop visibility boosts (Flash Post, Gold Highlight, and
          similar) are consumed the moment their real effect applies (e.g. a shortlist is generated, a broadcast is
          sent) and are not refundable — the same way a promoted-listing fee on any marketplace isn't returned once
          the promotion has run.
        </p>
      </LegalSection>

      <LegalSection id="payment-gateway-note" title="8. A Note on Live Payments">
        <p>
          As described in our <a href="/terms">Terms &amp; Conditions</a> §5, WorkBridge does not yet have a live,
          automated payment gateway — every deposit and Worker payout today is manually verified and processed by
          the Hanbee Technologies operations team, not moved automatically by a card or bank network. Once
          automated processing is integrated, refunds and releases will be sent back to the original funding
          source directly. This page describes the real rules those refunds and releases follow today; it will be
          updated the moment that automated processing goes live.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="9. Questions About a Refund">
        <p>
          If you're a signed-in user, the fastest way to reach us about a specific project is the Support tab in
          your dashboard. You can also reach us using the details on our <a href="/contact">Contact Us</a> page.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
