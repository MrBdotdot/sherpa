export function EditorSection({
  children,
  title,
  id,
}: {
  children: React.ReactNode;
  title: string;
  id?: string;
}) {
  return (
    <section id={id} className="border-b border-neutral-200 px-5 py-5 last:border-b-0">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
        {title}
      </div>
      {children}
    </section>
  );
}

export function EditorSubsection({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-4">
        <div className="text-sm font-semibold text-neutral-900">{title}</div>
        {description ? (
          <div className="mt-1 text-sm leading-6 text-neutral-500">{description}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
        {label}
      </div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
