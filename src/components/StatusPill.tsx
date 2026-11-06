const STYLES: Record<string, string> = {
  pending: "bg-warn-bg text-warn",
  approved: "bg-ok-bg text-ok",
  rejected: "bg-bad-bg text-bad",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STYLES[status] ?? ""}`}>
      {status}
    </span>
  );
}
