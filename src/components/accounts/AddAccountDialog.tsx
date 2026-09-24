"use client";

/**
 * Add Account — bring an account the customer already holds onto internet
 * banking. Nothing is opened here.
 *
 *   1. Verify it's you — says up front that a selfie is coming, and why.
 *   2. Selfie — the same `SelfieCapture` as sign-up and password reset,
 *      matched to the Ghana Card photo. A miss explains the likely cause and
 *      offers another try; after three misses selfie checks stop and the
 *      customer is sent to a branch (same pattern as password reset). The
 *      lock outlasts closing the dialog.
 *   3. Choose an account — everything held under that Ghana Card; ones already
 *      on the profile show as added. One pick. None held → a way to a branch.
 *   4. (Wallet customers only) What happens to your wallet — the balance, where
 *      it goes, and what the linked sources top up from now on, before they agree.
 *   5. Added.
 *
 * Adding shows an account, it doesn't move money — except the wallet move in
 * step 4, which is spelled out before it happens and confirmed after.
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, ChevronLeft, Landmark, MapPin, ScanFace, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SelfieCapture from "@/components/auth/SelfieCapture";
import { TileChip } from "@/components/ui/action-tile";
import { cn } from "@/lib/utils";
import { findAccount, formatMoney, type Account } from "@/lib/mock-data";
import { useAccountPrefs } from "@/lib/accounts-store";

type Step = "confirm" | "selfie" | "no_match" | "branch" | "choose" | "move" | "done";

const MAX_SELFIE_ATTEMPTS = 3;

const TITLE: Record<Step, string> = {
  confirm: "Verify It's You",
  selfie: "Take a Selfie",
  no_match: "We Couldn't Match Your Selfie",
  branch: "Let's Finish This at a Branch",
  choose: "Choose an Account",
  move: "Your Wallet Balance Moves",
  done: "Account Added",
};

const BACK: Partial<Record<Step, Step>> = { selfie: "confirm", choose: "selfie", move: "choose" };

export default function AddAccountDialog({
  open,
  onOpenChange,
  onAdded,
  existingIds,
  ghanaCardAccountIds,
  wallet,
  selfieMatches = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: (account: Account) => void;
  /** Accounts already on the profile — listed, but can't be added again. */
  existingIds: string[];
  /** Every account held under the customer's Ghana Card. */
  ghanaCardAccountIds: readonly string[];
  /** Set for a wallet customer: their wallet balance moves to the account they add. */
  wallet?: { balance: number; sourceTitles: string[] };
  /** Prototype: whether the selfie matches the Ghana Card photo (Dev Mode). */
  selfieMatches?: boolean;
}) {
  const addAccount = useAccountPrefs((s) => s.addAccount);
  const migrateWallet = useAccountPrefs((s) => s.migrateWallet);
  const [step, setStep] = useState<Step>("confirm");
  const [selfie, setSelfie] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [added, setAdded] = useState<Account | null>(null);
  // Not reset on close — reopening mustn't hand out fresh tries.
  const [failedAttempts, setFailedAttempts] = useState(0);
  const locked = failedAttempts >= MAX_SELFIE_ATTEMPTS;

  const held = ghanaCardAccountIds.map((id) => findAccount(id)).filter((a): a is Account => Boolean(a));
  const available = held.filter((a) => !existingIds.includes(a.id));
  const picked = held.find((a) => a.id === pickedId) ?? null;
  const movesBalance = Boolean(wallet && wallet.balance > 0);
  const sources =
    wallet && wallet.sourceTitles.length > 0 ? wallet.sourceTitles.join(" and ") : "Your linked wallets and cards";

  function reset() {
    setStep("confirm");
    setSelfie(null);
    setVerifying(false);
    setPickedId(null);
    setAdded(null);
  }

  function close() {
    onOpenChange(false);
    // Let the close animation finish before the content resets.
    setTimeout(reset, 200);
  }

  function handleSelfie(image: string) {
    setSelfie(image);
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      if (selfieMatches) {
        setStep("choose");
        return;
      }
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      setStep(attempts >= MAX_SELFIE_ATTEMPTS ? "branch" : "no_match");
    }, 900);
  }

  function add() {
    if (!picked) return;
    addAccount(picked.id);
    if (wallet) migrateWallet(picked.id, wallet.balance);
    setAdded(picked);
    setStep("done");
    onAdded?.(picked);
  }

  // Once locked, every visit lands on the branch step until it's done in person.
  const view: Step = locked && step !== "done" ? "branch" : step;
  const back = BACK[view];
  const triesLeft = MAX_SELFIE_ATTEMPTS - failedAttempts;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent size="md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {back && (
              <button
                type="button"
                onClick={() => {
                  if (view === "choose") {
                    setSelfie(null);
                    setPickedId(null);
                  }
                  setStep(back);
                }}
                className="-ml-1 mr-1 flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Back"
              >
                <ChevronLeft size={18} strokeWidth={1.8} />
              </button>
            )}
            <DialogTitle>{view === "choose" && held.length === 0 ? "No Accounts Found" : TITLE[view]}</DialogTitle>
          </div>
        </DialogHeader>

        <DialogBody>
          {view === "confirm" && (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-foreground">
                <ScanFace size={28} strokeWidth={1.7} aria-hidden="true" />
              </div>
              <p className="max-w-[340px] text-[14px] leading-relaxed text-muted-foreground">
                To add an account, we&apos;ll ask you to take a quick selfie. We match it to your Ghana Card, then
                show the accounts held in your name.
              </p>
            </div>
          )}

          {view === "selfie" && (
            <SelfieCapture
              onCapture={handleSelfie}
              busy={verifying}
              capturedImage={selfie}
              onRetake={() => setSelfie(null)}
              dataTour="add-account-selfie"
            />
          )}

          {view === "no_match" && (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-foreground">
                <ScanFace size={28} strokeWidth={1.7} aria-hidden="true" />
              </div>
              <p className="max-w-[340px] text-[14px] leading-relaxed text-muted-foreground">
                This usually comes down to light, glare, or something covering part of your face. Find even light,
                face the camera and try again.
              </p>
            </div>
          )}

          {view === "branch" && (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-foreground">
                <Landmark size={26} strokeWidth={1.7} aria-hidden="true" />
              </div>
              <p className="max-w-[340px] text-[14px] leading-relaxed text-muted-foreground">
                Your selfie still didn&apos;t match, so we&apos;ve paused selfie checks for now. Bring your Ghana Card
                to any GCB branch and we&apos;ll add the account for you there.
              </p>
            </div>
          )}

          {view === "choose" && held.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-foreground">
                <Landmark size={26} strokeWidth={1.7} aria-hidden="true" />
              </div>
              <p className="text-[15px] tracking-[-0.01em] text-foreground">
                We didn&apos;t find a GCB account under your Ghana Card
              </p>
              <p className="max-w-[340px] text-[13.5px] leading-relaxed text-muted-foreground">
                You can open one at any GCB branch. Bring your Ghana Card, and it will show up here once it&apos;s open.
              </p>
            </div>
          )}

          {view === "choose" && held.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-[13.5px] text-muted-foreground">Accounts held under your Ghana Card</p>
              <div role="radiogroup" aria-label="Accounts" className="flex flex-col gap-2.5">
                {held.map((account) => {
                  const already = existingIds.includes(account.id);
                  const selected = pickedId === account.id;
                  return (
                    <button
                      key={account.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={already}
                      onClick={() => setPickedId(account.id)}
                      className={cn(
                        "flex items-center gap-4 rounded-[16px] border p-4 text-left transition-colors",
                        selected
                          ? "border-foreground bg-[var(--tile)]"
                          : "border-[var(--tile-border)] bg-[var(--tile)] hover:bg-[var(--tile-hover)]",
                        already ? "cursor-default opacity-60 hover:bg-[var(--tile)]" : "cursor-pointer",
                      )}
                    >
                      <TileChip>
                        <Landmark size={20} strokeWidth={1.8} aria-hidden="true" />
                      </TileChip>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-[15px] font-medium tracking-[-0.01em] text-foreground">
                          {account.name}
                        </span>
                        <span className="truncate text-[13px] text-muted-foreground tabular">
                          {account.type} · {account.number}
                        </span>
                      </span>
                      {already ? (
                        <Badge variant="secondary" className="shrink-0">
                          Added
                        </Badge>
                      ) : selected ? (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                          <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {available.length === 0 && (
                <p className="text-[13px] text-muted-foreground">
                  Every account under your Ghana Card is already here.
                </p>
              )}
            </div>
          )}

          {view === "move" && picked && wallet && (
            <div className="flex flex-col gap-5">
              {/* From → to, with the amount, so nothing moves unseen. */}
              <div className="flex items-center gap-3 rounded-[16px] border border-[var(--tile-border)] bg-[var(--tile)] p-4">
                <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                  <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                    <Wallet size={14} strokeWidth={1.8} aria-hidden="true" />
                    GCB Wallet
                  </span>
                  <span className="text-[20px] tracking-[-0.02em] text-foreground tabular">
                    {formatMoney(wallet.balance, "GHS", true)}
                  </span>
                </span>
                <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                <span className="flex min-w-0 flex-1 flex-col items-end gap-1 text-right">
                  <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                    <Landmark size={14} strokeWidth={1.8} aria-hidden="true" />
                    {picked.type}
                  </span>
                  <span className="truncate text-[15px] text-foreground">{picked.name}</span>
                </span>
              </div>

              <ul className="flex flex-col gap-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
                {movesBalance && (
                  <li className="tabular">
                    Your wallet balance of {formatMoney(wallet.balance, "GHS", true)} moves to {picked.name}. No fees.
                  </li>
                )}
                <li>{sources} will top up {picked.name} from now on.</li>
                <li>{picked.name} becomes your default account, and your wallet won&apos;t show on Accounts any more.</li>
              </ul>
            </div>
          )}

          {view === "done" && added && (
            <div className="flex flex-col items-center gap-3 py-2 text-center" role="status">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success">
                <CheckCircle2 size={30} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <p className="text-[17px] tracking-[-0.01em] text-foreground">{added.name} is added</p>
              <p className="text-[13.5px] text-muted-foreground tabular">
                {wallet && movesBalance
                  ? `${formatMoney(wallet.balance, "GHS", true)} moved from your wallet`
                  : `${added.type} · ${added.number}`}
              </p>
            </div>
          )}
        </DialogBody>

        {view === "confirm" && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} className="h-10 flex-1 rounded-lg text-[13.5px]">
              Cancel
            </Button>
            <Button type="button" onClick={() => setStep("selfie")} className="h-10 flex-1 rounded-lg text-[13.5px]">
              Continue
            </Button>
          </DialogFooter>
        )}
        {view === "no_match" && (
          <DialogFooter className="flex-col gap-2">
            <Button
              type="button"
              onClick={() => {
                setSelfie(null);
                setStep("selfie");
              }}
              className="h-10 w-full rounded-lg text-[13.5px]"
            >
              Try Again
            </Button>
            <p className="text-center text-[12.5px] text-muted-foreground">
              <span className="tabular">{triesLeft}</span> {triesLeft === 1 ? "try" : "tries"} left before we ask you
              to visit a branch
            </p>
          </DialogFooter>
        )}
        {view === "branch" && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} className="h-10 flex-1 rounded-lg text-[13.5px]">
              Close
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/locate-us" onClick={close} />}
              className="h-10 flex-1 gap-1.5 rounded-lg text-[13.5px]"
            >
              <MapPin size={15} strokeWidth={1.8} aria-hidden="true" />
              Find a Branch
            </Button>
          </DialogFooter>
        )}
        {view === "choose" && held.length === 0 && (
          <DialogFooter>
            <Button
              nativeButton={false}
              render={<Link href="/locate-us" onClick={close} />}
              className="h-10 w-full gap-1.5 rounded-lg text-[13.5px]"
            >
              <MapPin size={15} strokeWidth={1.8} aria-hidden="true" />
              Find a Branch
            </Button>
          </DialogFooter>
        )}
        {view === "choose" && held.length > 0 && (
          <DialogFooter>
            <Button
              type="button"
              disabled={!picked}
              onClick={() => (wallet ? setStep("move") : add())}
              className="h-10 w-full rounded-lg text-[13.5px]"
            >
              {wallet ? "Continue" : "Add Account"}
            </Button>
          </DialogFooter>
        )}
        {view === "move" && (
          <DialogFooter>
            <Button type="button" onClick={add} className="h-10 w-full rounded-lg text-[13.5px]">
              {movesBalance ? "Add Account and Move Balance" : "Add Account"}
            </Button>
          </DialogFooter>
        )}
        {view === "done" && (
          <DialogFooter>
            <Button type="button" onClick={close} className="h-10 w-full rounded-lg text-[13.5px]">
              Done
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
