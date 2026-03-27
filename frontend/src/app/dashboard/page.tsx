"use client";

import Link from "next/link";
import { FolderOpen, MessageSquare, Users, Plus, MoreVertical, Edit2, LayoutDashboard, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { useCampaigns } from "@/lib/hooks";
import { Badge } from "@/components/ui/badge";
import { TopNav } from "@/components/top-nav";

const statusColor: Record<string, "default" | "success" | "warning" | "secondary" | "destructive"> = {
  draft: "secondary",
  active: "success",
  paused: "warning",
  completed: "default",
  archived: "destructive",
};

export default function DashboardPage() {
  const { data, isLoading } = useCampaigns();
  const campaigns = data?.campaigns ?? [];

  const totalContacts = campaigns.reduce((s, c) => s + c.total_contacts, 0);
  const totalGenerated = campaigns.reduce((s, c) => s + c.messages_generated, 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;

  const STATS = [
    { label: 'Total Campaigns', value: campaigns.length, icon: 'campaign', color: 'primary' },
    { label: 'Total Contacts', value: totalContacts.toLocaleString(), icon: 'groups', color: 'secondary' },
    { label: 'Messages Generated', value: totalGenerated.toLocaleString(), icon: 'auto_awesome', color: 'tertiary' }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />

      {/* Main Content */}
      <main className="flex-1 pt-32 pb-20 px-4 sm:px-8 max-w-7xl mx-auto w-full relative">
        <header className="mb-12">
          <h1 className="font-headline text-4xl text-on-surface font-extrabold tracking-tight mb-2">Campaign Performance</h1>
          <p className="text-on-surface-variant text-lg max-w-2xl">
            Monitor your AI-driven outreach across all active sequences. Let your AI handle the heavy lifting while you focus on closing.
          </p>
        </header>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {STATS.map((stat, idx) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-6 rounded-[1.5rem] flex items-center justify-between group overflow-hidden relative"
            >
              <div className={`absolute inset-0 bg-gradient-to-br from-${stat.color}/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-widest block mb-1 font-bold">
                  {stat.label}
                </span>
                <span className="font-headline text-3xl font-bold text-on-surface tracking-tight">
                  {stat.value}
                </span>
              </div>
              <div className={`relative z-10 w-12 h-12 rounded-[1rem] flex items-center justify-center ${
                stat.color === 'primary' ? 'bg-primary/10 text-primary' :
                stat.color === 'secondary' ? 'bg-secondary/10 text-secondary' :
                'bg-tertiary/10 text-tertiary'
              }`}>
                {stat.icon === 'campaign' && <LayoutDashboard className="w-6 h-6" />}
                {stat.icon === 'groups' && <Users className="w-6 h-6" />}
                {stat.icon === 'auto_awesome' && <Sparkles className="w-6 h-6" />}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Campaign Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
             <div className="col-span-full flex justify-center py-20">
               <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
             </div>
          ) : campaigns.map((campaign, idx) => (
            <Link href={`/campaigns/${campaign.id}`} key={campaign.id}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + idx * 0.05 }}
                className="glass-card rounded-[1.5rem] p-6 hover:bg-surface-container-highest/40 transition-all duration-300 group cursor-pointer h-full border border-white/5 hover:border-white/10"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    campaign.status === 'active' ? 'bg-secondary/10 text-secondary' :
                    campaign.status === 'completed' ? 'bg-tertiary/10 text-tertiary' :
                    'bg-surface-container-highest text-on-surface-variant'
                  }`}>
                    {campaign.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />}
                    {campaign.status}
                  </div>
                  <button className="text-on-surface-variant hover:text-on-surface transition-colors opacity-0 group-hover:opacity-100">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="font-headline text-lg font-bold text-on-surface mb-6 group-hover:text-primary transition-colors line-clamp-2">
                  {campaign.name}
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-surface-container-low/50 p-3 rounded-xl border border-white/5">
                    <span className="block text-[10px] text-on-surface-variant uppercase tracking-tighter mb-1 font-bold">Contacts</span>
                    <span className="font-headline font-semibold text-on-surface">{campaign.total_contacts}</span>
                  </div>
                  <div className="bg-surface-container-low/50 p-3 rounded-xl border border-white/5">
                    <span className="block text-[10px] text-on-surface-variant uppercase tracking-tighter mb-1 font-bold">Messages</span>
                    <span className="font-headline font-semibold text-on-surface">{campaign.messages_generated}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-4 border-t border-white/5">
                  <span className="font-medium">
                    {new Date(campaign.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  
                  {campaign.status === 'draft' ? (
                    <div className="flex items-center gap-1 text-primary font-bold">
                      <Edit2 className="w-3 h-3" />
                      Continue
                    </div>
                  ) : (
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-surface-container flex items-center justify-center text-[10px] font-bold text-primary">
                        <Users className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </Link>
          ))}

          {/* Launch New Card */}
          <Link href="/campaigns/new">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="border-2 border-dashed border-white/10 rounded-[1.5rem] p-6 flex flex-col items-center justify-center text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all group cursor-pointer min-h-[280px] h-full"
            >
              <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:bg-primary/10">
                <Plus className="w-8 h-8 text-on-surface-variant group-hover:text-primary transition-colors" />
              </div>
              <span className="font-headline font-bold text-lg text-on-surface group-hover:text-primary transition-colors">Launch New Sequence</span>
              <p className="text-center text-sm mt-2 max-w-[200px] opacity-60 font-medium">
                Leverage AI to create a personalized outreach strategy in seconds.
              </p>
            </motion.div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface w-full py-8 border-t border-white/5 mt-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center px-4 sm:px-8 max-w-7xl mx-auto w-full">
          <div className="mb-4 md:mb-0">
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              © {new Date().getFullYear()} Auto Follow-Ups. Powered by Ethereal Intelligence.
            </span>
          </div>
          <div className="flex items-center gap-6 text-[10px] uppercase tracking-widest font-bold">
            <Link href="/" className="text-on-surface-variant hover:text-tertiary transition-colors">Privacy Policy</Link>
            <Link href="/" className="text-on-surface-variant hover:text-tertiary transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
