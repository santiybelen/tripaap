"use client";

export function ConfirmButton({
  action,
  message,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
      style={{ display: "inline-block" }}
    >
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
