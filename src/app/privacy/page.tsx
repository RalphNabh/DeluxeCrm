import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <article className="max-w-3xl mx-auto prose prose-gray">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-gray-500">Last updated: May 2026</p>
        <p>
          DyluxePro (&quot;we&quot;) respects your privacy. This policy describes how we
          collect, use, and protect information when you use our CRM at dyluxepro.com.
        </p>
        <h2>Information we collect</h2>
        <ul>
          <li>Account data: name, email, business information you provide at signup.</li>
          <li>CRM data: clients, leads, estimates, invoices, jobs, and files you upload.</li>
          <li>Payment data: processed by Stripe; we do not store full card numbers.</li>
          <li>Usage &amp; errors: optional analytics via Sentry when enabled.</li>
        </ul>
        <h2>How we use information</h2>
        <p>
          We use your data to operate the Service, send transactional emails (estimates,
          invoices, notifications), process subscriptions, and improve reliability and
          security.
        </p>
        <h2>AI features</h2>
        <p>
          If you use AI photo estimates, job-site images are sent to OpenAI for analysis
          under their terms. Images are stored temporarily in Supabase storage and may be
          deleted per our retention policy.
        </p>
        <h2>Third parties</h2>
        <p>
          We use Supabase (database/auth), Vercel (hosting), Stripe (payments), Resend
          (email), Upstash (rate limiting), Cloudflare Turnstile (spam protection), and
          optionally Sentry (error monitoring).
        </p>
        <h2>Your rights</h2>
        <p>
          You may access, export, or delete your CRM data from Settings. Account deletion
          cancels any active paid membership, removes your company data we are not required
          to keep, and deletes your login. To delete your
          auth account entirely, contact{" "}
          <a href="mailto:support@dyluxepro.com">support@dyluxepro.com</a>.
        </p>
        <h2>Contact</h2>
        <p>
          <Link href="/contact">Contact us</Link> or email{" "}
          <a href="mailto:support@dyluxepro.com">support@dyluxepro.com</a>.
        </p>
        <p>
          <Link href="/">← Back to home</Link>
        </p>
      </article>
    </div>
  );
}
