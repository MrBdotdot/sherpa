"use client";

import React, { useEffect, useState } from "react";
import { CanvasFeature, PageItem } from "@/app/_lib/authoring-types";
import { SearchFeatureCard } from "@/app/_components/canvas/search-feature-card";
import { LocaleLanguage, parseLocaleLanguages } from "@/app/_lib/localization";

/** Returns #000000 or #ffffff — whichever gives higher contrast against the given hex background. */
function autoContrast(hex: string): string {
  const h = hex.replace("#", "").padEnd(6, "0");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.179 ? "#000000" : "#ffffff";
}

function ImageFeatureCard({
  feature,
  fontThemeClass,
  surfaceStyleClass,
}: {
  feature: CanvasFeature;
  fontThemeClass: string;
  surfaceStyleClass: string;
}) {
  const [open, setOpen] = useState(false);
  const isLinks = feature.description === "links";
  const lines = feature.optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const linkItems = lines.filter((l) => !l.startsWith("~"));
  const subtext = lines.find((l) => l.startsWith("~"))?.slice(1).trim();
  const hasLinks = isLinks && linkItems.length > 0;
  const menuId = `image-menu-${feature.id}`;

  if (!feature.imageUrl) {
    return (
      <div className={`w-[180px] rounded-xl border border-dashed border-neutral-300 bg-white/90 p-3 shadow-sm ${fontThemeClass}`}>
        <div className="truncate text-xs font-semibold text-neutral-900">{feature.label}</div>
        <div className="mt-2 rounded-lg border border-dashed border-neutral-300 px-3 py-3 text-[11px] text-neutral-400">
          Upload image
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${fontThemeClass}`}>
      <button
        type="button"
        onClick={() => hasLinks && setOpen((v) => !v)}
        aria-expanded={hasLinks ? open : undefined}
        aria-haspopup={hasLinks ? "menu" : undefined}
        aria-controls={hasLinks ? menuId : undefined}
        aria-label={feature.label || "Image"}
        className={hasLinks ? "cursor-pointer" : "cursor-default"}
      >
        <img
          src={feature.imageUrl}
          alt={feature.label}
          className="block w-auto max-w-none object-contain drop-shadow-sm"
          style={{ height: feature.logoSize ?? 80 }}
        />
      </button>
      {hasLinks && open ? (
        <div
          id={menuId}
          role="menu"
          className={`absolute left-0 top-full mt-2 w-[180px] rounded-xl border p-2 shadow-lg ${surfaceStyleClass}`}
        >
          {linkItems.map((line, i) => {
            if (line === "---") {
              return <hr key={i} className="my-1 border-neutral-200" aria-hidden="true" />;
            }
            const [label] = line.split("|");
            return (
              <button
                key={i}
                type="button"
                role="menuitem"
                className="w-full cursor-pointer truncate rounded-lg px-2 py-1.5 text-left text-xs font-medium hover:bg-black/5"
              >
                {label}
              </button>
            );
          })}
          {subtext ? (
            <div className="mt-1 line-clamp-2 border-t border-neutral-200 px-2 pt-2 text-[10px] leading-4 text-neutral-400">
              {subtext}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function LocaleFeatureCard({
  feature,
  activeLanguageCode,
  availableLanguages,
  fontThemeClass,
  isInteractive,
  onLanguageChange,
  surfaceStyleClass,
}: {
  feature: CanvasFeature;
  activeLanguageCode?: string;
  availableLanguages?: LocaleLanguage[];
  fontThemeClass: string;
  isInteractive: boolean;
  onLanguageChange?: (languageCode: string) => void;
  surfaceStyleClass: string;
}) {
  const [open, setOpen] = useState(false);
  const menuId = `locale-menu-${feature.id}`;
  const options = availableLanguages ?? parseLocaleLanguages(feature);
  const active = activeLanguageCode ?? options[0]?.code ?? feature.label ?? "EN";

  useEffect(() => {
    if (!isInteractive) setOpen(false);
  }, [isInteractive]);

  return (
    <div className={`relative ${fontThemeClass}`}>
      <button
        type="button"
        onClick={isInteractive ? () => setOpen((v) => !v) : undefined}
        aria-expanded={isInteractive ? open : undefined}
        aria-haspopup={isInteractive ? "listbox" : undefined}
        aria-controls={isInteractive ? menuId : undefined}
        aria-label={`Language: ${active}`}
        tabIndex={isInteractive ? 0 : -1}
        className={`flex max-w-[140px] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition ${surfaceStyleClass}`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="shrink-0">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1" />
          <path d="M1.75 6h8.5M6 1.5c1 1.15 1.5 2.68 1.5 4.5S7 9.35 6 10.5M6 1.5C5 2.65 4.5 4.18 4.5 6S5 9.35 6 10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
        <span className="truncate">{active}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className="shrink-0 opacity-50">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isInteractive && open ? (
        <ul
          id={menuId}
          aria-label="Select language"
          className={`absolute right-0 top-full mt-1.5 min-w-[140px] rounded-xl border p-1.5 shadow-lg ${surfaceStyleClass}`}
        >
          {options.length > 0 ? options.map(({ label, code }) => (
            <li key={code} role="option" aria-selected={active === code}>
              <button
                type="button"
                onClick={() => {
                  onLanguageChange?.(code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs font-medium transition hover:bg-black/5 ${active === code ? "font-semibold" : ""}`}
              >
                <span className="truncate">{label}</span>
                <span className="shrink-0 opacity-50">{code}</span>
              </button>
            </li>
          )) : (
            <li className="px-2 py-1.5 text-xs text-neutral-400">No languages defined</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}

