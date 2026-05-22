import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <article className="max-w-3xl mx-auto prose prose-gray">
        <h1>Terms of Service</h1>
        <p className="text-sm text-gray-500">Last updated: May 2026</p>
        <p>
          These Terms govern your use of DyluxePro CRM (&quot;the Service&quot;) operated by
          DyluxePro. By creating an account or using the Service, you agree to these Terms.
        </p>
        <h2>1. Service</h2>
        <p>
          DyluxePro provides contractor CRM tools including client management, estimates,
          invoices, scheduling, and optional AI-assisted estimate features. Features may
          change over time.
        </p>
        <h2>2. Accounts</h2>
        <p>
          You are responsible for safeguarding your login credentials and for all activity
          under your account. You must provide accurate registration information.
        </p>
        <h2>3. Subscriptions &amp; billing</h2>
        <p>
          Paid plans are billed through Stripe. Fees are charged according to the plan you
          select. You may cancel via the customer portal; access continues until the end of
          the billing period unless otherwise stated.
        </p>
        <h2>4. Acceptable use</h2>
        <p>
          You may not misuse the Service, attempt unauthorized access, send spam, or upload
          unlawful content. We may suspend accounts that violate these rules.
        </p>
        <h2>5. Limitation of liability</h2>
        <p>
          The Service is provided &quot;as is.&quot; To the fullest extent permitted by law,
          DyluxePro is not liable for indirect or consequential damages arising from use of
          the Service.
        </p>
        <h2>6. Contact</h2>
        <p>
          Questions:{" "}
          <a href="mailto:support@dyluxepro.com">support@dyluxepro.com</a> or{" "}
          <Link href="/contact">contact form</Link>.
        </p>
        <p>
          <Link href="/">← Back to home</Link>
        </p>
      </article>
    </div>
  );
}
