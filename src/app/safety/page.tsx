import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck, MapPin, Ban, MessageCircle, PackageSearch, Flag, BadgeCheck,
} from "lucide-react";
import PublicShell from "@/components/PublicShell";

export const metadata: Metadata = {
  title: "Safety & Trust — Givny",
  description: "How to give and receive safely on Givny: meeting up, staying free, and what to do if something feels wrong.",
};

const guidance: {
  icon: typeof ShieldCheck;
  title: string;
  tips: string[];
}[] = [
  {
    icon: MapPin,
    title: "Meeting up",
    tips: [
      "Choose a public place, like a shop doorway or a community centre, somewhere with people around.",
      "Bring a friend along, or let someone know where you're going and who you're meeting.",
      "Prefer daylight hours where you can.",
      "You don't owe anyone a reason. If a meeting spot doesn't feel right, suggest another or step away.",
    ],
  },
  {
    icon: Ban,
    title: "It's always free, no exceptions",
    tips: [
      "Givny doesn't handle money. No purchase price, no \"deposit\", no \"courier fee\" is ever legitimate.",
      "If anyone asks you to send money, a bank transfer, or gift cards to hold or release an item, that's a scam. Stop the conversation and report it.",
      "The same goes the other way: you'll never be asked to pay to give something away.",
    ],
  },
  {
    icon: MessageCircle,
    title: "Protecting your information",
    tips: [
      "Keep the conversation in Givny messages until you've agreed to meet. It keeps a record and keeps your personal number private for as long as you want.",
      "Share your exact address only once you're comfortable. A nearby landmark works fine for arranging the first meeting.",
      "Be as specific as you're comfortable with about timing, and no more.",
    ],
  },
  {
    icon: PackageSearch,
    title: "Before you commit",
    tips: [
      "Check the item's photos, description and condition match what's listed.",
      "Ask the lister a question first if anything is unclear. That's what \"Ask for it\" is for.",
      "It's fine to change your mind. Passing on something for free doesn't come with any obligation on either side.",
    ],
  },
];

export default function SafetyPage() {
  return (
    <PublicShell>
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 bg-primary-light text-forest text-xs font-bold uppercase tracking-[0.15em] px-4 py-1.5 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            Safety & Trust
          </span>
          <h1 className="text-4xl md:text-5xl font-light text-ink mt-5 mb-4">
            Give and receive with confidence
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Givny puts neighbours directly in touch with each other, with no fees and no
            middleman. That&apos;s what makes it work, and it&apos;s also why a little care goes a long way.
          </p>
        </div>

        {/* Intro card */}
        <div className="bg-sand rounded-3xl p-8 mb-12">
          <p className="text-gray-700 leading-relaxed text-justify mb-0">
            Every listing on Givny is genuinely free, and most exchanges go exactly as
            you&apos;d hope. These are the same habits people already use when meeting anyone
            new from the internet. Nothing exotic, just worth keeping in mind.
          </p>
        </div>

        {/* Guidance grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {guidance.map(({ icon: Icon, title, tips }) => (
            <div key={title} className="bg-white border border-gray-200/70 rounded-3xl p-7">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-10 h-10 rounded-2xl bg-primary-light text-forest flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
                <h2 className="text-lg font-bold text-ink">{title}</h2>
              </div>
              <ul className="space-y-2.5">
                {tips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2.5 text-sm text-gray-600 leading-relaxed text-justify">
                    <span className="w-1.5 h-1.5 rounded-full bg-forest flex-shrink-0 mt-1.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Verified members */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-forest text-white rounded-3xl p-8 mb-10">
          <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 flex-shrink-0">
            <BadgeCheck className="w-6 h-6 text-lime" />
          </span>
          <div>
            <h2 className="text-lg font-bold">Look for the verified badge</h2>
            <p className="text-sm text-white/70 mt-1 leading-relaxed text-justify">
              A verified checkmark next to someone&apos;s name means they&apos;ve confirmed their
              identity with us. It&apos;s one more signal, not a guarantee. The habits above
              still apply either way.
            </p>
          </div>
        </section>

        {/* Reporting */}
        <section className="text-center">
          <Flag className="w-6 h-6 text-gray-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-ink mb-2">Something feels wrong?</h2>
          <p className="text-gray-500 max-w-xl mx-auto leading-relaxed mb-5">
            Trust your instincts. You can always end a conversation, decline a pickup, or
            walk away. If someone asks you for money, pressures you, or a listing looks
            off, tell us about it and we&apos;ll look into it.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 bg-forest text-lime font-bold px-6 py-3 rounded-full hover:brightness-110 transition-all"
          >
            Contact us
          </Link>
        </section>
      </div>
    </PublicShell>
  );
}
