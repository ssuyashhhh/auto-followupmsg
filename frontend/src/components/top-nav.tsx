"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, Settings, LogOut } from "lucide-react";
import { motion } from "motion/react";

import { useAuthStore } from "@/stores/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopNav() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const links = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Campaigns", href: "/campaigns" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 h-16 flex justify-between items-center px-4 md:px-8">
      <div className="flex items-center gap-12">
        <Link href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-headline tracking-tight">
          Auto Follow-Ups
        </Link>
        <div className="hidden md:flex items-center gap-8 font-headline tracking-tight text-sm">
          {links.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`transition-colors ${
                pathname === link.href || pathname?.startsWith(link.href + "/")
                  ? "text-primary border-b-2 border-primary pb-1 font-bold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center bg-surface-container-highest rounded-full px-4 py-1.5 border border-white/5">
          <Search className="text-on-surface-variant w-4 h-4 mr-2" />
          <input
            type="text"
            placeholder="Search campaigns..."
            className="bg-transparent border-none focus:outline-none text-sm placeholder:text-on-surface-variant w-48 text-on-surface"
          />
        </div>
        <Link href="/campaigns/new">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="hidden sm:block bg-gradient-to-r from-primary to-secondary text-background font-headline font-bold text-sm px-6 py-2 rounded-full transition-all shadow-lg shadow-primary/20 hover:opacity-90"
          >
            New Campaign
          </motion.button>
        </Link>
        <div className="flex items-center gap-2 border-l border-white/10 ml-2 pl-4">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface rounded-full transition-all">
            <Bell className="w-4 h-4" />
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full overflow-hidden border border-primary/20 ml-2 bg-surface-container-high flex justify-center items-center cursor-pointer hover:border-primary transition-colors">
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
              <DropdownMenuItem className="cursor-pointer text-on-surface-variant hover:text-on-surface focus:bg-surface-container-highest focus:text-on-surface">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
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
