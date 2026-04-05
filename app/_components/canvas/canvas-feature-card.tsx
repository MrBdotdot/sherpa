"use client";

import React, { useState } from "react";
import { CanvasFeature, PageItem } from "@/app/_lib/authoring-types";
import { SearchFeatureCard } from "@/app/_components/canvas/search-feature-card";

function ImageFeatureCard({
  feature,
  surfaceStyleClass,
}: {
  feature: CanvasFeature;
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
      <div className="w-[180px] rounded-xl border border-dashed border-neutral-300 bg-white/90 p-3 shadow-sm">
        <div className="truncate text-xs font-semibold text-neutral-900">{feature.label}</div>
        <div className="mt-2 rounded-lg border border-dashed border-neutral-300 px-3 py-3 text-[11px] text-neutral-400">
          Upload image
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
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
          style={{ height: feature.logoSize ?? 48 }}
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
  surfaceStyleClass,
}: {
  feature: CanvasFeature;
  surfaceStyleClass: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(feature.label || "EN");
  const menuId = `locale-menu-${feature.id}`;

  const options = feature.optionsText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [display, code] = l.split("|");
      return { display: display.trim(), code: (code ?? display).trim() };
    });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={menuId}
        aria-label={`Language: ${active}`}
        className={`flex max-w-[140px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${surfaceStyleClass}`}
      >
        <span aria-hidden="true">🌐</span>
        <span className="truncate">{active}</span>
        <span aria-hidden="true" className="shrink-0 opacity-50">▾</span>
      </button>
      {open ? (
        <ul
          id={menuId}
          role="listbox"
          aria-label="Select language"
          className={`absolute right-0 top-full mt-1.5 min-w-[140px] rounded-xl border p-1.5 shadow-lg ${surfaceStyleClass}`}
        >
          {options.length > 0 ? options.map(({ display, code }) => (
            <li key={code} role="option" aria-selected={active === code}>
              <button
                type="button"
                onClick={() => { setActive(code); setOpen(false); }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs font-medium transition hover:bg-black/5 ${active === code ? "font-semibold" : ""}`}
              >
                <span className="truncate">{display}</span>
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
  onNavigate,
  surfaceStyleClass,
}: {
  accentColor: string;
  feature: CanvasFeature;
  pages?: PageItem[];
  onNavigate?: (id: string) => void;
  surfaceStyleClass: string;
}) {
  if (feature.type === "search") {
    return (
      <SearchFeatureCard
        feature={feature}
        pages={pages}
        onNavigate={onNavigate}
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
        className={`rounded-xl border p-0.5 shadow-lg ${surfaceStyleClass}`}
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
    return <ImageFeatureCard feature={feature} surfaceStyleClass={surfaceStyleClass} />;
  }

  if (feature.type === "locale") {
    return <LocaleFeatureCard feature={feature} surfaceStyleClass={surfaceStyleClass} />;
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
      <div className="max-w-[240px]">
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
          <ul role="list" className={`mt-2 rounded-xl border p-2 shadow-sm ${surfaceStyleClass}`}>
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
    const accent = accentColor || "#0a0a0a";
    let cls = "max-w-[200px] truncate rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition";
    let style: React.CSSProperties = {};
    if (variant === "primary") {
      cls += " border text-white";
      style = { backgroundColor: accent, borderColor: accent };
    } else if (variant === "tertiary") {
      cls += " border border-transparent bg-transparent underline-offset-2 hover:underline";
      style = { color: accent };
    } else {
      // secondary (default)
      cls += " border bg-white/80";
      style = { borderColor: accent, color: accent };
    }
    return (
      <button type="button" className={cls} style={style}>
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
      <div className={`w-[200px] rounded-xl border p-3 shadow-lg ${surfaceStyleClass}`}>
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
                  <span className="shrink-0 text-[10px] text-neutral-400">{isPage ? "→" : "↗"}</span>
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
    return (
      <button
        type="button"
        className="max-w-[200px] truncate rounded-full border border-neutral-300 bg-white px-3 py-2 text-xs font-medium shadow-sm transition hover:bg-neutral-50"
        style={accentColor ? { borderColor: accentColor, color: accentColor } : {}}
      >
        {feature.label || "Page"}
      </button>
    );
  }

  // disclaimer
  return (
    <div className="max-w-[220px] rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
      <div className="line-clamp-3 text-[11px] italic leading-5 text-neutral-500">{feature.label || "Disclaimer text"}</div>
    </div>
  );
}
