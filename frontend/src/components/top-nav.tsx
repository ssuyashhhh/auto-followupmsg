"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Bell, LogOut, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { useAuthStore } from "@/stores/auth";
import { useCampaigns } from "@/lib/hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuthStore();

  const [searchValue, setSearchValue] = useState(searchParams?.get("q") ?? "");
  const [notifOpen, setNotifOpen] = useState(false);

  // Live search – navigates to /dashboard?q=...
  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      const params = new URLSearchParams();
      if (value.trim()) params.set("q", value.trim());
      router.push(`/dashboard${params.toString() ? `?${params}` : ""}`);
    },
    [router]
  );

  // Keep local state in sync when the URL changes externally
  useEffect(() => {
    setSearchValue(searchParams?.get("q") ?? "");
  }, [searchParams]);

  // --- Notification data (derived from campaigns) ---
  const { data } = useCampaigns();
  const campaigns = data?.campaigns ?? [];
  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const draftCampaigns = campaigns.filter((c) => c.status === "draft");

  const links = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Campaigns", href: "/campaigns" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 h-16">
      <div className="h-full max-w-[1440px] mx-auto px-4 md:px-8 flex items-center justify-between">
        {/* Left: Logo + Nav Links */}
        <div className="flex items-center gap-8 lg:gap-12 h-full">
          <Link href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-headline tracking-tight whitespace-nowrap">
            Auto Follow-Ups
          </Link>
          <div className="hidden md:flex items-center gap-6 h-full">
            {links.map((link) => {
              const isActive = pathname === link.href || pathname?.startsWith(link.href + "/");
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative h-full flex items-center font-headline tracking-tight text-sm transition-colors ${
                    isActive
                      ? "text-primary font-bold"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: Search + Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="hidden lg:flex items-center bg-surface-container-highest rounded-full px-4 h-9 border border-white/5 focus-within:border-tertiary/50 transition-colors">
            <Search className="text-on-surface-variant w-4 h-4 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search campaigns..."
              className="bg-transparent border-none focus:outline-none text-sm placeholder:text-on-surface-variant w-44 text-on-surface"
            />
            {searchValue && (
              <button onClick={() => handleSearch("")} className="ml-1 text-on-surface-variant hover:text-on-surface transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* New Campaign */}
          <Link href="/campaigns/new">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hidden sm:flex items-center bg-gradient-to-r from-primary to-secondary text-background font-headline font-bold text-sm px-5 h-9 rounded-full transition-all shadow-lg shadow-primary/20 hover:opacity-90"
            >
              New Campaign
            </motion.button>
          </Link>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-white/10 mx-1" />

          {/* Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface rounded-full transition-all relative"
            >
              <Bell className="w-4 h-4" />
              {(activeCampaigns.length > 0 || draftCampaigns.length > 0) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-secondary animate-pulse" />
              )}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-80 glass-card border border-white/10 bg-surface-container/95 rounded-2xl shadow-2xl shadow-primary/10 p-0 overflow-hidden z-50"
                >
                  <div className="px-4 pt-4 pb-2 border-b border-white/5">
                    <h4 className="font-headline font-bold text-sm text-on-surface">Activity</h4>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {campaigns.length === 0 ? (
                      <p className="text-on-surface-variant text-xs p-4 text-center">No campaigns yet. Create one to get started!</p>
                    ) : (
                      <ul className="divide-y divide-white/5">
                        {activeCampaigns.length > 0 && (
                          <li className="px-4 py-3 flex items-start gap-3">
                            <span className="mt-0.5 w-2 h-2 rounded-full bg-secondary flex-shrink-0 animate-pulse" />
                            <div>
                              <p className="text-xs text-on-surface font-medium">
                                <span className="text-secondary font-bold">{activeCampaigns.length}</span> active campaign{activeCampaigns.length > 1 ? "s" : ""} running
                              </p>
                              <p className="text-[11px] text-on-surface-variant mt-0.5">
                                {activeCampaigns.map((c) => c.name).join(", ")}
                              </p>
                            </div>
                          </li>
                        )}
                        {draftCampaigns.length > 0 && (
                          <li className="px-4 py-3 flex items-start gap-3">
                            <span className="mt-0.5 w-2 h-2 rounded-full bg-on-surface-variant flex-shrink-0" />
                            <div>
                              <p className="text-xs text-on-surface font-medium">
                                <span className="font-bold">{draftCampaigns.length}</span> draft{draftCampaigns.length > 1 ? "s" : ""} pending activation
                              </p>
                              <p className="text-[11px] text-on-surface-variant mt-0.5">
                                {draftCampaigns.map((c) => c.name).join(", ")}
                              </p>
                            </div>
                          </li>
                        )}
                        <li className="px-4 py-3 flex items-start gap-3">
                          <span className="mt-0.5 w-2 h-2 rounded-full bg-tertiary flex-shrink-0" />
                          <div>
                            <p className="text-xs text-on-surface font-medium">
                              <span className="text-tertiary font-bold">{campaigns.reduce((s, c) => s + c.messages_generated, 0).toLocaleString()}</span> messages generated total
                            </p>
                            <p className="text-[11px] text-on-surface-variant mt-0.5">
                              Across {campaigns.length} campaign{campaigns.length > 1 ? "s" : ""}
                            </p>
                          </div>
                        </li>
                      </ul>
                    )}
                  </div>
                  <div className="p-3 border-t border-white/5">
                    <Link
                      href="/dashboard"
                      onClick={() => setNotifOpen(false)}
                      className="block text-center text-xs text-primary font-bold hover:underline"
                    >
                      View Dashboard →
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-9 h-9 rounded-full border border-primary/20 bg-surface-container-high flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                <span className="text-xs font-bold font-headline text-primary">
                  {user?.full_name?.charAt(0).toUpperCase() ?? "U"}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass-card border-white/10 bg-surface-container/95">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-0.5 leading-none">
                  {user?.full_name && (
                    <p className="font-bold text-sm text-on-surface mb-1">
                      {user.full_name}
                    </p>
                  )}
                  {user?.email && (
                    <p className="w-[200px] truncate text-xs text-on-surface-variant">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="h-px bg-white/10 my-1" />
              <DropdownMenuItem
                className="cursor-pointer text-destructive hover:text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() => logout()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
