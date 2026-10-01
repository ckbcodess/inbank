import { cn } from "@/lib/utils";

/**
 * An error that sits right under the field it is about (code and PIN boxes, a
 * short form). Renders nothing when there is no message, so it can be dropped in
 * unconditionally. Use `AlertToast` only for things that aren't about one field.
 */
export function InlineError({
  message,
  className,
}: {
  message?: string | null | false;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p role="alert" className={cn("text-center text-[13px] text-destructive", className)}>
      {message}
    </p>
  );
}
