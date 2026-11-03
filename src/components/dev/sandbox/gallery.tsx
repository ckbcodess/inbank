"use client";

/**
 * The sandbox's specimens: every shared UI component in each of its states, grouped into tabs. Each specimen is the real
 * component (never a copy), so tuning a token in the side panel moves exactly what the app shows. Add a component here
 * when it joins `components/ui`, so the sandbox stays the one place to see the whole design system.
 */

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ArrowRight, Bell, Check, Download, Info, Landmark, Plus, Search, Send, Settings, Trash2, Wallet } from "@/components/ui/icons";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Modal } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { InlineError } from "@/components/ui/inline-error";
import { Input } from "@/components/ui/input";
import { ListCard } from "@/components/ui/list-card";
import AppLoader from "@/components/ui/loader";
import { MultiChoice } from "@/components/ui/multi-choice";
import { OptionTile } from "@/components/ui/option-tile";
import { PhoneInput } from "@/components/ui/phone-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RangePills } from "@/components/ui/range-pills";
import { ReviewSummary } from "@/components/ui/review-summary";
import { SectionHeading } from "@/components/ui/section-heading";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { StepBar } from "@/components/ui/step-bar";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ToggleTile } from "@/components/ui/toggle-tile";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { AmountInput } from "@/components/payments/flows/shared";

