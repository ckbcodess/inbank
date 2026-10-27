import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * The two buttons under what a customer holds on a product page (Term Deposits, Treasury Bills, Insure plans, Loans):
 * the filled one starts another, the outline one goes to the product's other page (statements, about). Every product
 * page uses this one, so they read the same.
 */
export function HolderActions({
  primary,
  secondary,
}: {
  primary: { label: string; href: string; disabled?: boolean };
  secondary?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col gap-3">
      {primary.disabled ? (
        <Button className="h-11 w-full rounded-2xl text-[14px]" disabled>
          {primary.label}
        </Button>
      ) : (
        <Button className="h-11 w-full rounded-2xl text-[14px]" nativeButton={false} render={<Link href={primary.href} />}>
          {primary.label}
        </Button>
      )}
      {secondary && (
        <Button variant="outline" className="h-11 w-full rounded-2xl text-[14px]" nativeButton={false} render={<Link href={secondary.href} />}>
          {secondary.label}
        </Button>
      )}
    </div>
  );
}
