"use client";

export function BrandColorsEditor({
  colors,
  onChange,
}: {
  colors: string[];
  onChange: (colors: string[]) => void;
}) {
  const MAX = 8;

  function update(index: number, value: string) {
    onChange(colors.map((color, i) => (i === index ? value : color)));
  }

  function add() {
    if (colors.length >= MAX) return;
    onChange([...colors, "#000000"]);
  }

  function remove(index: number) {
    onChange(colors.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
        Brand palette
      </div>
      <div className="flex flex-wrap gap-2">
        {colors.map((color, index) => (
          <div key={index} className="group relative">
            <label className="block cursor-pointer" title={color}>
              <div
                className="h-9 w-9 rounded-xl border-2 border-white shadow ring-1 ring-neutral-200 transition group-hover:ring-neutral-400"
                style={{ backgroundColor: color }}
              />
              <input
                type="color"
                value={color}
                onChange={(event) => update(index, event.target.value)}
                aria-label={`Brand color ${index + 1}`}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`Remove brand color ${index + 1}`}
              className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-neutral-800 text-[10px] text-white group-hover:flex"
            >
              ×
            </button>
          </div>
        ))}
        {colors.length < MAX ? (
          <button
            type="button"
            onClick={add}
            aria-label="Add brand color"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-dashed border-neutral-300 text-neutral-500 transition hover:border-neutral-500 hover:text-neutral-600"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
