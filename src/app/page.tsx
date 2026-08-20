"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { LogIn, Mail, Star } from "lucide-react";
import { HeroVideoLoop } from "@/components/marketing/hero-video-loop";
import { SupportChatWidget } from "@/components/marketing/support-chat";

const copy = {
  en: {
    french: "Français",
    login: "Log in",
    clientLogin: "Client login",
    clientLoginHint: "Invited clients sign in to the Client Hub.",
    workflow: "Workflow",
    pricing: "Pricing",
    contact: "Contact",
    startFree: "Start free",
    seePlans: "See plans",
    headline: "Quotes out. Crews booked. Paid.",
    sub: "The job desk for contractors — clients, estimates, schedules, and invoices in one place so your crew stays on the tools, not in email threads.",
    noCard: "No credit card required. Cancel anytime.",
    trust1Title: "Built for the field",
    trust1Body: "Estimates, jobs, and invoices that match how crews work",
    trust2Title: "Setup in minutes",
    trust2Body: "Import clients and send your first estimate the same day",
  },
  fr: {
    french: "English",
    login: "Connexion",
    clientLogin: "Espace client",
    clientLoginHint: "Les clients invités se connectent au portail.",
    workflow: "Flux de travail",
    pricing: "Tarifs",
    contact: "Contact",
    startFree: "Essai gratuit",
    seePlans: "Voir les forfaits",
    headline: "Soumissions envoyées. Équipes planifiées. Payé.",
    sub: "Le bureau de chantier pour entrepreneurs — clients, estimations, horaires et factures au même endroit, pour que votre équipe reste sur le terrain.",
    noCard: "Aucune carte de crédit requise. Annulez en tout temps.",
    trust1Title: "Conçu pour le terrain",
    trust1Body: "Estimations, jobs et factures adaptés au travail des équipes",
    trust2Title: "Prêt en quelques minutes",
    trust2Body: "Importez vos clients et envoyez votre première estimation le jour même",
  },
} as const;

