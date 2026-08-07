"use client";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// X-style "83 Following" stat that opens the actual list in a dialog instead
// of navigating away or living behind its own tab — the count itself is
// server-rendered by the caller (this component just owns the open/close
// state a dialog needs), and `children` is the already-server-rendered list.
export function FollowListDialog({
  count,
  label,
  title,
  children,
}: {
  count: number;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger className="hover:underline">
        <span className="font-semibold text-foreground">{count}</span>{" "}
        <span className="text-muted-foreground">{label}</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
