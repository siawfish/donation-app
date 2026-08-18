import React from "react";
import Link from "next/link";
import { UserPlus, Search, Handshake, MapPin, ArrowRight, Leaf } from "lucide-react";

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full py-16 md:py-24 bg-canvas">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-ink leading-[1.08] tracking-tight text-balance max-w-lg">
              Three steps from clutter to community.
            </h2>
          </div>
          <Link
            href="/auth/register"
            className="group inline-flex items-center gap-2 text-ink font-semibold text-sm border-b-2 border-lime pb-1 hover:gap-3.5 transition-all w-fit"
          >
            Join free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Step 1 — large card */}
          <div className="card-hover relative md:row-span-2 bg-forest text-white rounded-3xl p-8 flex flex-col justify-between overflow-hidden min-h-[280px] md:min-h-0">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-lime/10 blur-2xl pointer-events-none" />
            <div>
              <span className="text-lime text-sm font-bold">01</span>
              <h3 className="text-2xl md:text-3xl font-bold mt-3 mb-3 leading-tight">Create your account &amp; pin your spot</h3>
              <p className="text-white/60 text-sm leading-relaxed max-w-xs">
                Sign up in minutes and drop a pin on the map. Everything you see is sorted by how close it is to you.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-lime text-forest">
                <UserPlus className="w-5 h-5" />
              </span>
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 text-lime">
                <MapPin className="w-5 h-5" />
              </span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="card-hover bg-white border border-gray-200/70 rounded-3xl p-8">
            <span className="text-primary text-sm font-bold">02</span>
            <h3 className="text-xl font-bold text-ink mt-3 mb-2">List or browse</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Snap a photo and publish in under two minutes — or browse free items from neighbours nearby.
            </p>
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-primary-light text-primary mt-6">
              <Search className="w-5 h-5" />
            </span>
          </div>

          {/* Step 3 */}
          <div className="card-hover bg-white border border-gray-200/70 rounded-3xl p-8">
            <span className="text-primary text-sm font-bold">03</span>
            <h3 className="text-xl font-bold text-ink mt-3 mb-2">Connect &amp; collect</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Send or accept a request, chat in the app, and arrange a quick local pickup. Done.
            </p>
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-primary-light text-primary mt-6">
              <Handshake className="w-5 h-5" />
            </span>
          </div>

          {/* Impact strip — spans 2 cols */}
          <div className="card-hover md:col-span-2 bg-lime rounded-3xl p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-forest text-lime flex-shrink-0">
                <Leaf className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-xl font-bold text-forest leading-tight">Every item kept in use is waste avoided.</h3>
                <p className="text-forest/70 text-sm mt-1">Givny is free for everyone, forever — no fees, no ads, no catch.</p>
              </div>
            </div>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 bg-forest text-white font-semibold text-sm px-6 py-3.5 rounded-full hover:bg-forest-dark transition-colors flex-shrink-0 w-fit"
            >
              Start browsing <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
