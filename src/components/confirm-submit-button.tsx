"use client";

export function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
}: {
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      // A <form action={serverAction}> submits the instant this button is
      // clicked. This is the one bit of client-side JS needed to interrupt
      // that with a confirmation prompt first — calling preventDefault()
      // inside onClick stops the submit if the author backs out.
      onClick={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
