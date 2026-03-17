"use client";

import Link from "next/link";
import { FolderOpen, MessageSquare, Users, Plus } from "lucide-react";

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.full_name?.split(" ")[0]}
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">{campaigns.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContacts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Messages Generated</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGenerated.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">AI-generated messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
          <CardDescription>Your latest outreach campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <FolderOpen className="mx-auto mb-2 h-8 w-8" />
              <p>No campaigns yet</p>
              <Link href="/campaigns/new">
                <Button variant="link">Create your first campaign</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.slice(0, 5).map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}`}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{campaign.name}</span>
                      <Badge variant={statusColor[campaign.status]}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {campaign.total_contacts} contacts · {campaign.messages_generated} messages
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
