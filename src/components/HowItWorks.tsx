import React from "react";
import Link from "next/link";
import { UserPlus, Search, Handshake } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create your account",
    description:
      "Sign up in minutes. Set your preferred location and the categories you care about — we'll tailor your experience around you.",
    accent: "bg-primary/10 text-primary",
  },
  {
    number: "02",
    icon: Search,
    title: "List or browse items",
    description:
      "Post items you no longer need with a photo and description, or browse hundreds of free donations from people in your community.",
    accent: "bg-blue-50 text-blue-600",
  },
  {
    number: "03",
    icon: Handshake,
    title: "Connect & collect",
    description:
      "Send a request or receive one. Coordinate a simple pickup and make someone's day — no money, no hassle.",
    accent: "bg-amber-50 text-amber-600",
  },
];

export default function HowItWorks() {
  return (
    <section className="w-full py-20 bg-gray-50 relative overflow-hidden">
      {/* Subtle decorative line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

      <div className="container max-w-6xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="max-w-xl mb-16">
          <div className="inline-flex items-center gap-2 bg-primary-light text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-5 tracking-wide uppercase">
            Simple process
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
            How Givny works
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Three simple steps to start giving and receiving in your community.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 group"
              >
                {/* Connector arrow (desktop) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:flex absolute top-10 -right-3 z-10 items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-400">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                      <path d="M8.293 3.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L10.586 9H3a1 1 0 010-2h7.586L8.293 4.707a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                )}

                {/* Step number */}
                <div className="text-5xl font-bold text-gray-100 leading-none select-none mb-4 group-hover:text-primary/10 transition-colors">
                  {step.number}
                </div>

                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-5 ${step.accent}`}>
                  <Icon className="w-5 h-5" />
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-wrap gap-4 items-center">
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3.5 rounded-full font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all text-sm shadow-md shadow-primary/20"
          >
            Join the community
          </Link>
          <Link
            href="/explore"
            className="text-sm text-primary font-medium hover:underline underline-offset-4 transition-all"
          >
            Browse donations →
          </Link>
        </div>
      </div>
    </section>
  );
}
