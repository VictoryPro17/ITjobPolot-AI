export function Spinner({ label = "Laden..." }: { label?: string }) {
  return <span className="inline-flex items-center gap-2 text-sm text-muted-foreground" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />{label}</span>;
}
