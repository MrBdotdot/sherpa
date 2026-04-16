import React from "react";

// ── Shared class helpers ───────────────────────────────────────────────────

const FIELD_BASE =
  "w-full rounded-lg border border-neutral-200 bg-white text-neutral-900 " +
  "outline-none transition placeholder:text-neutral-500 " +
  "focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 " +
  "disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed";

const FIELD_SIZE: Record<"xs" | "sm" | "md" | "lg", string> = {
  xs: "px-3 py-2 text-xs",
  sm: "px-3 py-2 text-sm",
  md: "px-3 py-2.5 text-sm",
  lg: "px-4 py-3 text-sm",
};

function cx(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// ── Primitives ─────────────────────────────────────────────────────────────

export function FieldLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500", className)}>
      {children}
    </div>
  );
}

type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
};

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  function InputField({ label, size = "md", className, ...props }, ref) {
    const input = (
      <input
        ref={ref}
        className={cx(FIELD_BASE, FIELD_SIZE[size], className)}
        {...props}
      />
    );
    if (!label) return input;
    return (
      <label className="block">
        <FieldLabel>{label}</FieldLabel>
        {input}
      </label>
    );
  }
);

type TextareaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
  resize?: "none" | "y" | "both";
};

export const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  function TextareaField({ label, size = "md", resize = "none", className, ...props }, ref) {
    const resizeCls = resize === "none" ? "resize-none" : resize === "y" ? "resize-y" : undefined;
    const textarea = (
      <textarea
        ref={ref}
        className={cx(FIELD_BASE, FIELD_SIZE[size], resizeCls, className)}
        {...props}
      />
    );
    if (!label) return textarea;
    return (
      <label className="block">
        <FieldLabel>{label}</FieldLabel>
        {textarea}
      </label>
    );
  }
);

export const MonoInput = React.forwardRef<HTMLInputElement, InputFieldProps>(
  function MonoInput({ className, ...props }, ref) {
    return <InputField ref={ref} className={cx("font-mono", className)} {...props} />;
  }
);

// ── Existing components (unchanged) ────────────────────────────────────────

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
      <FieldLabel className="mb-3">{title}</FieldLabel>
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
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 font-sans text-sm text-neutral-900 outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed"
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
