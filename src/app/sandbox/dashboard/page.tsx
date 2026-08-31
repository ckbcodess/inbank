"use client";

/**
 * Pixel-Perfect Implementation of Figma Node 315:53320 (NIBS — New Internet Banking Solution)
 * Route: /sandbox/dashboard
 *
 * 1:1 Design Language Specs:
 * - Left Sidebar (w-64, dark neutral background, Section headers: BANKING, MOVE MONEY, REFERENCE)
 * - Clean White Canvas with Header (Personal Banking switcher, Dev Mode pill, Notification badge, Eye amount toggle, AS user menu)
 * - Greeting ("Good day, Ama", Date subline "Thursday, August 15")
 * - Hero Balance ("Total available", large "GH₵ 18,070.50")
 * - Action Tiles Row (Customize pill + 4 Distinctive White Action Cards:
 *    1. Send money (with icon)
 *    2. Pay Bill (with icon)
 *    3. Quick pay (with icon)
 *    4. View Loans (with icon)
 * - Split Section 1:
 *    * Left: Accounts (Personal Savings, Personal Current 1, Personal Current 2 with masked/unmasked balances)
 *    * Right: Your cards (Visa Personal Debit with Block button, Mastercard Virtual with Block & Fund card buttons)
 * - Split Section 2: "Where your money goes"
 *    * Left: Monthly Spending Rhythm Bar Chart (Sep - Aug) with Money in, Money out, Net metrics
 *    * Right: Spending by category (Donut + Groceries 32%, Shopping 15%, Cash & MoMo 14%, Transport 12%, Utilities 10%, Other 18%)
 * - Full-Width Section: "Today's rates" (FX Converter: USD -> GHS with "You get approximately", Bank buys at 11.4200 +0.34% today, Continue to transfer)
 * - Full-Width Section: "Recent activity" (Melcom Stores, Monthly Salary Credit, Transfer to Savings, Amazon Checkout, MTN MoMo)
 */

