"use client";

import { useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_RULES, passwordMeetsRules } from "@/lib/auth-shared";

/**
 * New password + confirm, with the Bank's rules shown up front as a live
 * checklist. Shared by activation and password reset so the two can't enforce
 * different standards.
 */

export function newPasswordReady(password: string, confirm: string): boolean {
  return passwordMeetsRules(password) && confirm.length > 0 && confirm === password;
}

interface NewPasswordFieldsProps {
  password: string;
  confirm: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  autoFocus?: boolean;
}

export default function NewPasswordFields({
  password,
  confirm,
  onPasswordChange,
  onConfirmChange,
  autoFocus = false,
}: NewPasswordFieldsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <div className="flex flex-col gap-5">
      <PasswordInput
        id="new-password"
        label="New password"
        placeholder="Choose a strong password"
        value={password}
        onChange={onPasswordChange}
        shown={showPassword}
        onToggle={() => setShowPassword((s) => !s)}
        autoFocus={autoFocus}
      />

      <ul className="grid grid-cols-1 gap-2 text-[12.5px] sm:grid-cols-2" aria-label="Password requirements">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(password);
          return (
            <li key={rule.id} className="flex items-center gap-2">
              <span
                className={`flex size-4 items-center justify-center rounded-full transition-colors ${
                  met ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                <Check size={11} strokeWidth={3} aria-hidden="true" />
              </span>
              <span className={met ? "text-foreground" : "text-muted-foreground"}>
                {rule.label}
                <span className="sr-only">{met ? " — met" : " — not yet"}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2">
        <PasswordInput
          id="confirm-password"
          label="Confirm new password"
          placeholder="Enter it again"
          value={confirm}
          onChange={onConfirmChange}
          shown={showConfirm}
          onToggle={() => setShowConfirm((s) => !s)}
          invalid={mismatch}
        />
        {mismatch && (
          <p className="text-[12.5px] text-destructive">These don&apos;t match yet.</p>
        )}
      </div>
    </div>
  );
}

function PasswordInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  shown,
  onToggle,
  autoFocus,
  invalid,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  shown: boolean;
  onToggle: () => void;
  autoFocus?: boolean;
  invalid?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-[13px] font-medium text-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={shown ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 pr-11 text-[14px]"
          aria-invalid={invalid || undefined}
          autoFocus={autoFocus}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={shown ? "Hide password" : "Show password"}
          className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
        >
          {shown ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
        </button>
      </div>
    </div>
  );
}
