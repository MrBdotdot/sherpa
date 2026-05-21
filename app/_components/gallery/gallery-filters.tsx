"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const TAGS = ["strategy", "cooperative", "thematic", "party"] as const;
const COMPLEXITIES = ["Light", "Medium", "Heavy"] as const;

const COMPLEXITY_DOT: Record<string, string> = {
  Light: "#2d6a4f",
  Medium: "#b07316",
  Heavy: "#9a3412",
};

export function GalleryFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const activeTag = params.get("tag") ?? "";
  const activeComplexity = params.get("complexity") ?? "";

  function setParam(key: "tag" | "complexity", value: string) {
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    if (next.get(key) === value) {
      next.delete(key);
    } else if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function isAll() {
    return !activeTag && !activeComplexity;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => router.push(pathname)}
        className="rounded-full border px-3.5 py-1.5 font-sans text-[12.5px] transition hover:opacity-80"
        style={isAll()
          ? { background: "#1a1815", color: "#fff", borderColor: "transparent" }
          : { background: "#fff", color: "#4a443b", borderColor: "#d7d0c5" }}
      >
        All
      </button>
      {TAGS.map((tag) => {
        const active = activeTag === tag;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => setParam("tag", tag)}
            className="rounded-full border px-3.5 py-1.5 font-sans text-[12.5px] capitalize transition hover:opacity-80"
            style={active
              ? { background: "#1a1815", color: "#fff", borderColor: "transparent" }
              : { background: "#fff", color: "#4a443b", borderColor: "#d7d0c5" }}
          >
            {tag}
          </button>
        );
      })}
      <div className="mx-1 h-5 w-px" style={{ background: "#e8e4de" }} />
      {COMPLEXITIES.map((c) => {
        const active = activeComplexity === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => setParam("complexity", c)}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-sans text-[12.5px] transition hover:opacity-80"
            style={active
              ? { background: "#1a1815", color: "#fff", borderColor: "transparent" }
              : { background: "#fff", color: "#4a443b", borderColor: "#d7d0c5" }}
          >
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: COMPLEXITY_DOT[c] }} />
            {c}
          </button>
        );
      })}
    </div>
  );
}
