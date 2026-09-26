"use client";

import { useState } from "react";
import {
  Bell,
  Check,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Moon,
  Sun,
  User,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/session-store";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { useTheme } from "next-themes";
import { switchTheme } from "@/lib/theme-transition";
import { toast } from "sonner";
import { PhoneInput } from "@/components/ui/phone-input";

type SettingsTab = "profile" | "security" | "notifications" | "preferences";

export default function SettingsPage() {
  const { actor } = useSession();
  const { showAmounts, toggleAmountVisibility } = useAmountVisibility();
  const { resolvedTheme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Profile state
  const [name, setName] = useState(actor?.name || "Kodjo Mensah");
  const [email, setEmail] = useState(actor?.email || "kodjo.mensah@adinkragroup.com");
  const [phone, setPhone] = useState("+233 24 412 3456");
  const [ghanaCard] = useState("GHA-721840294-8");
  const [proxyId] = useState("GH-KODJO-01");
  const [address, setAddress] = useState("Plot 14, Senchi Street, Airport Residential Area, Accra");

  // Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sessionTimeout, setSessionTimeout] = useState("15");

  // Notifications state
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [eStatements, setEStatements] = useState(true);

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Profile details updated successfully");
  }

  function handleSaveSecurity(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    toast.success("Security credentials updated successfully");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto py-2">
      <PageHeader
        title="Settings"
        description="Manage your personal profile, authentication credentials, security preferences, and alerts."
      />

      {/* ── Segmented Navigation Tabs ── */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer shrink-0 ${
            activeTab === "profile"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <User size={15} strokeWidth={1.8} />
          <span>Profile & Identity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer shrink-0 ${
            activeTab === "security"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Lock size={15} strokeWidth={1.8} />
          <span>Security & PIN</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer shrink-0 ${
            activeTab === "notifications"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Bell size={15} strokeWidth={1.8} />
          <span>Alerts & Notifications</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("preferences")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer shrink-0 ${
            activeTab === "preferences"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Sun size={15} strokeWidth={1.8} />
          <span>Preferences</span>
        </button>
      </div>

      {/* ── TAB 1: PROFILE & IDENTITY ── */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-6 animate-in fade-in duration-150">
          <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
            <h2 className="text-[15px] font-medium text-foreground tracking-tight">Personal & Account Holder Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullname" className="text-[12.5px] text-muted-foreground">
                  Full Legal Name
                </Label>
                <Input
                  id="fullname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 text-[13px]"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-[12.5px] text-muted-foreground">
                  Registered Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 text-[13px]"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone" className="text-[12.5px] text-muted-foreground">
                  Primary Mobile Phone
                </Label>
                <PhoneInput
                  id="phone"
                  value={phone}
                  onValueChange={setPhone}
                  className="h-10 text-[13px]"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ghana-card" className="text-[12.5px] text-muted-foreground flex items-center justify-between">
                  <span>Ghana Card Number (NIA)</span>
                  <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium">Verified</span>
                </Label>
                <Input
                  id="ghana-card"
                  value={ghanaCard}
                  disabled
                  className="h-10 text-[13px] font-mono bg-muted/30"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address" className="text-[12.5px] text-muted-foreground">
                Residential / Operating Address
              </Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-10 text-[13px]"
              />
            </div>

            {/* Proxy ID Card */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4 mt-1">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <User size={18} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-medium text-foreground">Proxy Pay ID</span>
                    <Badge variant="outline" className="text-[10.5px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      Active
                    </Badge>
                  </div>
                  <span className="text-[12px] text-muted-foreground font-mono">{proxyId}</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-[12px] h-8"
                onClick={() => {
                  navigator.clipboard.writeText(proxyId);
                  toast.success("Proxy ID copied to clipboard");
                }}
              >
                <Copy size={13} className="mr-1.5" />
                Copy
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="h-10 px-5 text-[13px]">
              Save Profile Changes
            </Button>
          </div>
        </form>
      )}

      {/* ── TAB 2: SECURITY & PIN ── */}
      {activeTab === "security" && (
        <form onSubmit={handleSaveSecurity} className="flex flex-col gap-6 animate-in fade-in duration-150">
          {/* Change Password Card */}
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
            <h2 className="text-[15px] font-medium text-foreground tracking-tight">Change Password</h2>

            <div className="flex flex-col gap-3.5 max-w-md">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="curr-pass" className="text-[12.5px] text-muted-foreground">
                  Current Password
                </Label>
                <Input
                  id="curr-pass"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-10 text-[13px]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-pass" className="text-[12.5px] text-muted-foreground">
                  New Password
                </Label>
                <Input
                  id="new-pass"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10 text-[13px]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="conf-pass" className="text-[12.5px] text-muted-foreground">
                  Confirm New Password
                </Label>
                <Input
                  id="conf-pass"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 text-[13px]"
                />
              </div>
            </div>
          </div>

          {/* Transaction PIN & Two-Factor */}
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
            <h2 className="text-[15px] font-medium text-foreground tracking-tight">Authentication & Authorisation</h2>

            <div className="divide-y divide-border/60">
              {/* PIN Item */}
              <div className="flex items-center justify-between py-3.5">
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-medium text-foreground">Transaction PIN</span>
                  <span className="text-[12px] text-muted-foreground">
                    Required to approve transfers, cardless codes, and bill payments.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[12px] h-8"
                  onClick={() => toast.success("OTP sent to your registered phone to reset PIN")}
                >
                  Reset PIN
                </Button>
              </div>

              {/* MFA Item */}
              <div className="flex items-center justify-between py-3.5">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-medium text-foreground">Two-Factor Authentication (MFA)</span>
                    <Badge variant="outline" className="text-[10.5px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      Enabled
                    </Badge>
                  </div>
                  <span className="text-[12px] text-muted-foreground">
                    SMS One-Time Passcode and Authenticator App verification on login.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[12px] h-8"
                  onClick={() => toast.info("MFA settings are enforced by bank security policy")}
                >
                  Manage
                </Button>
              </div>

              {/* Session Inactivity Timeout */}
              <div className="flex items-center justify-between py-3.5">
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-medium text-foreground">Inactivity Auto-Logout</span>
                  <span className="text-[12px] text-muted-foreground">
                    Automatically signs out session when browser window is idle.
                  </span>
                </div>
                <Select value={sessionTimeout} onValueChange={(val) => { if (val) setSessionTimeout(val); }}>
                  <SelectTrigger className="w-32 h-8 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Minutes</SelectItem>
                    <SelectItem value="15">15 Minutes</SelectItem>
                    <SelectItem value="30">30 Minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="h-10 px-5 text-[13px]">
              Update Security Credentials
            </Button>
          </div>
        </form>
      )}

      {/* ── TAB 3: ALERTS & NOTIFICATIONS ── */}
      {activeTab === "notifications" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-150">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
            <h2 className="text-[15px] font-medium text-foreground tracking-tight">Transaction Alerts & Delivery</h2>

            <div className="divide-y divide-border/60">
              <div className="flex items-center justify-between py-3.5">
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-medium text-foreground">SMS Transaction Alerts</span>
                  <span className="text-[12px] text-muted-foreground">Receive instant SMS for all account debits and credits.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSmsAlerts(!smsAlerts)}
                  className={`size-6 rounded-md flex items-center justify-center border transition-colors cursor-pointer ${
                    smsAlerts ? "bg-primary border-primary text-primary-foreground" : "border-border bg-muted/40"
                  }`}
                >
                  {smsAlerts && <Check size={14} strokeWidth={2.5} />}
                </button>
              </div>

              <div className="flex items-center justify-between py-3.5">
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-medium text-foreground">Email Transaction Receipts</span>
                  <span className="text-[12px] text-muted-foreground">Detailed PDF receipts dispatched immediately upon transaction execution.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailAlerts(!emailAlerts)}
                  className={`size-6 rounded-md flex items-center justify-center border transition-colors cursor-pointer ${
                    emailAlerts ? "bg-primary border-primary text-primary-foreground" : "border-border bg-muted/40"
                  }`}
                >
                  {emailAlerts && <Check size={14} strokeWidth={2.5} />}
                </button>
              </div>

              <div className="flex items-center justify-between py-3.5">
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-medium text-foreground">Monthly Electronic Statements</span>
                  <span className="text-[12px] text-muted-foreground">Receive encrypted monthly statements on the 1st of every month.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEStatements(!eStatements)}
                  className={`size-6 rounded-md flex items-center justify-center border transition-colors cursor-pointer ${
                    eStatements ? "bg-primary border-primary text-primary-foreground" : "border-border bg-muted/40"
                  }`}
                >
                  {eStatements && <Check size={14} strokeWidth={2.5} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              className="h-10 px-5 text-[13px]"
              onClick={() => toast.success("Notification preferences saved")}
            >
              Save Notification Preferences
            </Button>
          </div>
        </div>
      )}

      {/* ── TAB 4: PREFERENCES ── */}
      {activeTab === "preferences" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-150">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
            <h2 className="text-[15px] font-medium text-foreground tracking-tight">Display & Experience</h2>

            <div className="divide-y divide-border/60">
              {/* Color Theme */}
              <div className="flex items-center justify-between py-3.5">
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-medium text-foreground">Appearance Theme</span>
                  <span className="text-[12px] text-muted-foreground">Select between Light mode and Dark mode.</span>
                </div>
                <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-muted/20">
                  <button
                    type="button"
                    onClick={() => resolvedTheme !== "light" && switchTheme("light", () => setTheme("light"))}
                    className={`flex items-center gap-1.5 px-3 py-1 text-[12px] rounded-md transition-colors cursor-pointer ${
                      resolvedTheme === "light" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                  >
                    <Sun size={13} />
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => resolvedTheme !== "dark" && switchTheme("dark", () => setTheme("dark"))}
                    className={`flex items-center gap-1.5 px-3 py-1 text-[12px] rounded-md transition-colors cursor-pointer ${
                      resolvedTheme === "dark" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                  >
                    <Moon size={13} />
                    Dark
                  </button>
                </div>
              </div>

              {/* Amount Masking */}
              <div className="flex items-center justify-between py-3.5">
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-medium text-foreground">Cash Balance Visibility</span>
                  <span className="text-[12px] text-muted-foreground">
                    Currently: {showAmounts ? "Amounts visible on screen" : "Amounts masked (••••••)"}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[12px] h-8"
                  onClick={toggleAmountVisibility}
                >
                  {showAmounts ? <EyeOff size={14} className="mr-1.5" /> : <Eye size={14} className="mr-1.5" />}
                  {showAmounts ? "Mask Balances" : "Show Balances"}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              className="h-10 px-5 text-[13px]"
              onClick={() => toast.success("Preferences updated")}
            >
              Save Preferences
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
