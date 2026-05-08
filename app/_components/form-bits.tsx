export function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="mb-1 block text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";

export const submitBtnCls =
  "mt-1 rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-slate-800";

export function toLocalDatetime(d: Date | null): string {
  if (!d) return "";
  const date = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