/** A titled group of specimens. Whitespace separates them; nothing is boxed. */
function Specimen({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-[16px] font-medium">{title}</h3>
        {note && <p className="text-[12px] text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

const Wrap = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`flex flex-wrap items-center gap-3 ${className}`}>{children}</div>
);

/* ── Buttons ─────────────────────────────────────────────────────────────── */

const BUTTON_VARIANTS = ["default", "outline", "secondary", "ghost", "tile", "destructive", "link"] as const;
const BUTTON_SIZES = ["xs", "sm", "default", "md", "xl"] as const;

export function ButtonsTab() {
  return (
    <div className="flex flex-col gap-10">
      <Specimen title="Variants" note="Default is the one primary action on a surface.">
        <Wrap>
          {BUTTON_VARIANTS.map((v) => (
            <Button key={v} variant={v} size="md">
              {v[0].toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </Wrap>
      </Specimen>
      <Specimen title="Sizes" note="Heights come from the control scale, so a button beside a field lines up.">
        <Wrap>
          {BUTTON_SIZES.map((s) => (
            <Button key={s} size={s}>
              {s}
            </Button>
          ))}
        </Wrap>
      </Specimen>
      <Specimen title="Every variant at every size">
        <div className="flex flex-col gap-3">
          {BUTTON_VARIANTS.map((v) => (
            <Wrap key={v} className="gap-2">
              <span className="w-24 text-[12px] text-muted-foreground">{v}</span>
              {BUTTON_SIZES.map((s) => (
                <Button key={s} variant={v} size={s}>
                  Label
                </Button>
              ))}
            </Wrap>
          ))}
        </div>
      </Specimen>
      <Specimen title="With an icon">
        <Wrap>
          <Button size="md">
            <Send aria-hidden="true" />
            Send money
          </Button>
          <Button size="md" variant="outline">
            Continue
            <ArrowRight aria-hidden="true" />
          </Button>
          <Button size="md" variant="secondary">
            <Download aria-hidden="true" />
            Statement
          </Button>
          <Button size="md" variant="destructive">
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        </Wrap>
      </Specimen>
      <Specimen title="Icon only">
        <Wrap>
          <Button size="icon-xs" variant="outline" aria-label="Add">
            <Plus />
          </Button>
          <Button size="icon-sm" variant="outline" aria-label="Notifications">
            <Bell />
          </Button>
          <Button size="icon-lg" variant="outline" aria-label="Settings">
            <Settings />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Search">
            <Search />
          </Button>
        </Wrap>
      </Specimen>
      <Specimen title="States">
        <Wrap>
          <Button size="md" disabled>
            Disabled
          </Button>
          <Button size="md" loading>
            Loading
          </Button>
          <Button size="md" variant="outline" loading>
            Loading
          </Button>
          <Button size="md" variant="outline" disabled>
            Disabled
          </Button>
        </Wrap>
      </Specimen>
      <Specimen title="Full width, flow action">
        <Button size="xl" className="w-full">
          Proceed
        </Button>
      </Specimen>
    </div>
  );
}

/* ── Fields ──────────────────────────────────────────────────────────────── */

export function FieldsTab() {
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [bad, setBad] = useState("12");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [pick, setPick] = useState("");
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="flex flex-col gap-5">
        <Specimen title="Text">
          <Field label="Account Name">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="For example, Rent" />
          </Field>
          <Field label="Reference" optional>
            <Input placeholder="Optional note" />
          </Field>
          <Field label="Disabled">
            <Input disabled value="Not editable" readOnly />
          </Field>
          <Field label="With an error" error={bad.length < 3 ? "Enter at least three characters." : null}>
            <Input value={bad} onChange={(e) => setBad(e.target.value)} aria-invalid={bad.length < 3} />
          </Field>
          <Field label="Message">
            <Textarea placeholder="Write something" rows={3} />
          </Field>
        </Specimen>
      </div>
      <div className="flex flex-col gap-5">
        <Specimen title="Amount">
          <AmountInput value={amount} onChange={setAmount} label="Amount" />
          <AmountInput value="250000000" onChange={() => {}} label="With an error" hasError error={<InlineError message="The amount is above your limit." className="text-left" />} />
        </Specimen>
        <Specimen title="Pickers">
          <Field label="Bank">
            <Select value={pick} onValueChange={(v) => v && setPick(v)}>
              <SelectTrigger aria-label="Bank">
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                {["GCB Bank", "Ecobank", "Stanbic", "Absa"].map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Phone Number">
            <PhoneInput value={phone} onValueChange={setPhone} />
          </Field>
          <Field label="Date">
            <DatePicker value={date} onChange={setDate} placeholder="Pick a date" />
          </Field>
        </Specimen>
      </div>
    </div>
  );
}

/* ── Selection ───────────────────────────────────────────────────────────── */

export function SelectionTab() {
  const [seg, setSeg] = useState("monthly");
  const [range, setRange] = useState("30d");
  const [multi, setMulti] = useState<string[]>(["Salary"]);
  const [tile, setTile] = useState("91");
  const [on, setOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [toggle, setToggle] = useState(true);
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="flex flex-col gap-8">
        <Specimen title="Segmented control">
          <SegmentedControl
            aria-label="Frequency"
            value={seg}
            onChange={setSeg}
            options={[
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
              { value: "yearly", label: "Yearly" },
            ]}
          />
          <SegmentedControl aria-label="Frequency, full width" fullWidth value={seg} onChange={setSeg} options={[{ value: "monthly", label: "Pay in Full" }, { value: "weekly", label: "Pay in Bits" }]} />
        </Specimen>
        <Specimen title="Range pills">
          <RangePills aria-label="Range" options={["7d", "30d", "90d", "1y"] as const} value={range as "7d"} onChange={setRange} />
        </Specimen>
        <Specimen title="Multi choice">
          <MultiChoice aria-label="Sources" options={["Salary", "Business", "Gifts", "Savings"]} value={multi} onChange={setMulti} />
        </Specimen>
        <Specimen title="Checkbox and switch">
          <Wrap>
            <label className="flex items-center gap-2 text-[14px]">
              <Checkbox checked={checked} onCheckedChange={setChecked} /> Remember me
            </label>
            <label className="flex items-center gap-2 text-[14px]">
              <Checkbox disabled /> Disabled
            </label>
            <label className="flex items-center gap-2 text-[14px]">
              <Switch checked={on} onCheckedChange={setOn} /> Hide amounts
            </label>
            <label className="flex items-center gap-2 text-[14px]">
              <Switch disabled /> Disabled
            </label>
          </Wrap>
        </Specimen>
      </div>
      <div className="flex flex-col gap-8">
        <Specimen title="Option tiles">
          <div role="radiogroup" aria-label="Deposit period" className="flex flex-col gap-2">
            {[
              { v: "91", t: "91 days", d: "Matures 07 Jan 2027", r: "12.5%" },
              { v: "182", t: "182 days", d: "Matures 08 Apr 2027", r: "13.5%" },
              { v: "364", t: "364 days", d: "Matures 07 Oct 2027", r: "15%" },
            ].map((o) => (
              <OptionTile key={o.v} title={o.t} detail={o.d} value={o.r} selected={tile === o.v} onSelect={() => setTile(o.v)} />
            ))}
          </div>
        </Specimen>
        <Specimen title="Toggle tiles">
          <ToggleTile icon={Wallet} title="Online payments" checked={toggle} onCheckedChange={setToggle} />
          <ToggleTile variant="row" title="Show on dashboard" checked={toggle} onCheckedChange={setToggle} />
        </Specimen>
        <Specimen title="Step bar" note="The compact form sits in a page header.">
          <StepBar current={2} total={4} />
          <StepBar current={2} total={4} compact />
        </Specimen>
      </div>
    </div>
  );
}

/* ── Overlays ────────────────────────────────────────────────────────────── */

export function OverlaysTab() {
  const [dialog, setDialog] = useState(false);
  return (
    <div className="flex flex-col gap-10">
      <Specimen title="Dialog">
        <Wrap>
          <Button variant="outline" size="md" onClick={() => setDialog(true)}>
            Open dialog
          </Button>
        </Wrap>
        <Modal
          open={dialog}
          onOpenChange={setDialog}
          title="Personal Loan"
          size="sm"
          footer={
            <>
              <Button variant="outline" size="md" onClick={() => setDialog(false)}>
                Cancel
              </Button>
              <Button size="md" onClick={() => setDialog(false)}>
                Proceed
              </Button>
            </>
          }
        >
          <p className="text-[14px] leading-relaxed">You will be redirected to our Loan Origination Solution (LOS) to continue your loan application.</p>
        </Modal>
      </Specimen>
      <Specimen title="Sheet">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="md" className="w-fit" />}>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Transaction</SheetTitle>
            </SheetHeader>
            <SheetBody>
              <p className="text-[14px] text-muted-foreground">Details sit here.</p>
            </SheetBody>
          </SheetContent>
        </Sheet>
      </Specimen>
      <Specimen title="Menu">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="md" className="w-fit" />}>Account</DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Ransford Gyasi</DropdownMenuLabel>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Help and Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Specimen>
      <Specimen title="Popover and tooltip">
        <Wrap>
          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="md" />}>Open popover</PopoverTrigger>
            <PopoverContent className="w-64 text-[13px]">Tenor is how long the money is held.</PopoverContent>
          </Popover>
          <SimpleTooltip content="Branch and ATM locator" side="bottom">
            <Button variant="ghost" size="icon-sm" aria-label="Info">
              <Info />
            </Button>
          </SimpleTooltip>
        </Wrap>
      </Specimen>
      <Specimen title="Toasts">
        <Wrap>
          <Button variant="outline" size="md" onClick={() => toast.success("Transfer sent")}>
            Success
          </Button>
          <Button variant="outline" size="md" onClick={() => toast.error("Payment failed")}>
            Error
          </Button>
          <Button variant="outline" size="md" onClick={() => toast.info("Opening the Loan Origination Solution")}>
            Info
          </Button>
        </Wrap>
      </Specimen>
    </div>
  );
}

/* ── Data ────────────────────────────────────────────────────────────────── */

const ROWS = [
  { name: "Melcom Stores", date: "02 Nov", amount: "-GHS 240.00", status: "Done" },
  { name: "Monthly Salary", date: "01 Nov", amount: "GHS 8,500.00", status: "Done" },
  { name: "Transfer to Savings", date: "30 Oct", amount: "-GHS 1,000.00", status: "Pending" },
];

export function DataTab() {
  return (
    <div className="flex flex-col gap-10">
      <Specimen title="Badges">
        <Wrap>
          {(["default", "secondary", "success", "warning", "destructive", "info", "outline", "brand"] as const).map((v) => (
            <Badge key={v} variant={v}>
              {v}
            </Badge>
          ))}
          <Badge size="md" variant="success">
            Medium
          </Badge>
        </Wrap>
      </Specimen>
      <Specimen title="Avatars">
        <Wrap>
          <Avatar size="sm">
            <AvatarFallback>RG</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>RG</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>RG</AvatarFallback>
          </Avatar>
          <AvatarGroup>
            {["AB", "KM", "ES"].map((i) => (
              <Avatar key={i}>
                <AvatarFallback>{i}</AvatarFallback>
              </Avatar>
            ))}
          </AvatarGroup>
        </Wrap>
      </Specimen>
      <Specimen title="List card" note="Rows separate with whitespace and a rounded hover inset.">
        <ListCard>
          {ROWS.map((r) => (
            <li key={r.name} className="flex items-center justify-between gap-3 px-3 py-3">
              <span className="flex flex-col">
                <span className="text-[14px]">{r.name}</span>
                <span className="text-[12px] text-muted-foreground">{r.date}</span>
              </span>
              <span className="tabular text-[14px]">{r.amount}</span>
            </li>
          ))}
        </ListCard>
      </Specimen>
      <Specimen title="Table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((r) => (
              <TableRow key={r.name}>
                <TableCell>{r.name}</TableCell>
                <TableCell className="tabular">{r.date}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "Done" ? "success" : "warning"}>{r.status}</Badge>
                </TableCell>
                <TableCell className="tabular text-right">{r.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Specimen>
      <Specimen title="Review summary">
        <ReviewSummary
          details={[
            { label: "From", value: "Savings Account · 4001 9922 1100" },
            { label: "Deposit period", value: "91 days" },
            { label: "Interest rate", value: "12.5%", tabular: true },
          ]}
          total="GHS 5,000.00"
          totalLabel="You deposit"
        />
      </Specimen>
      <Specimen title="Section heading">
        <SectionHeading title="Recent Activity" action={<Button variant="ghost" size="sm">See all</Button>} />
      </Specimen>
    </div>
  );
}

/* ── Charts ──────────────────────────────────────────────────────────────── */

const MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"].map((m, i) => ({
  m,
  income: [8200, 8500, 8500, 9100, 8500, 9300][i],
  expense: [5400, 6100, 5900, 7200, 6400, 5100][i],
}));
const SLICES = [
  { k: "Groceries", v: 32, c: "var(--cat-1)" },
  { k: "Shopping", v: 15, c: "var(--cat-2)" },
  { k: "Transport", v: 12, c: "var(--cat-3)" },
  { k: "Utilities", v: 10, c: "var(--cat-4)" },
  { k: "Cash", v: 14, c: "var(--cat-5)" },
  { k: "Other", v: 17, c: "var(--cat-other)" },
];
const CONFIG = { income: { label: "Money in", color: "var(--cat-1)" }, expense: { label: "Money out", color: "var(--cat-2)" } } satisfies ChartConfig;