export default function Home() {
  const [lang, setLang] = useState<"en" | "fr">("en");
  const t = copy[lang];

  return (
    <div className="mkt-page min-h-screen bg-[var(--mkt-ink)]" lang={lang}>
      <header className="relative z-20">
        {/* Utility bar — Jobber-style, no hard rules */}
        <div className="bg-[var(--mkt-utility)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-end">
            <div className="mkt-utility flex items-center gap-3.5 text-[15px] font-bold text-white">
              <button
                type="button"
                onClick={() => setLang((prev) => (prev === "en" ? "fr" : "en"))}
                className="hover:text-white/90 transition-colors"
              >
                {t.french}
              </button>
              <span
                className="inline-block h-3.5 w-px bg-white/40"
                aria-hidden
              />
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 hover:text-white/90 transition-colors"
              >
                {t.login}
                <LogIn className="h-4 w-4 opacity-90" aria-hidden />
              </Link>
              <span
                className="inline-block h-3.5 w-px bg-white/40"
                aria-hidden
              />
              <Link
                href="/portal/login"
                className="hover:text-white/90 transition-colors"
              >
                {t.clientLogin}
              </Link>
            </div>
          </div>
        </div>

        {/* Main nav — whitespace only, no border line */}
        <div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <Link
              href="/"
              className="mkt-brand inline-flex items-center gap-2.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--mkt-signal)]"
            >
              <Image
                src="/logo.png"
                alt=""
                width={40}
                height={40}
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg"
                priority
              />
              DyluxePro
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm text-white/75">
              <a href="#workflow" className="hover:text-white transition-colors">
                {t.workflow}
              </a>
              <Link href="/subscription" className="hover:text-white transition-colors">
                {t.pricing}
              </Link>
              <Link href="/contact" className="hover:text-white transition-colors">
                {t.contact}
              </Link>
            </nav>

            <Link
              href="/signup"
              className="mkt-cta-primary !min-h-0 !py-2 !px-3.5 !text-sm !shadow-none"
            >
              {t.startFree}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — text over ambient background video */}
      <section className="mkt-grain relative overflow-hidden bg-[var(--mkt-ink)] min-h-[85vh]">
        <HeroVideoLoop />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-14 lg:pt-10 lg:pb-16">
          <div className="max-w-xl lg:max-w-[540px]">
              <h1 className="mkt-display text-[clamp(2.4rem,5.4vw,3.75rem)] font-extrabold leading-[1.02] tracking-tight text-white mb-5">
                {t.headline}
              </h1>
              <p className="text-base sm:text-lg text-white/65 leading-relaxed mb-8 max-w-md">
                {t.sub}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-3.5">
                <Link href="/signup" className="mkt-cta-primary flex-1 sm:flex-none sm:min-w-[11.5rem]">
                  {t.startFree}
                </Link>
                <Link
                  href="/subscription"
                  className="mkt-cta-secondary flex-1 sm:flex-none sm:min-w-[11.5rem]"
                >
                  {t.seePlans}
                </Link>
              </div>

              <p className="mt-3 text-sm text-white/50">{t.noCard}</p>
              <p className="mt-2 text-sm text-white/45">
                {t.clientLoginHint}{" "}
                <Link href="/portal/login" className="text-white/80 underline underline-offset-2 hover:text-white">
                  {t.clientLogin}
                </Link>
              </p>

              {/* Trust at the decision point */}
              <div className="mt-8 flex flex-wrap gap-6 sm:gap-10">
                <div>
                  <div className="flex items-center gap-1.5 text-[var(--mkt-signal)]">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-current"
                        strokeWidth={0}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-white">
                    {t.trust1Title}
                  </p>
                  <p className="text-xs text-white/50">{t.trust1Body}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[var(--mkt-signal)]">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-current"
                        strokeWidth={0}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-white">
                    {t.trust2Title}
                  </p>
                  <p className="text-xs text-white/50">{t.trust2Body}</p>
                </div>
              </div>
          </div>
        </div>
      </section>

      {/* Next section — one job */}
      <section
        id="workflow"
        className="relative bg-[var(--mkt-paper)] text-[var(--mkt-ink)] py-20 sm:py-24"
      >
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(20,17,15,0.12) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="mkt-display text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              One desk for the whole job
            </h2>
            <p className="text-lg text-[var(--mkt-ink)]/65">
              Quote it, schedule it, finish it, get paid — without jumping between
              five apps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-10">
            {[
              {
                step: "01",
                title: "Win the work",
                body: "Build sharp estimates, send them in a tap, and chase approvals before the lead goes cold.",
              },
              {
                step: "02",
                title: "Run the crew",
                body: "Turn approved jobs into a calendar your team can actually follow from the truck.",
              },
              {
                step: "03",
                title: "Collect the check",
                body: "Invoice from the same record you estimated — less retyping, fewer lost payments.",
              },
            ].map((item) => (
              <div key={item.step} className="border-t-2 border-[var(--mkt-ink)] pt-5">
                <p className="mkt-brand text-sm font-bold text-[var(--mkt-signal-ink)] mb-2">
                  {item.step}
                </p>
                <h3 className="mkt-display text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-[var(--mkt-ink)]/70 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-md bg-[var(--mkt-ink)] px-6 py-3 text-sm font-bold text-[var(--mkt-paper)] hover:bg-black transition"
            >
              Start free
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-md border border-[var(--mkt-ink)]/25 px-6 py-3 text-sm font-semibold text-[var(--mkt-ink)] hover:bg-black/5 transition"
            >
              Talk with us
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--mkt-ink-elevated)] border-t border-white/8 py-12 text-white/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <p className="mkt-brand inline-flex items-center gap-2 text-xl font-extrabold text-[var(--mkt-signal)] mb-3">
                <Image
                  src="/logo.png"
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-md"
                />
                DyluxePro
              </p>
              <p className="text-sm leading-relaxed text-white/55">
                Contractor CRM for quotes, crews, and getting paid.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-3">Product</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#workflow" className="hover:text-white transition-colors">
                    Workflow
                  </a>
                </li>
                <li>
                  <Link href="/subscription" className="hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-white transition-colors">
                    Start free
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Contractor login
                  </Link>
                </li>
                <li>
                  <Link href="/portal/login" className="hover:text-white transition-colors">
                    Client login
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-3">Company</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-3">Support</p>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-[var(--mkt-signal)]" />
                <a
                  href="mailto:support@dyluxepro.com"
                  className="hover:text-white transition-colors"
                >
                  support@dyluxepro.com
                </a>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/8 text-center text-xs text-white/40">
            © {new Date().getFullYear()} DyluxePro. All rights reserved.
          </div>
        </div>
      </footer>

      <SupportChatWidget />
    </div>
  );
}
