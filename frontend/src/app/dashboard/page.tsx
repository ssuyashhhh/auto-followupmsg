"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { FolderOpen, MessageSquare, Users, Plus, MoreVertical, Edit2, LayoutDashboard, Sparkles, Trash2, Eye, Play, Pause } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { useCampaigns, useUpdateCampaign, useDeleteCampaign } from "@/lib/hooks";
import { Badge } from "@/components/ui/badge";
import { TopNav } from "@/components/top-nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const statusColor: Record<string, "default" | "success" | "warning" | "secondary" | "destructive"> = {
  draft: "secondary",
  active: "success",
  paused: "warning",
  completed: "default",
  archived: "destructive",
};

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchQuery = searchParams?.get("q")?.toLowerCase() ?? "";

  const { data, isLoading } = useCampaigns();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const allCampaigns = data?.campaigns ?? [];

  // Filter campaigns by search query
  const campaigns = searchQuery
    ? allCampaigns.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery) ||
          c.description?.toLowerCase().includes(searchQuery) ||
          c.status.toLowerCase().includes(searchQuery)
      )
    : allCampaigns;

  const totalContacts = allCampaigns.reduce((s, c) => s + c.total_contacts, 0);
  const totalGenerated = allCampaigns.reduce((s, c) => s + c.messages_generated, 0);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateCampaign.mutateAsync({ id, status });
      toast.success(`Campaign ${status}`);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCampaign.mutateAsync(deleteTarget.id);
      toast.success("Campaign deleted");
      setDeleteTarget(null);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to delete campaign");
    }
  };

  const STATS = [
    { label: 'Total Campaigns', value: allCampaigns.length, icon: 'campaign', color: 'primary' },
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
              <div className={`absolute inset-0 bg-gradient-to-br ${
                stat.color === 'primary' ? 'from-primary/5' :
                stat.color === 'secondary' ? 'from-secondary/5' :
                'from-tertiary/5'
              } to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
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

        {/* Search indicator */}
        {searchQuery && (
          <div className="mb-6 flex items-center gap-3">
            <p className="text-on-surface-variant text-sm font-medium">
              Showing <span className="text-on-surface font-bold">{campaigns.length}</span> result{campaigns.length !== 1 ? "s" : ""} for &ldquo;<span className="text-primary">{searchQuery}</span>&rdquo;
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-xs text-tertiary hover:underline font-bold"
            >
              Clear
            </button>
          </div>
        )}

        {/* Campaign Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
             <div className="col-span-full flex justify-center py-20">
               <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
             </div>
          ) : campaigns.length === 0 && searchQuery ? (
            <div className="col-span-full flex flex-col items-center py-20 text-on-surface-variant">
              <FolderOpen className="w-12 h-12 opacity-20 mb-4" />
              <p className="font-headline font-bold text-lg text-on-surface mb-1">No campaigns found</p>
              <p className="text-sm">Try a different search term.</p>
            </div>
          ) : campaigns.map((campaign, idx) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + idx * 0.05 }}
              className="glass-card rounded-[1.5rem] p-6 hover:bg-surface-container-highest/40 transition-all duration-300 group cursor-pointer h-full border border-white/5 hover:border-white/10 relative"
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

                {/* ===== CAMPAIGN CARD ACTIONS ===== */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="text-on-surface-variant hover:text-on-surface transition-colors opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 glass-card border-white/10 bg-surface-container/95">
                    <DropdownMenuItem className="cursor-pointer text-on-surface-variant hover:text-on-surface focus:bg-surface-container-highest focus:text-on-surface" onClick={() => router.push(`/campaigns/${campaign.id}`)}>
                      <Eye className="mr-2 h-4 w-4" />
                      <span>View Details</span>
                    </DropdownMenuItem>
                    {campaign.status === "draft" && (
                      <DropdownMenuItem className="cursor-pointer text-secondary focus:bg-secondary/10 focus:text-secondary" onClick={() => handleStatusChange(campaign.id, "active")}>
                        <Play className="mr-2 h-4 w-4" />
                        <span>Activate</span>
                      </DropdownMenuItem>
                    )}
                    {campaign.status === "active" && (
                      <DropdownMenuItem className="cursor-pointer text-on-surface-variant focus:bg-surface-container-highest focus:text-on-surface" onClick={() => handleStatusChange(campaign.id, "paused")}>
                        <Pause className="mr-2 h-4 w-4" />
                        <span>Pause</span>
                      </DropdownMenuItem>
                    )}
                    {campaign.status === "paused" && (
                      <DropdownMenuItem className="cursor-pointer text-secondary focus:bg-secondary/10 focus:text-secondary" onClick={() => handleStatusChange(campaign.id, "active")}>
                        <Play className="mr-2 h-4 w-4" />
                        <span>Resume</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                      onClick={() => setDeleteTarget({ id: campaign.id, name: campaign.name })}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Link href={`/campaigns/${campaign.id}`}>
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
              </Link>
            </motion.div>
          ))}

          {/* Launch New Card */}
          {!searchQuery && (
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
          )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="glass-card bg-surface-container/90 border-outline-variant/30">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">Delete Campaign</DialogTitle>
            <DialogDescription className="text-on-surface-variant font-medium">
              Are you sure you want to delete &ldquo;<span className="text-on-surface font-bold">{deleteTarget?.name}</span>&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-outline-variant rounded-full text-on-surface hover:bg-surface-container-highest font-bold" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-full shadow-lg shadow-destructive/20 font-bold" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
