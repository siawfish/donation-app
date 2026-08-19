"use client";

import Link from "next/link";
import { ArrowRight, PackagePlus, MapPin, Sparkles, Search } from "lucide-react";
import { useAuth } from "@/firebase/auth/AuthContext";

export interface HeroCategory {
  id: string;
  name: string;
  count: number;
}

/**
 * Below this, browsing is an unsatisfying experience and the honest ask is for
 * supply rather than demand — so the hero inverts its priorities.
 */
const HEALTHY_INVENTORY = 6;

/**
 * Adaptive hero.
 *
 * Search deliberately does not appear here. It needs the visitor to bring both
 * intent and vocabulary, and on thin inventory it mostly returns nothing — which
 * reads as "this place is empty" rather than "no matches". The navbar carries a
 * permanent search field for people who do arrive with something specific in
 * mind, so putting a second one here spent the most valuable space on the page
 * duplicating it.
 *
 * Instead the hero leads with whichever side of the marketplace is scarce:
 * listings while the shelves are bare, browsing once there is something to find.
 */
export default function Hero({
  totalAvailable = 0,
  categories = [],
}: {
  totalAvailable?: number;
  categories?: HeroCategory[];
}) {
  const { user } = useAuth();
  const listHref = user ? "/app/add-item" : "/auth/register";
  const stocked = totalAvailable >= HEALTHY_INVENTORY;

  const liveCategories = categories.filter((c) => c.count > 0).slice(0, 5);

  return (
    <section className="w-full px-3 sm:px-4 pt-3">
      <div className="forest-panel relative max-w-[1400px] mx-auto rounded-[2rem] md:rounded-[2.5rem] overflow-hidden">
        <div className="relative z-10 px-5 sm:px-10 md:px-16 pt-12 md:pt-24 pb-10 md:pb-16 flex flex-col items-center">

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 border border-white/15 bg-white/5 backdrop-blur-sm text-lime text-xs font-medium px-4 py-1.5 rounded-full mb-8 animate-fade-in-up">
            <Sparkles className="w-3.5 h-3.5" />
            The free community marketplace
          </div>

          {/* Headline */}
          <h1
            className="text-[2.6rem] sm:text-6xl md:text-[5.5rem] font-bold text-white leading-[1] md:leading-[0.98] tracking-tight text-center text-balance max-w-4xl mb-5 md:mb-6 animate-fade-in-up"
            style={{ animationDelay: "80ms" }}
          >
            Everything here{" "}
            <span className="relative inline-block text-lime">
              is free.
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none" preserveAspectRatio="none">
                <path d="M3 9C50 3 150 3 197 8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
              </svg>
            </span>
          </h1>

          {/* Sub-line doubles as live proof once there's stock to point at */}
          <p
            className="text-sm sm:text-base md:text-lg text-white/60 max-w-xl text-center leading-relaxed mb-9 md:mb-10 animate-fade-in-up"
            style={{ animationDelay: "160ms" }}
          >
            {stocked ? (
              <>
                <span className="text-lime font-bold">{totalAvailable} item{totalAvailable === 1 ? "" : "s"}</span>{" "}
                are looking for a new home right now. Find something you need close
                to home, or pass on what you no longer use.
              </>
            ) : (
              <>
                Neighbours giving good things a second life. The shelves are just
                filling up — add something you no longer use and get it seen.
              </>
            )}
          </p>

          {/* Primary action follows whichever side is scarce */}
          <div
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-md sm:max-w-none sm:w-auto animate-fade-in-up"
            style={{ animationDelay: "240ms" }}
          >
            {stocked ? (
              <>
                <Link
                  href="/explore"
                  className="group inline-flex items-center justify-center gap-2.5 bg-lime text-forest font-bold text-base px-8 py-4 rounded-full hover:brightness-95 transition-all"
                >
                  <Search className="w-5 h-5" />
                  Browse what&apos;s nearby
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href={listHref}
                  className="inline-flex items-center justify-center gap-2.5 border border-white/25 text-white font-bold text-base px-8 py-4 rounded-full hover:bg-white/10 transition-colors"
                >
                  <PackagePlus className="w-5 h-5" />
                  List an item
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={listHref}
                  className="group inline-flex items-center justify-center gap-2.5 bg-lime text-forest font-bold text-base px-8 py-4 rounded-full hover:brightness-95 transition-all"
                >
                  <PackagePlus className="w-5 h-5" />
                  {totalAvailable === 0 ? "Be the first to list" : "List an item"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/explore"
                  className="inline-flex items-center justify-center gap-2.5 border border-white/25 text-white font-bold text-base px-8 py-4 rounded-full hover:bg-white/10 transition-colors"
                >
                  Have a look around
                </Link>
              </>
            )}
          </div>

          {/* Category chips are browse without typing — and only ever show
              categories that actually have something in them. */}
          {liveCategories.length > 0 && (
            <div
              className="mt-8 flex flex-wrap items-center justify-center gap-2 animate-fade-in-up"
              style={{ animationDelay: "320ms" }}
            >
              <span className="text-xs text-white/40 mr-1">Jump to</span>
              {liveCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/explore?cid=${encodeURIComponent(cat.id)}`}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-white/15 text-white/70 hover:text-forest hover:bg-lime hover:border-lime text-xs font-medium transition-all duration-200"
                >
                  {cat.name}
                  <span className="text-[10px] opacity-60">{cat.count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Marquee ticker ── */}
        <div className="relative z-10 border-t border-white/10 py-4 overflow-hidden">
          <div className="flex w-max animate-marquee gap-0">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex items-center flex-shrink-0">
                {[
                  "100% free, always",
                  "Nearest first",
                  "No fees · no ads",
                  "Give more · waste less",
                  "Built by neighbours",
                ].map((t) => (
                  <span key={`${dup}-${t}`} className="flex items-center text-white/40 text-xs font-medium tracking-widest uppercase whitespace-nowrap px-6">
                    {t}
                    <span className="ml-12 w-1.5 h-1.5 rounded-full bg-lime/50 inline-block" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Floating chips — only from xl up. At lg the headline is wide enough
            to run underneath them, and the right-hand chip covered "free". */}
        <div className="hidden xl:flex absolute top-28 left-10 z-10 items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-3 animate-float">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-lime text-forest">
            <MapPin className="w-4 h-4" />
          </span>
          <div>
            <p className="text-white text-xs font-semibold leading-tight">Near you</p>
            <p className="text-white/50 text-[10px] leading-tight">sorted by distance</p>
          </div>
        </div>

        <div className="hidden xl:flex absolute bottom-28 right-10 z-10 items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-3 animate-float" style={{ animationDelay: "1.2s" }}>
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-white text-forest text-xs font-bold">€0</span>
          <div>
            <p className="text-white text-xs font-semibold leading-tight">Always free</p>
            <p className="text-white/50 text-[10px] leading-tight">no fees, no catch</p>
          </div>
        </div>
      </div>
    </section>
  );
}
