import LegalPageLayout, { LegalSection } from "../components/common/LegalPageLayout";

// Structurally modeled on how enterprise SaaS/marketplace privacy policies
// (Naukri's among them) are organized — defined terms, numbered clauses
// broken into sub-points, a real rights/grievance section — but every
// factual claim below is grounded in what this app actually does, verified
// against the codebase rather than written generically. Notably still true
// today: business verification is an admin-reviewed status (no GST/PAN/
// incorporation documents are actually collected or stored yet, even
// though the verification wizard has upload fields for them), and there's
// no payment processor integrated yet — see TermsPage for that disclosure.
// Both are stated honestly rather than glossed over for the sake of
// sounding more "enterprise."
export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="August 14, 2026"
      intro="This page explains what WorkBridge Technologies Pvt. Ltd. collects, why, and who can see it — written to match what the product actually does, not a generic template."
    >
      <LegalSection id="introduction" title="1. Introduction">
        <p>
          WorkBridge is a two-sided project marketplace connecting freelancers with businesses (the
          "<strong>Platform</strong>"), engineered, operated, and maintained by <strong>Hanbee Technologies</strong>
          ("<strong>Company</strong>", "<strong>we</strong>", "<strong>us</strong>", "<strong>our</strong>"). As the
          Platform's data controller and technology provider, Hanbee Technologies is responsible for collecting,
          processing, storing, and securing the personal data described in this Policy — including account
          information, verification details, and communication audit trails. We are committed to protecting the
          personal information of everyone who uses the Platform. This Privacy Policy describes what we collect
          through the Platform, how we use it, and the real controls in place to protect it.
        </p>
        <p>This Policy applies to every person who registers for or otherwise uses the Platform (each, a "<strong>User</strong>").</p>
      </LegalSection>

      <LegalSection id="definitions" title="2. Definitions">
        <ul>
          <li><strong>Worker</strong> — a User registered to find and deliver freelance work.</li>
          <li><strong>Business</strong> — a User registered to post projects and hire Workers.</li>
          <li><strong>Project</strong> — a unit of work posted by a Business, tracked through its own real status lifecycle from open, to assigned, to funded, to completed.</li>
          <li><strong>Secured Funds</strong> — the held state of a Project's budget from the point a Business's funding transfer is verified until the work is approved and released.</li>
          <li><strong>Behavior Score</strong> — a 0–1000 trust metric derived from a User's real conduct on the Platform (delivery history, dispute outcomes, and communication conduct).</li>
        </ul>
      </LegalSection>

      <LegalSection id="information-we-collect" title="3. Information We Collect">
        <h3>3.1 Account Data</h3>
        <p>Name, email address, phone number, and a hashed password when you register. Your role (Worker, Business, or admin) determines what other fields apply to you.</p>

        <h3>3.2 Profile & Financial Data</h3>
        <p>For Workers: title, bio, skills, location, and hourly rate. For Businesses: company name and related company details. An avatar photo and cover image, if you upload one. If you request a withdrawal, the UPI ID or bank account and IFSC details you provide so we can process the payout.</p>

        <h3>3.3 Verification Status</h3>
        <p>Businesses go through a verification flow before posting jobs. Today, verification is a status our admin team reviews and approves based on the account and company information you provide — the document-upload step in that flow (GST certificate, PAN, incorporation documents) is <strong>not yet required or stored</strong>. Once document upload is enabled, any verification or KYC documents you submit (identity documents, PAN, GST, or bank/UPI payout details) are designed to be securely stored, managed, and reviewed directly by Hanbee Technologies and its authorized compliance administrators — we will update this section to reflect the real, live process the moment that changes.</p>

        <h3>3.4 Project & Payment Activity</h3>
        <p>Jobs you post or apply to, Project status history, Secured Funds amounts, platform fees, wallet balance, and transaction records.</p>

        <h3>3.5 Communications</h3>
        <p>See Section 5 (Platform Communications & Messaging Controls) for exactly what is and isn't collected here — it's specific enough to warrant its own section.</p>

        <h3>3.6 Trust & Gamification Data</h3>
        <p>XP, level, streak, Bridge Tokens, and Behavior Score — all generated from your real activity on the Platform, never purchased or fabricated.</p>

        <h3>3.7 Usage Analytics</h3>
        <p>In production, we use PostHog to record page views and key product events (e.g. a job being posted). This is fully disabled in development and only active where explicitly configured.</p>

        <h3>3.8 Sign-In Token</h3>
        <p>When you log in, we store a secure session token (JWT) in your browser's local storage so you stay signed in. This is not a third-party tracking cookie.</p>
      </LegalSection>

      <LegalSection id="how-we-use" title="4. How We Use This Information">
        <ul>
          <li>To operate the core service: matching Workers and Businesses, running Secured-Funds-protected Projects, and releasing funds when work is approved.</li>
          <li>To review business verification requests and maintain trust &amp; safety, including Behavior Scores, admin moderation, dispute resolution, and the chat contact-info filter described below.</li>
          <li>To process withdrawal requests using the payout details you provide.</li>
          <li>To send you one-time verification codes and password-reset codes by email, via our email provider.</li>
          <li>To respond to messages you send WorkBridge Support.</li>
          <li>To understand overall product usage in aggregate, so we know what to fix or improve.</li>
        </ul>
      </LegalSection>

      <LegalSection id="platform-communications" title="5. Platform Communications & Messaging Controls">
        <p>
          WorkBridge's messaging system is deliberately restricted by design, not just by policy — the restriction is
          enforced in our backend on every request, not merely a guideline:
        </p>
        <ul>
          <li>
            When a Worker applies to an open Project, they may attach a <strong>single, one-time application note</strong>.
            This is not a live conversation — there is no back-and-forth messaging before a Business has assigned a
            Worker to a Project.
          </li>
          <li>
            Live, ongoing direct messaging inside a Project is gated to that Project's two actual participants — the
            Business, and the specific Worker who has been formally assigned to it. A Worker who has merely applied
            or been invited, and has not yet been accepted, cannot access that Project's message thread at all.
          </li>
          <li>
            If you attempt to share contact details (phone number, email) inside a Project chat, the attempt is
            automatically blocked by our systems before the message is stored. A record that a blocked attempt
            occurred is kept for Trust &amp; Safety purposes, but the prohibited message content you tried to send is
            not saved.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="visibility" title="6. What's Visible to Other Users">
        <p>Your name, role, avatar, title/bio, and aggregate rating are visible on your public profile. Reviews — written by the other party on a completed Project — are shown publicly with the reviewer's name attached, the same way they'd appear on any marketplace. A small number of real reviews may also be featured on our homepage.</p>
        <p>Your email address and phone number are never included in any public profile or API response — they are structurally excluded at the database level, not just hidden in the interface.</p>
        <p>WorkBridge admins can see full account information, including Project and payment history, when reviewing verification requests, disputes, or security reports.</p>
      </LegalSection>

      <LegalSection id="sharing" title="7. Information Sharing & Disclosure">
        <p>We do not sell your data. We restrict internal access to Personal Information to the Hanbee Technologies staff who reasonably need it to do their jobs. We share information with the following categories of service providers, each bound to use it only to provide their specific service to us:</p>
        <ul>
          <li><strong>Payment Partners</strong> — once live payment processing is integrated, data necessary to complete a transaction or payout (such as amount, UPI ID, or bank account details) will be securely transmitted to licensed, RBI-authorized third-party Payment Gateway and Banking Partners. We do not have a payment processor integrated yet — see our Terms &amp; Conditions §5 for what that means for how payments currently move.</li>
          <li><strong>Render</strong> (Infrastructure Provider) — hosts our application servers and database.</li>
          <li><strong>Resend</strong> (Infrastructure Provider) — delivers OTP and password-reset emails on our behalf.</li>
          <li><strong>PostHog</strong> — production-only product analytics, described in Section 3.7.</li>
        </ul>
        <p>We may also disclose information where required to comply with a legal obligation, such as a court order, or to investigate a suspected violation of our Terms & Conditions.</p>
      </LegalSection>

      <LegalSection id="retention" title="8. Data Retention & Account Deactivation">
        <p>You can deactivate your own account from Settings → Danger Zone. This immediately signs you out and blocks future logins. Because Secured Funds, transaction, and review records reference other Users' history, we do not offer full data erasure today to preserve platform integrity — deactivating is reversible by contacting Support if you change your mind. Your Personal Information is otherwise retained only as long as necessary for the purposes described in this Policy.</p>
      </LegalSection>

      <LegalSection id="security" title="9. Security">
        <p>Passwords are cryptographically hashed and never stored in plain text. Access to the Platform is controlled by strict role-based permissions enforced on every backend request, not just hidden in the interface. Admin actions on accounts, disputes, and verifications are logged in an internal audit trail.</p>
      </LegalSection>

      <LegalSection id="rights" title="10. Your Rights">
        <p>You can review and correct most of your own profile information directly from Settings at any time. For anything else — access to your data, questions about how it's processed, or a request that falls outside what Settings covers — contact us as described in Section 13; we will require proof of your identity before acting on the request.</p>
      </LegalSection>

      <LegalSection id="age" title="11. Age Requirement">
        <p>WorkBridge is intended for people who are at least 18 years old. Don't use the Platform if you're under 18.</p>
      </LegalSection>

      <LegalSection id="changes" title="12. Changes to This Policy">
        <p>We may update, change, or modify this Policy at any time as the Platform evolves. If how we handle your data changes in a meaningful way, we'll update this page and change the "Last updated" date above.</p>
      </LegalSection>

      <LegalSection id="contact" title="13. Contact & Grievance Officer">
        <p>The fastest way to reach us about privacy questions or requests is the Support tab in your WorkBridge dashboard once you're signed in — it's a real, staff-monitored conversation, not a form that disappears into nowhere. For formal grievances regarding this Policy, you may also write to our team via the same Support channel or email us directly at <a href="mailto:support@workbridge.in">support@workbridge.in</a>.</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