export function CanvasFeatureCard({
  accentColor,
  feature,
  pages = [],
  activeLanguageCode,
  availableLanguages,
  fontThemeClass = "font-sans",
  isInteractive = true,
  onNavigate,
  onSearch,
  onLanguageChange,
  surfaceStyleClass,
}: {
  accentColor: string;
  feature: CanvasFeature;
  pages?: PageItem[];
  activeLanguageCode?: string;
  availableLanguages?: LocaleLanguage[];
  fontThemeClass?: string;
  isInteractive?: boolean;
  onNavigate?: (id: string) => void;
  onSearch?: (query: string) => void;
  onLanguageChange?: (languageCode: string) => void;
  surfaceStyleClass: string;
}) {
  if (feature.type === "search") {
    return (
      <SearchFeatureCard
        feature={feature}
        pages={pages}
        fontThemeClass={fontThemeClass}
        onNavigate={onNavigate}
        onSearch={onSearch}
        surfaceStyleClass={surfaceStyleClass}
      />
    );
  }

  if (feature.type === "qr") {
    const qrSize = feature.qrSize ?? 120;
    let bgStyle: React.CSSProperties = {};
    if (feature.qrBgColor) {
      const hex = feature.qrBgColor.replace("#", "");
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = feature.qrBgOpacity ?? 1;
      bgStyle = { backgroundColor: `rgba(${r}, ${g}, ${b}, ${a})` };
    }
    return (
      <div
        className={`rounded-xl border p-0.5 shadow-lg ${fontThemeClass} ${surfaceStyleClass}`}
        style={{ width: qrSize + 4, ...bgStyle }}
      >
        {feature.label ? (
          <div className="mb-0.5 truncate text-center text-xs font-semibold">{feature.label}</div>
        ) : null}
        {feature.imageUrl ? (
          <img
            src={feature.imageUrl}
            alt="QR code"
            className="w-full rounded-md object-contain"
          />
        ) : (
          <div className="rounded-md border border-dashed border-neutral-300 px-3 py-6 text-center text-[11px] text-neutral-400">
            Upload QR image
          </div>
        )}
      </div>
    );
  }

  if (feature.type === "image") {
    return <ImageFeatureCard feature={feature} fontThemeClass={fontThemeClass} surfaceStyleClass={surfaceStyleClass} />;
  }

  if (feature.type === "locale") {
    return (
      <LocaleFeatureCard
        feature={feature}
        activeLanguageCode={activeLanguageCode}
        availableLanguages={availableLanguages}
        fontThemeClass={fontThemeClass}
        isInteractive={isInteractive}
        onLanguageChange={onLanguageChange}
        surfaceStyleClass={surfaceStyleClass}
      />
    );
  }

  if (feature.type === "heading") {
    const subLinks = feature.optionsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const headingColor = feature.headingColor || accentColor || "#0a0a0a";
    const sizeClass =
      feature.headingSize === "small" ? "text-base" :
      feature.headingSize === "medium" ? "text-lg" :
      "text-2xl";

    return (
      <div className={`max-w-[240px] ${fontThemeClass}`}>
        <div
          className={`line-clamp-2 font-bold leading-tight drop-shadow-sm ${sizeClass}`}
          style={{ color: headingColor }}
        >
          {feature.label || "Heading"}
        </div>
        {feature.description ? (
          <div className="mt-1 line-clamp-2 text-sm leading-5 text-white drop-shadow-sm">
            {feature.description}
          </div>
        ) : null}
        {subLinks.length > 0 ? (
          <ul className={`mt-2 rounded-xl border p-2 shadow-sm ${surfaceStyleClass}`}>
            {subLinks.map((link) => {
              const [label] = link.split("|");
              return (
                <li key={link}>
                  <button
                    type="button"
                    className="w-full truncate rounded-lg px-2 py-1.5 text-left text-xs font-medium hover:bg-black/5"
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    );
  }

  if (feature.type === "button") {
    const variant = feature.buttonVariant ?? "secondary";
    const accent = accentColor || "#111827";
    const hasAction = !!feature.linkUrl;
    const opensPage = (feature.buttonLinkMode ?? "external") === "page";
    let cls = "max-w-[200px] truncate rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition";
    let style: React.CSSProperties = {};
    if (variant === "tertiary") {
      cls += " bg-transparent underline-offset-2 hover:underline";
      style = { color: feature.buttonBgColor || accent };
    } else {
      const bg = feature.buttonBgColor || (variant === "primary" ? accent : "#ffffff");
      style = { backgroundColor: bg, color: autoContrast(bg) };
    }
    return (
      <button
        type="button"
        onClick={() => {
          if (!feature.linkUrl) return;
          if (opensPage) onNavigate?.(feature.linkUrl);
          else window.open(feature.linkUrl, "_blank", "noopener,noreferrer");
        }}
        className={`${cls} ${fontThemeClass} ${
          hasAction
            ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md"
            : "cursor-default opacity-80"
        }`}
        style={style}
      >
        {feature.label}
      </button>
    );
  }

  if (feature.type === "dropdown") {
    const options = feature.optionsText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const pipeIdx = item.indexOf("|");
        if (pipeIdx === -1) return { label: item, isPage: false, isExternal: false, url: "" };
        const label = item.slice(0, pipeIdx).trim();
        const url = item.slice(pipeIdx + 1).trim();
        if (url.startsWith("page:")) return { label, isPage: true, isExternal: false, url: url.slice(5) };
        return { label, isPage: false, isExternal: true, url };
      });

    return (
      <div className={`w-[200px] rounded-xl border p-3 shadow-lg ${fontThemeClass} ${surfaceStyleClass}`}>
        <div className="truncate text-xs font-semibold">{feature.label}</div>
        <div className="mt-2 divide-y divide-neutral-100">
          {options.length > 0 ? options.map(({ label, isPage, isExternal, url }, i) => {
            const hasLink = (isPage || isExternal) && !!url;
            return (
              <button
                key={i}
                type="button"
                disabled={!hasLink}
                onClick={() => {
                  if (isPage && url && onNavigate) onNavigate(url);
                  else if (isExternal && url) window.open(url, "_blank", "noopener,noreferrer");
                }}
                className={`flex w-full items-center justify-between gap-2 py-1.5 text-left text-xs text-neutral-700 ${
                  hasLink ? "cursor-pointer hover:text-neutral-900" : "cursor-default"
                }`}
              >
                <span className="truncate">{label}</span>
                {hasLink ? (
                  isPage ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className="shrink-0 text-neutral-400"><path d="M2 5h6M5.5 2.5 8 5l-2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className="shrink-0 text-neutral-400"><path d="M2.5 7.5 7.5 2.5M4 2.5h3.5v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )
                ) : null}
              </button>
            );
          }) : (
            <div className="py-1.5 text-xs text-neutral-400">Add options</div>
          )}
        </div>
      </div>
    );
  }

  if (feature.type === "page-button") {
    const buttonAccent = accentColor || "#111827";

    return (
      <button
        type="button"
        onClick={() => {
          if (feature.linkUrl) onNavigate?.(feature.linkUrl);
        }}
        className={`max-w-[200px] cursor-pointer truncate rounded-full bg-white/92 px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl ${fontThemeClass}`}
        style={{ color: buttonAccent }}
      >
        {feature.label || "Page"}
      </button>
    );
  }

  if (feature.type === "anchor-pin") {
    const dotBg = accentColor || "#0a0a0a";
    const isCardMode = !feature.description || feature.description === "card";
    return (
      <button
        type="button"
        title={feature.label || undefined}
        aria-label={feature.label || "Anchor pin"}
        onClick={() => {
          if (!feature.linkUrl) return;
          onNavigate?.(feature.linkUrl);
          if (!isCardMode && feature.optionsText) {
            const sectionId = feature.optionsText;
            setTimeout(() => {
              document.querySelector(`[data-a11y-id="${sectionId}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 400);
          }
        }}
        className={`sherpa-hotspot-pin group flex items-center justify-center ${fontThemeClass}`}
      >
        <span className="relative flex h-10 w-10 items-center justify-center">
          <span className="absolute inset-0 animate-pulse rounded-full opacity-20" style={{ backgroundColor: dotBg }} />
          <span
            className="relative h-4 w-4 rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-125"
            style={{ backgroundColor: dotBg }}
          />
        </span>
      </button>
    );
  }

  return (
    <div className={`max-w-[220px] rounded-xl border border-neutral-200 bg-white p-3 shadow-sm ${fontThemeClass}`}>
      <div className="line-clamp-3 text-[11px] italic leading-5 text-neutral-500">{feature.label || "Disclaimer text"}</div>
    </div>
  );
}
