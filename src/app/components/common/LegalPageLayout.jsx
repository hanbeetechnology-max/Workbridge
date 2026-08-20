import { Children, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import TextReveal from "./TextReveal";

// Two-column legal-page shell — a sticky table-of-contents (derived directly
// from the <LegalSection> children below, not a separately maintained list,
// so the two can never drift out of sync) and a real IntersectionObserver
// scroll-spy that highlights whichever section is actually in view, the
// same pattern sites like Naukri's legal pages use.
export default function LegalPageLayout({ title, lastUpdated, intro, children }) {
  useDocumentTitle(`${title} — WorkBridge`);

  const sections = useMemo(
    () =>
      Children.toArray(children)
        .filter((child) => child?.props?.id && child?.props?.title)
        .map((child) => ({ id: child.props.id, title: child.props.title })),
    [children]
  );

  const [activeId, setActiveId] = useState(sections[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Multiple sections can be "intersecting" at once while scrolling
        // fast — the one closest to the top of the viewport is the one a
        // reader would say they're "on", so pick by smallest boundingClientRect.top.
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
        setActiveId(topMost.target.id);
      },
      { rootMargin: "-100px 0px -70% 0px", threshold: 0 }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  return (
    // relative z-10 — without an explicit position this wrapper is a static
    // in-flow element, which paints BEHIND .wb-aurora (fixed, z-index:0) in
    // the CSS stacking order regardless of its own solid background —
    // static elements paint before positioned ones. Same bleed-through bug
    // already fixed on .wb-footer; this page just wasn't tagged with any of
    // the classes that stacking rule already covers (wb-nav/wb-footer/
    // wb-hero/wb-section).
    <div className="relative z-10 bg-slate-50 dark:bg-[#070B18] px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="group mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 transition-colors hover:text-[#FF6B35]"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
          Back to Home
        </Link>
        <TextReveal
          as="h1"
          text={title}
          className="font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
        />
        <p className="mt-2 text-sm font-semibold text-slate-400 dark:text-slate-500">Last updated {lastUpdated}</p>
        {intro && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{intro}</p>}
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-8 md:flex-row">
        <aside className="w-full flex-shrink-0 md:w-1/4">
          <nav className="sticky top-24 space-y-1 text-sm">
            <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">On this page</p>
            {sections.map(({ id, title: sectionTitle }) => (
              <a
                key={id}
                href={`#${id}`}
                className={`block rounded-lg px-3 py-2 font-semibold transition-colors ${
                  activeId === id
                    ? "bg-[#FF6B35]/10 text-[#FF6B35]"
                    : "text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {sectionTitle}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm md:p-12">
          {children}
        </div>
      </div>
    </div>
  );
}

export function LegalSection({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 [&_a]:font-semibold [&_a]:text-[#1B3FAB] dark:[&_a]:text-[#6B8AF0] [&_a]:underline [&_a]:underline-offset-2 [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-800 dark:[&_h3]:text-slate-200 [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-slate-800 dark:[&_strong]:text-slate-200 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