export function ChartsTab() {
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <Specimen title="Grouped columns" note="Two magnitudes per period, one axis.">
        <ChartContainer config={CONFIG} className="h-56 w-full">
          <BarChart data={MONTHS}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="m" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="income" fill="var(--color-income)" radius={4} />
            <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
          </BarChart>
        </ChartContainer>
      </Specimen>
      <Specimen title="Donut" note="Categories keep their colour; the sixth and later fold into Other.">
        <div className="flex items-center gap-6">
          <ChartContainer config={{}} className="aspect-square w-44">
            <PieChart>
              <Pie data={SLICES} dataKey="v" nameKey="k" innerRadius="62%" outerRadius="94%" paddingAngle={2} stroke="var(--card)">
                {SLICES.map((s) => (
                  <Cell key={s.k} fill={s.c} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="flex flex-col gap-1 text-[13px]">
            {SLICES.map((s) => (
              <li key={s.k} className="flex items-center gap-2">
                <span aria-hidden="true" className="size-2 rounded-full" style={{ background: s.c }} />
                {s.k}
                <span className="tabular text-muted-foreground">{s.v}%</span>
              </li>
            ))}
          </ul>
        </div>
      </Specimen>
      <Specimen title="Line">
        <ChartContainer config={CONFIG} className="h-56 w-full">
          <LineChart data={MONTHS}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="m" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line dataKey="income" stroke="var(--color-income)" strokeWidth={2} dot={false} />
            <Line dataKey="expense" stroke="var(--color-expense)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </Specimen>
      <Specimen title="Area">
        <ChartContainer config={CONFIG} className="h-56 w-full">
          <AreaChart data={MONTHS}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="m" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area dataKey="income" stroke="var(--color-income)" fill="var(--color-income)" fillOpacity={0.18} />
          </AreaChart>
        </ChartContainer>
      </Specimen>
    </div>
  );
}

/* ── Feedback ────────────────────────────────────────────────────────────── */

export function FeedbackTab() {
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="flex flex-col gap-8">
        <Specimen title="Inline error" note="For what the person just typed.">
          <InlineError message="That account number is not recognised." className="text-left" />
        </Specimen>
        <Specimen title="Loader">
          <Wrap>
            <AppLoader size={16} />
            <AppLoader size={24} />
            <AppLoader size={36} />
          </Wrap>
        </Specimen>
        <Specimen title="Skeleton">
          <div className="flex flex-col gap-3" aria-hidden="true">
            <div className="h-5 w-40 animate-pulse rounded-lg bg-muted" />
            <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
            <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
          </div>
        </Specimen>
      </div>
      <div className="flex flex-col gap-8">
        <Specimen title="Empty state">
          <div className="flex flex-col items-start gap-3">
            <Landmark size={24} aria-hidden="true" className="text-muted-foreground" />
            <p className="text-[14px]">No loans yet.</p>
            <p className="text-[13px] text-muted-foreground">When you take one, it shows up here with what is due and when.</p>
            <Button size="md" variant="outline">
              <Check aria-hidden="true" />
              Apply for a loan
            </Button>
          </div>
        </Specimen>
      </div>
    </div>
  );
}

/* ── Type ────────────────────────────────────────────────────────────────── */

export function TypeTab() {
  return (
    <div className="flex flex-col gap-10">
      <Specimen title="Scale" note="Open Sans, two weights: regular and medium.">
        <div className="flex flex-col gap-4">
          <p className="type-page-title font-medium tracking-[var(--ls-heading)]">Page title, 18 to 22</p>
          <p className="tabular text-[40px] tracking-[var(--ls-heading)]">GHS 18,070.50</p>
          <p className="tabular text-[32px] tracking-[var(--ls-heading)]">GHS 18,070.50</p>
          <p className="tabular text-[20px]">Key-fact value, 20</p>
          <p className="text-[16px] font-medium">Section heading, 16 medium</p>
          <p className="text-[14px]">Row primary text and form values, 14</p>
          <p className="text-[13px]">Body and table cells, 13</p>
          <p className="text-[13px] font-medium">Form label, 13 medium</p>
          <p className="text-[12px] text-muted-foreground">Meta and captions, 12 muted</p>
          <p className="max-w-prose text-[13px] leading-relaxed text-muted-foreground">
            Long-form paragraphs take relaxed leading. A transfer that lands on the same day is stated as a fact, and what it costs is shown before the person commits.
          </p>
        </div>
      </Specimen>
      <Specimen title="Tracking tokens">
        <div className="flex flex-col gap-2 text-[20px]">
          <p className="tracking-[var(--ls-tight)]">Tight, card titles and row names</p>
          <p className="tracking-[var(--ls-heading)]">Heading, page titles and figures</p>
          <p className="tracking-[var(--ls-display)]">Display, the biggest numbers</p>
          <p className="tracking-[var(--ls-label)]">Label, initials and codes</p>
        </div>
      </Specimen>
    </div>
  );
}

/* ── Surfaces ────────────────────────────────────────────────────────────── */

const SWATCHES = ["background", "card", "muted", "tile", "field", "modal", "menu", "primary", "foreground", "muted-foreground", "border", "success", "warning", "destructive", "info"];

export function SurfacesTab() {
  return (
    <div className="flex flex-col gap-10">
      <Specimen title="Radius" note="Five steps plus full.">
        <Wrap className="items-end">
          {["rounded-sm", "rounded-lg", "rounded-xl", "rounded-2xl", "rounded-3xl", "rounded-full"].map((r) => (
            <div key={r} className="flex flex-col items-center gap-2">
              <div className={`size-16 bg-muted ${r}`} />
              <span className="text-[12px] text-muted-foreground">{r.replace("rounded-", "")}</span>
            </div>
          ))}
        </Wrap>
      </Specimen>
      <Specimen title="Elevation" note="Button, card, menu and dialog shadows.">
        <Wrap className="gap-5">
          {["button", "card", "menu", "modal"].map((s) => (
            <div key={s} style={{ boxShadow: `var(--shadow-${s})` }} className="flex h-20 w-32 items-center justify-center rounded-2xl bg-card text-[13px]">
              {s}
            </div>
          ))}
        </Wrap>
      </Specimen>
      <Specimen title="Colour tokens" note="Change them in the colour tuner (header).">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {SWATCHES.map((s) => (
            <div key={s} className="flex flex-col gap-1">
              <div className="h-12 rounded-xl border border-border/60" style={{ background: `var(--${s})` }} />
              <span className="text-[12px] text-muted-foreground">{s}</span>
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen title="Categorical">
        <Wrap>
          {["cat-1", "cat-2", "cat-3", "cat-4", "cat-5", "cat-other"].map((c) => (
            <div key={c} className="flex flex-col items-center gap-1">
              <div className="size-10 rounded-full" style={{ background: `var(--${c})` }} />
              <span className="text-[12px] text-muted-foreground">{c}</span>
            </div>
          ))}
        </Wrap>
      </Specimen>
    </div>
  );
}
