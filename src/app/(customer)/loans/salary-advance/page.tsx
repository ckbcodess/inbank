"use client";

/**
 * Salary Advance request: one amount, up to the customer's limit, repaid from
 * their next salary. Opened from Recommended for you. The limit is the figure
 * the recommendation showed; no fee or date is invented here.
 */

import { useState } from "react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const LIMIT = 20000;

export default function SalaryAdvancePage() {
  const [amount, setAmount] = useState("");
  const value = Number(amount);
  const invalid = amount !== "" && (!Number.isFinite(value) || value <= 0 || value > LIMIT);
  const error = invalid ? `Enter an amount between GHS 1 and GHS ${LIMIT.toLocaleString("en-GH")}.` : null;
  const canSubmit = amount !== "" && !invalid;

  function submit() {
    toast("Request sent", {
      description: `We'll tell you when GHS ${value.toLocaleString("en-GH", { minimumFractionDigits: 2 })} is approved.`,
    });
    setAmount("");
  }

  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-5">
      <PageHeader title="Salary Advance" backTo={{ href: "/overview", label: "Home" }} />
      <p className="text-[13px] text-muted-foreground">
        You can ask for up to GHS {LIMIT.toLocaleString("en-GH")}. It is repaid from your next salary.
      </p>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) submit();
        }}
      >
        <Field label="Amount" htmlFor="advance-amount" error={error} hint={`Up to GHS ${LIMIT.toLocaleString("en-GH")}`}>
          <Input
            id="advance-amount"
            type="number"
            inputMode="decimal"
            min={1}
            max={LIMIT}
            placeholder="0.00"
            value={amount}
            aria-invalid={invalid || undefined}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={!canSubmit} className="h-11 w-full rounded-xl">
          Request advance
        </Button>
      </form>
    </div>
  );
}
