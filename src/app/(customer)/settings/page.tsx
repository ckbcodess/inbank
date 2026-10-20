"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  Copy,
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
import { useTheme } from "next-themes";
import { switchTheme } from "@/lib/theme-transition";
import { forgetThisDevice, useTrustedDevice } from "@/lib/device-trust";
import { toast } from "sonner";
import { PhoneInput } from "@/components/ui/phone-input";

import { Field } from "@/components/ui/field";
type SettingsTab = "profile" | "security" | "notifications" | "preferences";

export default function SettingsPage() {
  const { actor } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const trustedDevice = useTrustedDevice();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Profile state
  const [name, setName] = useState(actor?.name || "Ransford Gyasi");
  const [email, setEmail] = useState(actor?.email || "ransford.gyasi@example.com");
  const [phone, setPhone] = useState(actor?.phone ? `+233 ${actor.phone.slice(1, 3)} ${actor.phone.slice(3, 6)} ${actor.phone.slice(6)}` : "+233 24 412 3821");
  const [ghanaCard] = useState("GHA-721840294-8");
  const [proxyId] = useState(actor?.name ? `GH-${actor.name.split(" ")[0].toUpperCase()}-01` : "GH-RANSFORD-01");
  const [address, setAddress] = useState("Plot 14, Senchi Street, Airport Residential Area, Accra");

  useEffect(() => {
    if (actor) {
      setName(actor.name);
      setEmail(actor.email);
      if (actor.phone) {
        setPhone(`+233 ${actor.phone.slice(1, 3)} ${actor.phone.slice(3, 6)} ${actor.phone.slice(6)}`);
      }
    }
  }, [actor]);

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
    <div className="flex flex-col gap-5 w-full max-w-4xl mx-auto py-2">
      <PageHeader
        title="Settings"
        description="Manage your personal profile, authentication credentials, security preferences, and alerts."
      />

      {/* ── Segmented Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer shrink-0 ${
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
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer shrink-0 ${
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
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer shrink-0 ${
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
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer shrink-0 ${
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
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-5 animate-in fade-in duration-150">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <h2 className="text-[15px] font-medium text-foreground tracking-tight">Personal & Account Holder Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full Legal Name" htmlFor="fullname">
                <Input
                  id="fullname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  
                  required
                />
</Field>

              <Field label="Registered Email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  
                  required
                />
</Field>

              <Field label="Primary Mobile Phone" htmlFor="phone">
                <PhoneInput
                  id="phone"
                  value={phone}
                  onValueChange={setPhone}
                  required
                />
</Field>

              <div className="flex flex-col gap-2">
                <Label htmlFor="ghana-card" className="flex items-center justify-between">
                  <span>Ghana Card Number (NIA)</span>
                  <span className="text-[10.5px] text-success-text font-medium">Verified</span>
                </Label>
                <Input
                  id="ghana-card"
                  value={ghanaCard}
                  disabled
                  className="bg-muted/30"
                />
              </div>
            </div>

            <Field label="Residential / Operating Address" optional htmlFor="address">
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                
              />
            </Field>

            {/* Proxy ID Card */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3 mt-1">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <User size={18} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-medium text-foreground">Proxy Pay ID</span>
                    <Badge variant="outline" className="text-[10.5px] border-success/30 text-success-text">
                      Active
                    </Badge>
                  </div>
                  <span className="text-[12px] text-muted-foreground">{proxyId}</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-[12px] h-7"
                onClick={() => {
                  navigator.clipboard.writeText(proxyId);
                  toast.success("Proxy ID copied to clipboard");
                }}
              >
                <Copy size={13} className="mr-2" />
                Copy
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="h-9 px-4 text-[13px]">
              Save Profile Changes
            </Button>
          </div>
        </form>
      )}

      {/* ── TAB 2: SECURITY & PIN ── */}
      {activeTab === "security" && (
        <form onSubmit={handleSaveSecurity} className="flex flex-col gap-5 animate-in fade-in duration-150">
          {/* Change Password Card */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <h2 className="text-[15px] font-medium text-foreground tracking-tight">Change Password</h2>

            <div className="flex flex-col gap-3 max-w-md">
              <Field label="Current Password" htmlFor="curr-pass">
                <Input
                  id="curr-pass"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  
                />
</Field>

              <Field label="New Password" htmlFor="new-pass">
                <Input
                  id="new-pass"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  
                />
</Field>

              <Field label="Confirm New Password" htmlFor="conf-pass">
                <Input
                  id="conf-pass"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  
                />
</Field>
            </div>
          </div>

          {/* Transaction PIN & Two-Factor */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <h2 className="text-[15px] font-medium text-foreground tracking-tight">Authentication & Authorisation</h2>

            <div className="divide-y divide-border/60">
              {/* PIN Item */}
              <div className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-medium text-foreground">Transaction PIN</span>
                  <span className="text-[12px] text-muted-foreground">
                    Required to approve transfers, cardless codes, and bill payments.
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[12px] h-7"
                  nativeButton={false}
                  render={<Link href="/forgot-pin" />}
                >
                  Reset PIN
                </Button>
              </div>

              {/* MFA Item */}
              <div className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-medium text-foreground">Two-Factor Authentication (MFA)</span>
                    <Badge variant="outline" className="text-[10.5px] border-success/30 text-success-text">
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
                  className="text-[12px] h-7"
                  onClick={() => toast.info("MFA settings are enforced by bank security policy")}
                >
                  Manage
                </Button>
              </div>

              {/* This device — the "Remember this device" choice, visible and reversible. */}
              <div className="flex items-center justify-between gap-3 py-3">
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-medium text-foreground">This device</span>
                  <span className="text-[12px] text-muted-foreground tabular">
                    {trustedDevice
                      ? `Remembered until ${new Date(trustedDevice.until).toLocaleDateString("en-GB", { day: "numeric", month: "long" })} — you log in here without a code.`
                      : "Not remembered — you'll confirm a code each time you log in here."}
                  </span>
                </div>
                {trustedDevice && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[12px] h-7 shrink-0"
                    onClick={() => {
                      forgetThisDevice();
                      toast.success("This device will ask for a code next time");
                    }}
                  >
                    Forget this device
                  </Button>
                )}
              </div>

              {/* Session Inactivity Timeout */}
              <div className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-medium text-foreground">Inactivity Auto-Logout</span>
                  <span className="text-[12px] text-muted-foreground">
                    Automatically signs out session when browser window is idle.
                  </span>
                </div>
                <Select value={sessionTimeout} onValueChange={(val) => { if (val) setSessionTimeout(val); }}>
                  <SelectTrigger className="w-28 h-7 text-[14px]">
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
            <Button type="submit" className="h-9 px-4 text-[13px]">
              Update Security Credentials
            </Button>
          </div>
        </form>
      )}

      {/* ── TAB 3: ALERTS & NOTIFICATIONS ── */}
      {activeTab === "notifications" && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-150">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <h2 className="text-[15px] font-medium text-foreground tracking-tight">Transaction Alerts & Delivery</h2>

            <div className="divide-y divide-border/60">
              <div className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-medium text-foreground">SMS Transaction Alerts</span>
                  <span className="text-[12px] text-muted-foreground">Receive instant SMS for all account debits and credits.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSmsAlerts(!smsAlerts)}
                  className={`size-5 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${
                    smsAlerts ? "bg-primary border-primary text-primary-foreground" : "border-border bg-muted/40"
                  }`}
                >
                  {smsAlerts && <Check size={14} strokeWidth={2.5} />}
                </button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-medium text-foreground">Email Transaction Receipts</span>
                  <span className="text-[12px] text-muted-foreground">Detailed PDF receipts dispatched immediately upon transaction execution.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailAlerts(!emailAlerts)}
                  className={`size-5 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${
                    emailAlerts ? "bg-primary border-primary text-primary-foreground" : "border-border bg-muted/40"
                  }`}
                >
                  {emailAlerts && <Check size={14} strokeWidth={2.5} />}
                </button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-medium text-foreground">Monthly Electronic Statements</span>
                  <span className="text-[12px] text-muted-foreground">Receive encrypted monthly statements on the 1st of every month.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEStatements(!eStatements)}
                  className={`size-5 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${
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
              className="h-9 px-4 text-[13px]"
              onClick={() => toast.success("Notification preferences saved")}
            >
              Save Notification Preferences
            </Button>
          </div>
        </div>
      )}

      {/* ── TAB 4: PREFERENCES ── */}
      {activeTab === "preferences" && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-150">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <h2 className="text-[15px] font-medium text-foreground tracking-tight">Display & Experience</h2>

            <div className="divide-y divide-border/60">
              {/* Color Theme */}
              <div className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-medium text-foreground">Appearance Theme</span>
                  <span className="text-[12px] text-muted-foreground">Select between Light mode and Dark mode.</span>
                </div>
                <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-muted/20">
                  <button
                    type="button"
                    onClick={() => switchTheme("light", () => setTheme("light"))}
                    className={`flex items-center gap-2 px-2 py-1 text-[12px] rounded-lg transition-colors cursor-pointer ${
                      resolvedTheme === "light" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                  >
                    <Sun size={13} />
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTheme("dark", () => setTheme("dark"))}
                    className={`flex items-center gap-2 px-2 py-1 text-[12px] rounded-lg transition-colors cursor-pointer ${
                      resolvedTheme === "dark" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                  >
                    <Moon size={13} />
                    Dark
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              className="h-9 px-4 text-[13px]"
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
