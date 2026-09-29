export default function RequestCardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[540px] flex-col gap-6" aria-busy="true">
      <div className="h-7 w-48 rounded-lg bg-muted/60" />
      <div className="flex flex-col gap-3">
        <div className="h-[76px] w-full rounded-2xl bg-muted/50" />
        <div className="h-[76px] w-full rounded-2xl bg-muted/50" />
        <div className="h-[76px] w-full rounded-2xl bg-muted/50" />
      </div>
    </div>
  );
}