import { useState } from "react";
import Link from "next/link";
import { 
  Home, 
  CreditCard, 
  Send, 
  Receipt, 
  Zap, 
  Briefcase, 
  FileText, 
  SlidersHorizontal, 
  ChevronRight, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Bell, 
  Sun, 
  Moon,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Lock,
  Unlock,
  Plus,
  Building2,
  Wallet,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function FigmaDesignFidelityDashboard() {
  const [showAmounts, setShowAmounts] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState("Overview");
  const [fxAmount, setFxAmount] = useState("1000");
  const [fxCurrency, setFxCurrency] = useState("USD");
  const [blockedCards, setBlockedCards] = useState<Record<string, boolean>>({});

  // Modals
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTitle, setTransferTitle] = useState("Send money");

  function toggleBlock(cardId: string) {
    setBlockedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
  }

  function openAction(title: string) {
    setTransferTitle(title);
    setTransferOpen(true);
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1c2024] font-sans antialiased flex flex-col md:flex-row">
      
      {/* ============================================================
          1. FIGMA SIDEBAR (Node 315:53322)
          ============================================================ */}
      <aside className={`bg-[#ffffff] border-r border-[#e8ecef] flex flex-col justify-between shrink-0 transition-all duration-200 ${sidebarCollapsed ? "w-16" : "w-64"}`}>
        <div className="flex flex-col">
          
          {/* Logo container */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-[#e8ecef]">
            <div className="flex items-center gap-2.5">
              <div className="size-6 rounded-md bg-[#18181b] text-white flex items-center justify-center font-black text-xs">
                ⇗
              </div>
              {!sidebarCollapsed && (
                <span className="font-bold text-sm tracking-tight text-[#18181b]">NIBS</span>
              )}
            </div>
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-md text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5] transition-colors"
              title="Collapse sidebar"
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-3 space-y-6 text-xs">
            
            {/* Group 1: BANKING */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8c9ba5] mb-2">
                  Banking
                </p>
              )}
              {[
                { name: "Overview", icon: Home },
                { name: "Accounts", icon: Landmark },
                { name: "Transactions", icon: FileText },
                { name: "Cards", icon: CreditCard },
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeNav === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveNav(item.name)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs transition-colors ${
                      isActive 
                        ? "bg-[#f1f3f5] text-[#18181b] font-semibold" 
                        : "text-[#5d7079] hover:text-[#18181b] hover:bg-[#f8f9fa]"
                    }`}
                  >
                    <Icon size={16} strokeWidth={isActive ? 2.2 : 1.75} className={isActive ? "text-[#18181b]" : "text-[#71717a]"} />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </button>
                );
              })}
            </div>

            {/* Group 2: MOVE MONEY */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8c9ba5] mb-2">
                  Move Money
                </p>
              )}
              <button
                onClick={() => setActiveNav("Payments")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs transition-colors ${
                  activeNav === "Payments" 
                    ? "bg-[#f1f3f5] text-[#18181b] font-semibold" 
                    : "text-[#5d7079] hover:text-[#18181b] hover:bg-[#f8f9fa]"
                }`}
              >
                <Send size={16} strokeWidth={1.75} className="text-[#71717a]" />
                {!sidebarCollapsed && <span>Payments</span>}
              </button>
            </div>

            {/* Group 3: REFERENCE */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8c9ba5] mb-2">
                  Reference
                </p>
              )}
              <button
                onClick={() => setActiveNav("Reports")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs text-[#5d7079] hover:text-[#18181b] hover:bg-[#f8f9fa] transition-colors"
              >
                <FileText size={16} strokeWidth={1.75} className="text-[#71717a]" />
                {!sidebarCollapsed && <span>Reports</span>}
              </button>
              <button
                onClick={() => setActiveNav("FX rates")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs text-[#5d7079] hover:text-[#18181b] hover:bg-[#f8f9fa] transition-colors"
              >
                <Zap size={16} strokeWidth={1.75} className="text-[#71717a]" />
                {!sidebarCollapsed && <span>FX rates</span>}
              </button>
            </div>

          </div>
        </div>

        {/* User Account / Profile at bottom */}
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-[#e8ecef]">
            <div className="p-2 rounded-xl hover:bg-[#f4f4f5] flex items-center gap-2.5 cursor-pointer transition-colors">
              <div className="size-8 rounded-full bg-[#18181b] text-white flex items-center justify-center font-bold text-xs">
                AS
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#18181b] truncate">Ama Serwaa</p>
                <p className="text-[10px] text-[#71717a]">Retail Customer</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ============================================================
          2. MAIN VIEWPORT & FIGMA SPEC SHEET (Node 315:53443)
          ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header Bar (Node 315:53400) */}
        <header className="h-14 bg-white border-b border-[#e8ecef] px-6 lg:px-10 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs">
            <div className="size-2 rounded-full bg-[#10b981]" />
            <span className="font-semibold text-[#18181b]">Personal Banking</span>
            <span className="text-[#71717a] font-mono text-[11px] bg-[#f4f4f5] px-2 py-0.5 rounded-md">
              Personal · •••• 4821
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 bg-[#f4f4f5] px-2.5 py-1 rounded-md text-[11px] font-mono font-medium text-[#71717a]">
              <span>Dev Mode</span>
              <span className="text-[#18181b] font-bold">13.9</span>
            </div>

            <button className="size-8 rounded-md hover:bg-[#f4f4f5] flex items-center justify-center text-[#71717a] relative">
              <Bell size={15} />
              <span className="size-1.5 rounded-full bg-[#ef4444] absolute top-1.5 right-1.5" />
            </button>

            <button 
              onClick={() => setShowAmounts(!showAmounts)}
              className="size-8 rounded-md hover:bg-[#f4f4f5] flex items-center justify-center text-[#71717a]"
              title="Toggle cash amounts visibility"
            >
              {showAmounts ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </div>
        </header>

        {/* Content Container (Node 315:53444) */}
        <main className="max-w-5xl w-full mx-auto px-6 lg:px-12 py-10 space-y-10">
          
          {/* Greeting Section (Node 315:53445) */}
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#18181b]">Good day, Ama</h1>
            <p className="text-xs text-[#71717a]">Thursday, August 15</p>
          </div>

          {/* Total Available Hero (Node 315:53452) */}
          <section className="space-y-1">
            <span className="text-xs font-medium text-[#71717a]">Total available</span>
            <div className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tight text-[#18181b] tabular">
              {showAmounts ? "GH₵ 18,070.50" : "GH₵ ••••••"}
            </div>
          </section>

          {/* 4 Action Cards Row (Node 315:53457) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#71717a]">Frequent Actions</span>
              <button 
                onClick={() => alert("Customize actions")}
                className="text-xs text-[#71717a] hover:text-[#18181b] flex items-center gap-1"
              >
                <SlidersHorizontal size={12} />
                Customize
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              
              {/* Action 1: Send money */}
              <button
                onClick={() => openAction("Send money")}
                className="p-5 rounded-2xl bg-white border border-[#e8ecef] hover:border-[#18181b] text-left flex flex-col justify-between h-32 transition-all hover:shadow-xs active:scale-[0.97]"
              >
                <div className="size-8 rounded-xl bg-[#f4f4f5] flex items-center justify-center text-[#18181b]">
                  <Send size={15} />
                </div>
                <span className="text-sm font-bold text-[#18181b]">Send money</span>
              </button>

              {/* Action 2: Pay Bill */}
              <button
                onClick={() => openAction("Pay Bill")}
                className="p-5 rounded-2xl bg-white border border-[#e8ecef] hover:border-[#18181b] text-left flex flex-col justify-between h-32 transition-all hover:shadow-xs active:scale-[0.97]"
              >
                <div className="size-8 rounded-xl bg-[#f4f4f5] flex items-center justify-center text-[#18181b]">
                  <Receipt size={15} />
                </div>
                <span className="text-sm font-bold text-[#18181b]">Pay Bill</span>
              </button>

              {/* Action 3: Quick pay */}
              <button
                onClick={() => openAction("Quick pay")}
                className="p-5 rounded-2xl bg-white border border-[#e8ecef] hover:border-[#18181b] text-left flex flex-col justify-between h-32 transition-all hover:shadow-xs active:scale-[0.97]"
              >
                <div className="size-8 rounded-xl bg-[#f4f4f5] flex items-center justify-center text-[#18181b]">
                  <Zap size={15} />
                </div>
                <span className="text-sm font-bold text-[#18181b]">Quick pay</span>
              </button>

              {/* Action 4: View Loans */}
              <button
                onClick={() => alert("Viewing loans and credit facilities")}
                className="p-5 rounded-2xl bg-white border border-[#e8ecef] hover:border-[#18181b] text-left flex flex-col justify-between h-32 transition-all hover:shadow-xs active:scale-[0.97]"
              >
                <div className="size-8 rounded-xl bg-[#f4f4f5] flex items-center justify-center text-[#18181b]">
                  <Briefcase size={15} />
                </div>
                <span className="text-sm font-bold text-[#18181b]">View Loans</span>
              </button>

            </div>
          </section>

          {/* ============================================================
              SPLIT SECTION 1: Accounts & Your Cards (Node 315:53514)
              ============================================================ */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Accounts Panel (Node 315:53516) */}
            <div className="bg-white rounded-2xl border border-[#e8ecef] shadow-2xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-[#f1f3f5] flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#18181b]">Accounts</h2>
                  <Link href="/accounts" className="text-xs text-[#71717a] hover:text-[#18181b] hover:underline">
                    View all accounts
                  </Link>
                </div>

                <div className="divide-y divide-[#f8f9fa]">
                  {[
                    { name: "Personal Savings Account", type: "Savings", num: "4001 9922 1100", amount: "GH₵ 12,340.00" },
                    { name: "Personal Current Account", type: "Current", num: "4001 9922 3344", amount: "GH₵ 5,730.50" },
                    { name: "Investment Pot", type: "Fixed Deposit", num: "4001 9922 8899", amount: "GH₵ 0.00" },
                  ].map(acc => (
                    <div key={acc.name} className="p-4 flex items-center justify-between hover:bg-[#fafafa] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-[#f4f4f5] flex items-center justify-center text-[#71717a]">
                          <Landmark size={15} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#18181b]">{acc.name}</p>
                          <p className="text-[11px] text-[#71717a] font-mono">{acc.type} · {acc.num}</p>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <p className="text-xs font-bold text-[#18181b]">
                          {showAmounts ? acc.amount : "GH₵ ••••••"}
                        </p>
                        <span className="text-[10px] text-[#71717a] font-sans">available</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cards Panel (Node 315:53601) */}
            <div className="bg-white rounded-2xl border border-[#e8ecef] shadow-2xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-[#f1f3f5] flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#18181b]">Your cards</h2>
                  <Link href="/cards" className="text-xs text-[#71717a] hover:text-[#18181b] hover:underline">
                    View all cards
                  </Link>
                </div>

                <div className="divide-y divide-[#f8f9fa] p-2 space-y-2">
                  {[
                    { id: "c1", name: "Visa Personal Debit", scheme: "VISA", type: "Visa Debit · •••• 9102", fundable: false },
                    { id: "c2", name: "Mastercard Virtual Prepaid", scheme: "MASTERCARD", type: "Virtual · •••• 4821", fundable: true },
                  ].map(c => {
                    const isBlocked = blockedCards[c.id];

                    return (
                      <div key={c.id} className="p-3 rounded-xl border border-[#e8ecef] bg-[#fafafa] flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-7 rounded-md bg-[#18181b] text-white flex items-center justify-center font-bold text-[9px] tracking-tight shrink-0 font-mono">
                            {c.scheme}
                          </div>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs font-bold text-[#18181b]">{c.name}</p>
                              <p className="text-[11px] text-[#71717a] font-mono">{c.type}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleBlock(c.id)}
                                className="h-6 text-[11px] px-2 rounded-md gap-1"
                              >
                                {isBlocked ? <Unlock size={11} /> : <Lock size={11} />}
                                {isBlocked ? "Unblock" : "Block"}
                              </Button>
                              {c.fundable && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => alert("Top up card")}
                                  className="h-6 text-[11px] px-2 rounded-md gap-1"
                                >
                                  <Plus size={11} />
                                  Fund card
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        <Badge variant={isBlocked ? "destructive" : "outline"} className="text-[10px]">
                          {isBlocked ? "Blocked" : "Active"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </section>

          {/* ============================================================
              SPLIT SECTION 2: Where Your Money Goes & Category Breakdown (Node 315:53688)
              ============================================================ */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[#18181b]">Where your money goes</h2>
              <div className="flex items-center gap-2 text-xs font-medium">
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  All Accounts <ChevronDown size={13} className="ml-1" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  Last 12 months <ChevronDown size={13} className="ml-1" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* Left 2 Cols: Monthly Flow Chart */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e8ecef] p-5 shadow-2xs space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-6 text-xs">
                    <div>
                      <div className="flex items-center gap-1.5 text-[#71717a]">
                        <span className="size-2 rounded-full bg-[#10b981]" />
                        <span>Money in</span>
                      </div>
                      <p className="font-mono font-bold text-[#18181b] mt-0.5">
                        {showAmounts ? "GH₵ 42,500.00" : "GH₵ ••••••"}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-[#71717a]">
                        <span className="size-2 rounded-full bg-[#ef4444]" />
                        <span>Money out</span>
                      </div>
                      <p className="font-mono font-bold text-[#18181b] mt-0.5">
                        {showAmounts ? "GH₵ 24,429.50" : "GH₵ ••••••"}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-[#71717a]">
                        <span className="size-2 rounded-full bg-[#3b82f6]" />
                        <span>Net</span>
                      </div>
                      <p className="font-mono font-bold text-[#18181b] mt-0.5">
                        {showAmounts ? "+GH₵ 18,070.50" : "GH₵ ••••••"}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
                    <TrendingDown size={13} />
                    <span>Spending −3.3% vs previous 12 months</span>
                  </div>
                </div>

                {/* 12-Month Simulated Bar Flow Chart */}
                <div className="h-44 flex items-end justify-between gap-2 pt-4 border-t border-[#f1f3f5]">
                  {[
                    { m: "Sep", inH: 70, outH: 45 },
                    { m: "Oct", inH: 55, outH: 50 },
                    { m: "Nov", inH: 60, outH: 40 },
                    { m: "Dec", inH: 90, outH: 75 },
                    { m: "Jan", inH: 50, outH: 35 },
                    { m: "Feb", inH: 65, outH: 42 },
                    { m: "Mar", inH: 80, outH: 60 },
                    { m: "Apr", inH: 58, outH: 38 },
                    { m: "May", inH: 62, outH: 45 },
                    { m: "Jun", inH: 70, outH: 48 },
                    { m: "Jul", inH: 75, outH: 52 },
                    { m: "Aug", inH: 85, outH: 50 },
                  ].map(b => (
                    <div key={b.m} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full max-w-[14px] flex items-end justify-center gap-0.5 h-full">
                        <div className="w-full bg-[#10b981]/70 hover:bg-[#10b981] rounded-t-xs transition-colors" style={{ height: `${b.inH}%` }} title={`Money in: ${b.inH}%`} />
                        <div className="w-full bg-[#ef4444]/70 hover:bg-[#ef4444] rounded-t-xs transition-colors" style={{ height: `${b.outH}%` }} title={`Money out: ${b.outH}%`} />
                      </div>
                      <span className="text-[10px] text-[#71717a] font-mono">{b.m}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 1 Col: Spending by Category */}
              <div className="bg-white rounded-2xl border border-[#e8ecef] p-5 shadow-2xs space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#18181b]">Spending by category</h3>
                  
                  {/* Category Breakdown list with percentages */}
                  <div className="space-y-2.5 mt-4 text-xs">
                    {[
                      { name: "Groceries", pct: 32, color: "bg-[#3b82f6]" },
                      { name: "Shopping", pct: 15, color: "bg-[#10b981]" },
                      { name: "Cash & MoMo", pct: 14, color: "bg-[#f59e0b]" },
                      { name: "Transport", pct: 12, color: "bg-[#ec4899]" },
                      { name: "Utilities", pct: 10, color: "bg-[#8b5cf6]" },
                      { name: "Other", pct: 18, color: "bg-[#94a3b8]" },
                    ].map(cat => (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`size-2 rounded-full ${cat.color}`} />
                          <span className="text-[#5d7079] font-medium">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono font-bold">
                          <span className="text-[#18181b]">{cat.pct}%</span>
                          <span className="text-[#71717a] text-[11px]">
                            {showAmounts ? `GH₵ ${(cat.pct * 75).toFixed(0)}` : "GH₵ ••••"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full text-xs">
                  View full analytics →
                </Button>
              </div>

            </div>
          </section>

          {/* ============================================================
              FULL-WIDTH SECTION: Today's Rates (Node 315:53912)
              ============================================================ */}
          <section className="bg-white rounded-2xl border border-[#e8ecef] shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#f1f3f5] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#18181b]">Today&apos;s rates</h2>
                <p className="text-[11px] text-[#71717a]">Published 11 Aug 2026, 08:30</p>
              </div>
              <Link href="/fx-rates" className="text-xs text-[#71717a] hover:text-[#18181b] hover:underline">
                All rates
              </Link>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                
                <div>
                  <label className="text-xs font-bold text-[#71717a] block mb-1">Currency</label>
                  <select 
                    value={fxCurrency} 
                    onChange={(e) => setFxCurrency(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#e8ecef] text-xs font-mono font-bold"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#71717a] block mb-1">Amount in {fxCurrency}</label>
                  <input
                    type="number"
                    value={fxAmount}
                    onChange={(e) => setFxAmount(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#e8ecef] text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <Button 
                    className="w-full h-9 bg-[#18181b] text-white text-xs font-bold gap-1.5"
                    onClick={() => openAction("Currency Exchange Transfer")}
                  >
                    Continue to transfer <ArrowRight size={13} />
                  </Button>
                </div>

              </div>

              {/* Conversion Result Box */}
              <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#e8ecef] space-y-1">
                <span className="text-xs text-[#71717a]">You get approximately</span>
                <div className="text-2xl font-bold font-mono text-[#18181b] tabular">
                  {showAmounts ? `GH₵ ${(Number(fxAmount || 0) * 15.385).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "GH₵ ••••••"}
                </div>
                <p className="text-xs text-[#71717a] pt-1">
                  Bank buys at 15.3850 · <span className="text-emerald-700 font-bold">+0.34%</span> today · Indicative only.
                </p>
              </div>
            </div>
          </section>

          {/* ============================================================
              FULL-WIDTH SECTION: Recent Activity (Node 315:53965)
              ============================================================ */}
          <section className="bg-white rounded-2xl border border-[#e8ecef] shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#f1f3f5] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#18181b]">Recent activity</h2>
                <p className="text-[11px] text-[#71717a]">Your last 5 transactions, with anything that needs review</p>
              </div>
              <Link href="/transactions" className="text-xs text-[#71717a] hover:text-[#18181b] hover:underline">
                View all transactions
              </Link>
            </div>

            <div className="divide-y divide-[#f8f9fa]">
              {[
                { title: "Supermarket Purchase — Melcom", desc: "11 Aug 2026 · Melcom Stores", amount: "GH₵ 480.00", dir: "debit", status: "Completed" },
                { title: "Monthly Salary Credit", desc: "10 Aug 2026 · Employer Ltd", amount: "GH₵ 12,500.00", dir: "credit", status: "Completed" },
                { title: "Transfer to Savings", desc: "08 Aug 2026 · Personal Savings Account", amount: "GH₵ 2,000.00", dir: "credit", status: "Completed" },
                { title: "Online Merchant — Amazon Checkout", desc: "07 Aug 2026 · Amazon Pay", amount: "GH₵ 340.50", dir: "debit", status: "Completed" },
                { title: "Mobile Money Cashout — MTN MoMo", desc: "06 Aug 2026 · MTN MoMo Agent", amount: "GH₵ 150.00", dir: "debit", status: "Completed" },
              ].map(t => {
                const isCred = t.dir === "credit";

                return (
                  <div key={t.title} className="p-4 flex items-center justify-between hover:bg-[#fafafa] transition-colors">
                    <div>
                      <p className="text-xs font-bold text-[#18181b]">{t.title}</p>
                      <p className="text-[11px] text-[#71717a]">{t.desc}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`font-mono text-xs font-bold tabular ${isCred ? "text-emerald-700" : "text-[#18181b]"}`}>
                        {isCred ? "+" : "−"}{showAmounts ? t.amount : "GH₵ ••••••"}
                      </span>
                      <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
                        {t.status}
                      </Badge>
                      <ChevronRight size={14} className="text-[#71717a]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </main>
      </div>

      {/* ============================================================
          INTERACTIVE ACTION MODAL
          ============================================================ */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl p-6 bg-white border-[#e8ecef] text-[#18181b]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{transferTitle}</DialogTitle>
            <DialogDescription className="text-xs text-[#71717a]">
              Execute instant transfers with zero settlement delays.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-3">
            <div>
              <label className="text-xs font-bold text-[#71717a] block mb-1">Recipient Account / Phone</label>
              <input
                type="text"
                placeholder="e.g. 0244 123 456 or 4001 9922 1100"
                className="w-full h-10 px-3 rounded-lg border border-[#e8ecef] font-mono text-xs focus:outline-none focus:border-[#18181b]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#71717a] block mb-1">Amount (GHS)</label>
              <input
                type="number"
                defaultValue="100"
                className="w-full h-11 px-3 rounded-lg border border-[#e8ecef] font-mono text-base font-bold focus:outline-none focus:border-[#18181b]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#f1f3f5]">
            <Button variant="outline" className="rounded-lg" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-lg bg-[#18181b] text-white font-bold"
              onClick={() => {
                alert(`${transferTitle} executed successfully!`);
                setTransferOpen(false);
              }}
            >
              Authorize →
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
