"use client";

import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";

import { useCampaigns } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TopNav } from "@/components/top-nav";

const statusColor: Record<string, "default" | "success" | "warning" | "secondary" | "destructive"> = {
  draft: "secondary",
  active: "success",
  paused: "warning",
  completed: "default",
  archived: "destructive",
};

export default function CampaignsPage() {
  const { data, isLoading } = useCampaigns();
  const campaigns = data?.campaigns ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 pt-32 pb-20 px-4 sm:px-8 max-w-7xl mx-auto w-full relative">
        <div className="flex items-center justify-between mb-8">
          <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">Manage your outreach campaigns</p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-semibold">No campaigns yet</h3>
            <p className="mb-4 text-muted-foreground">Create a campaign to start generating outreach messages</p>
            <Link href="/campaigns/new">
              <Button>Create Campaign</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <Badge variant={statusColor[campaign.status]}>{campaign.status}</Badge>
                  </div>
                  {campaign.description && (
                    <CardDescription className="line-clamp-2">{campaign.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-center text-sm">
                    <div>
                      <div className="font-bold">{campaign.total_contacts}</div>
                      <div className="text-muted-foreground">Contacts</div>
                    </div>
                    <div>
                      <div className="font-bold">{campaign.messages_generated}</div>
                      <div className="text-muted-foreground">Generated</div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Created {new Date(campaign.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      </main>
    </div>
  );
}
