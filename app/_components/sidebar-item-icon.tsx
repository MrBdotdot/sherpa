export function SidebarItemIcon({ type }: { type: string }) {
  switch (type) {
    // Canvas feature types
    case "image":
      return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><rect x="1" y="1.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="4" cy="4.5" r="1" stroke="currentColor" strokeWidth="1.2"/><path d="M1 9l2.5-2 2 1.5 2-1.5 3.5 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "heading":
      return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M1.5 2.5v8M6.5 2.5v8M1.5 6.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M9 6h3.5M10.5 4.5v7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
    case "qr":
      return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><rect x="1" y="1" width="4.5" height="4.5" rx="0.75" stroke="currentColor" strokeWidth="1.2"/><rect x="7.5" y="1" width="4.5" height="4.5" rx="0.75" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="7.5" width="4.5" height="4.5" rx="0.75" stroke="currentColor" strokeWidth="1.2"/><rect x="2.25" y="2.25" width="2" height="2" rx="0.25" fill="currentColor"/><rect x="8.75" y="2.25" width="2" height="2" rx="0.25" fill="currentColor"/><rect x="2.25" y="8.75" width="2" height="2" rx="0.25" fill="currentColor"/><path d="M8.5 8.5h1.5M10 8.5v1.5M8.5 10h1.5M10 10v1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>;
    case "button":
    case "page-button":
      return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><rect x="1" y="4" width="11" height="5" rx="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 6.5h4M8.5 6.5L7.5 5.5M8.5 6.5L7.5 7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "dropdown":
      return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><rect x="1" y="2.5" width="11" height="4" rx="1.25" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="8.5" width="11" height="3" rx="1.25" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1.5"/><path d="M9.5 4.5H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
    case "search":
      return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8.5 8.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
    case "locale":
      return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M6.5 1.5S5 3.5 5 6.5s1.5 5 1.5 5M6.5 1.5s1.5 2 1.5 5-1.5 5-1.5 5" stroke="currentColor" strokeWidth="1.1"/><path d="M1.5 6.5h10" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>;
    case "anchor-pin":
      return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><circle cx="6.5" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M6.5 5v7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M3 11c0-1.9 1.6-3.5 3.5-3.5S10 9.1 10 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M4.5 5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
    case "disclaimer":
      return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M6.5 1L12.5 11.5H0.5L6.5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M6.5 5.5v2.5M6.5 9.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
    // Block types
    case "text":
      return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M1.5 3.5h10M1.5 6.5h7M1.5 9.5h8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
    case "callout":
      return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><rect x="1" y="1.5" width="11" height="10" rx="1.75" stroke="currentColor" strokeWidth="1.2"/><path d="M6.5 4.5v3M6.5 9v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
    case "tabs":
      return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><rect x="1" y="5" width="11" height="7.5" rx="1.25" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="1.5" width="4" height="3.75" rx="1" fill="currentColor"/><rect x="6" y="1.5" width="3.5" height="3.75" rx="1" stroke="currentColor" strokeWidth="1.1"/></svg>;
    case "section":
      return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M1.5 4.5h10M1.5 7.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="11" cy="4.5" r="1.25" fill="currentColor"/></svg>;
    case "step-rail":
      return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><circle cx="2.5" cy="3.5" r="1.25" fill="currentColor"/><circle cx="2.5" cy="6.5" r="1.25" stroke="currentColor" strokeWidth="1.1"/><circle cx="2.5" cy="9.5" r="1.25" stroke="currentColor" strokeWidth="1.1"/><path d="M2.5 4.75v.5M2.5 7.75v.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/><path d="M5 3.5h6.5M5 6.5h4M5 9.5h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
    case "carousel":
      return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><rect x="3" y="2.5" width="7" height="8" rx="1.25" stroke="currentColor" strokeWidth="1.2"/><rect x="0.5" y="4" width="2" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.1"/><rect x="10.5" y="4" width="2" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.1"/></svg>;
    case "consent":
      return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><rect x="1.5" y="1" width="10" height="11" rx="1.25" stroke="currentColor" strokeWidth="1.2"/><path d="M4 5h5M4 7.5h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M4 10.5h1.5l3-3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "video":
      return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><rect x="1" y="2.5" width="8" height="8" rx="1.25" stroke="currentColor" strokeWidth="1.2"/><path d="M9 5.5L12.5 4v5L9 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    default: // action-link / tab
      return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M5.5 2.5H2A1.5 1.5 0 00.5 4v7A1.5 1.5 0 002 12.5h7A1.5 1.5 0 0010.5 11V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M7.5 1.5H12V6M11.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  }
}
