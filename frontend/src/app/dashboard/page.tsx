"use client";

import Link from "next/link";
import { FolderOpen, MessageSquare, Users, Plus, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import { useCampaigns } from "@/lib/hooks";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusColor: Record<string, "default" | "success" | "warning" | "secondary" | "destructive"> = {
  draft: "secondary",
  active: "success",
  paused: "warning",
  completed: "default",
  archived: "destructive",
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useCampaigns();
  const campaigns = data?.campaigns ?? [];

  const totalContacts = campaigns.reduce((s, c) => s + c.total_contacts, 0);
  const totalGenerated = campaigns.reduce((s, c) => s + c.messages_generated, 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-10 py-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight font-headline bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            Dashboard
          </h1>
          <p className="text-on-surface-variant font-medium mt-1">
            Welcome back, <span className="text-on-surface">{user?.full_name?.split(" ")[0]}</span>
          </p>
        </div>
        <Link href="/campaigns/new">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="bg-gradient-to-r from-primary to-secondary text-background font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity border-0 h-11 px-6 rounded-full">
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </motion.div>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card bg-surface-container/40 border-outline-variant/30 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-label uppercase tracking-wider text-on-surface-variant">Active Campaigns</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <FolderOpen className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold font-headline text-on-surface">{activeCampaigns}</div>
              <p className="text-xs text-on-surface-variant mt-1 font-medium">{campaigns.length} total campaigns</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card bg-surface-container/40 border-outline-variant/30 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-label uppercase tracking-wider text-on-surface-variant">Total Contacts</CardTitle>
              <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-secondary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold font-headline text-on-surface">{totalContacts.toLocaleString()}</div>
              <p className="text-xs text-on-surface-variant mt-1 font-medium">Across all campaigns</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card bg-surface-container/40 border-outline-variant/30 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-tertiary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-label uppercase tracking-wider text-on-surface-variant">Messages Generated</CardTitle>
              <div className="h-8 w-8 rounded-full bg-tertiary/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-tertiary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold font-headline text-on-surface">{totalGenerated.toLocaleString()}</div>
              <p className="text-xs text-on-surface-variant mt-1 font-medium">AI-generated messages</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Campaigns */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="glass-card bg-surface-container/30 border-outline-variant/30">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-on-surface">Recent Campaigns</CardTitle>
            <CardDescription className="text-on-surface-variant">Your latest outreach workflows</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="py-12 text-center text-on-surface-variant">
                <FolderOpen className="mx-auto mb-4 h-12 w-12 opacity-20" />
                <p className="font-medium text-lg text-on-surface mb-1">No campaigns found</p>
                <p className="text-sm mb-6">Create a new campaign to start generating outreach</p>
                <Link href="/campaigns/new">
                  <Button variant="outline" className="border-outline-variant text-on-surface hover:bg-surface-container-highest">
                    Create your first campaign
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.slice(0, 5).map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/campaigns/${campaign.id}`}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-outline-variant/20 bg-surface-container-low/50 p-5 transition-all hover:bg-surface-container-highest/80 hover:border-outline-variant/50"
                  >
                    <div className="space-y-1.5 mb-3 sm:mb-0">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-on-surface font-headline">{campaign.name}</span>
                        <Badge variant={statusColor[campaign.status]} className="font-label uppercase text-[10px] tracking-wider px-2 py-0.5">
                          {campaign.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-on-surface-variant font-medium flex items-center gap-3">
                        <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {campaign.total_contacts}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> {campaign.messages_generated}</span>
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      <span className="text-xs text-on-surface-variant/70 font-medium">
                        {new Date(campaign.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <div className="h-8 w-8 rounded-full bg-surface-container flex items-center justify-center group-hover:bg-primary group-hover:text-background transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
