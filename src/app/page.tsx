"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  FileText,
  Zap,
  ArrowRight,
  Mail,
} from "lucide-react";

const ROTATING_WORDS = ["faster.", "smarter.", "easier."];

export default function Home() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((i) => (i + 1) % ROTATING_WORDS.length);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-transparent tracking-tight">
                  DyluxePro
                </h1>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  href="#features"
                  className="text-gray-700 hover:text-teal-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Features
                </Link>
                <Link
                  href="/contact"
                  className="text-gray-700 hover:text-teal-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Contact
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden isolate">
        {/* Animated aurora backdrop */}
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div
            className="aurora-blob"
            style={{
              top: "-10%",
              left: "-10%",
              width: "560px",
              height: "560px",
              background:
                "radial-gradient(circle at center, rgba(13, 148, 136, 0.55), rgba(13, 148, 136, 0) 70%)",
            }}
          />
          <div
            className="aurora-blob aurora-blob-alt"
            style={{
              top: "20%",
              right: "-15%",
              width: "640px",
              height: "640px",
              background:
                "radial-gradient(circle at center, rgba(6, 182, 212, 0.45), rgba(6, 182, 212, 0) 70%)",
              animationDelay: "-6s",
            }}
          />
          <div
            className="aurora-blob"
            style={{
              bottom: "-20%",
              left: "20%",
              width: "480px",
              height: "480px",
              background:
                "radial-gradient(circle at center, rgba(16, 185, 129, 0.4), rgba(16, 185, 129, 0) 70%)",
              animationDelay: "-12s",
            }}
          />
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(15,23,42,1) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,1) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center">
            <div
              className="hero-fade inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/80 px-4 py-1.5 text-sm font-medium text-teal-700 mb-6"
              style={{ animationDelay: "0.05s" }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500"></span>
              </span>
              Built for contractors. Loved by their crews.
            </div>

            <h1
              className="hero-fade text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 tracking-tight"
              style={{ animationDelay: "0.15s" }}
            >
              Close more jobs,{" "}
              <span className="relative inline-block min-w-[6.5ch] text-left">
                {ROTATING_WORDS.map((w, i) => (
                  <span
                    key={w}
                    className={`gradient-text absolute left-0 top-0 transition-all duration-500 ease-out ${
                      i === wordIndex
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 -translate-y-3"
                    }`}
                    aria-hidden={i !== wordIndex}
                  >
                    {w}
                  </span>
                ))}
                {/* Invisible placeholder uses longest word to reserve width */}
                <span className="invisible">
                  {ROTATING_WORDS.reduce((a, b) => (a.length >= b.length ? a : b))}
                </span>
              </span>
            </h1>

            <p
              className="hero-fade text-lg md:text-xl text-gray-600 mb-10 max-w-3xl mx-auto"
              style={{ animationDelay: "0.25s" }}
            >
              Organize clients, send estimates, and automate follow-ups — all in one place.
              The CRM built specifically for contractors.
            </p>

            <div
              className="hero-fade flex flex-col sm:flex-row gap-4 justify-center"
              style={{ animationDelay: "0.35s" }}
            >
              <Button
                size="lg"
                className="bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/20 hover:shadow-xl hover:shadow-teal-600/30 transition-all hover:-translate-y-0.5"
                asChild
              >
                <Link href="/signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>

            <div
              className="hero-fade mt-6 text-sm text-gray-500"
              style={{ animationDelay: "0.45s" }}
            >
              No credit card required · Cancel anytime · 14-day free trial
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              Everything you need to grow your business
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Streamline your contractor operations with powerful tools designed for your trade.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Organize Clients",
                desc: "Keep all client information, project history, and communication in one place. Never lose track of a lead again.",
              },
              {
                icon: FileText,
                title: "Send Estimates",
                desc: "Create professional estimates in minutes. Track approval status and follow up automatically with built-in reminders.",
              },
              {
                icon: Zap,
                title: "Automate Workflows",
                desc: "Set up automated follow-ups, thank you emails, and task reminders. Focus on the work while we handle the admin.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <Card
                key={title}
                className="stagger-item group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl flex items-center justify-center mb-4 ring-1 ring-teal-100 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6 text-teal-600" />
                  </div>
                  <CardTitle className="text-xl">{title}</CardTitle>
                  <CardDescription className="text-base">{desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              See DyluxePro in action
            </h2>
            <p className="text-lg text-gray-600">
              Get a glimpse of your new workflow with our intuitive dashboard.
            </p>
          </div>

          <div className="relative">
            {/* Glow behind preview */}
            <div
              className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-teal-400/20 via-cyan-400/20 to-emerald-400/20 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-float">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-teal-400 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-500">DyluxePro CRM Dashboard</div>
                </div>
              </div>
              <div className="p-4 md:p-8">
                <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                  <div className="grid grid-cols-5 gap-4 md:gap-6 min-w-[800px] md:min-w-0">
                    {["New Leads", "Estimate Sent", "Approved", "Job Scheduled", "Completed"].map(
                      (stage, index) => (
                        <div key={stage} className="space-y-4 min-w-[140px]">
                          <div className="text-center">
                            <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base whitespace-nowrap">
                              {stage}
                            </h3>
                            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="progress-bar h-1 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                                style={{ width: `${(index + 1) * 20}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {index < 3 && (
                              <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer">
                                <div className="text-sm font-medium text-gray-900 break-words">
                                  Johnson Residence
                                </div>
                                <div className="text-xs text-gray-500 break-words">
                                  123 Oak Street
                                </div>
                                <div className="text-sm font-semibold text-teal-600 mt-1">
                                  $2,450
                                </div>
                              </Card>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-700 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden="true"
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="grid md:grid-cols-3 gap-8 text-white">
            <div className="stagger-item">
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-teal-100">Contractor Companies</div>
            </div>
            <div className="stagger-item">
              <div className="text-4xl font-bold mb-2">$2M+</div>
              <div className="text-teal-100">Revenue Managed</div>
            </div>
            <div className="stagger-item">
              <div className="text-4xl font-bold mb-2">98%</div>
              <div className="text-teal-100">Customer Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent mb-4">
                DyluxePro
              </h3>
              <p className="text-gray-400">
                The CRM built specifically for contractors and trade professionals.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="#features" className="hover:text-white transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-white transition-colors">
                    Sign Up
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/dashboard" className="hover:text-white transition-colors">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/settings" className="hover:text-white transition-colors">
                    Settings
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-gray-400">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  support@dyluxepro.com
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 DyluxePro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
