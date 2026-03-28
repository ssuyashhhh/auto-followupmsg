"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileUp,
  MessageSquare,
  Trash2,
  Users,
} from "lucide-react";

import {
  useCampaign,
  useCampaignContacts,
  useCampaignUploads,
  useDeleteCampaign,
  useGenerationStats,
  useUpdateCampaign,
} from "@/lib/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TopNav } from "@/components/top-nav";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FileUploadZone = dynamic(() => import("@/components/file-upload-zone").then(mod => mod.FileUploadZone), { ssr: false });
const ContactsTable = dynamic(() => import("@/components/contacts-table").then(mod => mod.ContactsTable), { ssr: false });
const MessagesPanel = dynamic(() => import("@/components/messages-panel").then(mod => mod.MessagesPanel), { ssr: false });
const GenerateDialog = dynamic(() => import("@/components/generate-dialog").then(mod => mod.GenerateDialog), { ssr: false });
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const statusColor: Record<string, "default" | "success" | "warning" | "secondary" | "destructive"> = {
  draft: "secondary",
  active: "success",
  paused: "warning",
  completed: "default",
  archived: "destructive",
};

export default function CampaignDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const { data: campaign, isLoading } = useCampaign(id);
  const { data: uploadsData } = useCampaignUploads(id);
  useCampaignContacts(id, { limit: 10 });
  useGenerationStats(id);
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!id) {
    return null;
  }

  if (isLoading || !campaign) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleStatusChange = async (status: string) => {
    try {
      await updateCampaign.mutateAsync({ id, status });
      toast.success(`Campaign ${status}`);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : JSON.stringify(detail) || "Failed to update status");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCampaign.mutateAsync(id);
      toast.success("Campaign deleted");
      router.push("/campaigns");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : JSON.stringify(detail) || "Failed to delete campaign");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 pt-32 pb-20 px-4 sm:px-8 max-w-7xl mx-auto w-full space-y-6 relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon" className="h-10 w-10 mt-1 hover:bg-surface-container-highest rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold font-headline bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">{campaign.name}</h1>
              <Badge variant={statusColor[campaign.status]} className="font-label uppercase tracking-wider">{campaign.status}</Badge>
            </div>
            {campaign.description && (
              <p className="mt-2 text-on-surface-variant font-medium">{campaign.description}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {campaign.status === "draft" && (
            <Button className="bg-gradient-to-r from-primary to-secondary text-background border-0 shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity font-bold rounded-full" onClick={() => handleStatusChange("active")}>Activate</Button>
          )}
          {campaign.status === "active" && (
            <Button variant="outline" className="border-outline-variant text-on-surface hover:bg-surface-container-highest rounded-full font-bold" onClick={() => handleStatusChange("paused")}>
              Pause
            </Button>
          )}
          {campaign.status === "paused" && (
            <Button className="bg-gradient-to-r from-primary to-secondary text-background border-0 shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity font-bold rounded-full" onClick={() => handleStatusChange("active")}>Resume</Button>
          )}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="icon" className="rounded-full shadow-lg shadow-destructive/20 h-10 w-10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card bg-surface-container/90 border-outline-variant/30">
              <DialogHeader>
                <DialogTitle className="font-headline text-xl">Delete Campaign</DialogTitle>
                <DialogDescription className="text-on-surface-variant font-medium">
                  This will permanently delete the campaign and all its data.
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" className="border-outline-variant rounded-full text-on-surface hover:bg-surface-container-highest font-bold" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" className="rounded-full shadow-lg shadow-destructive/20 font-bold" onClick={handleDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-card bg-surface-container/40 border-outline-variant/30 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-label uppercase tracking-wider text-on-surface-variant">Contacts</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold font-headline text-on-surface">{campaign.total_contacts}</div>
            </CardContent>
        </Card>
        <Card className="glass-card bg-surface-container/40 border-outline-variant/30 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-label uppercase tracking-wider text-on-surface-variant">Uploads</CardTitle>
              <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center">
                <FileUp className="h-4 w-4 text-secondary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold font-headline text-on-surface">{uploadsData?.total ?? 0}</div>
            </CardContent>
        </Card>
        <Card className="glass-card bg-surface-container/40 border-outline-variant/30 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-tertiary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-label uppercase tracking-wider text-on-surface-variant">Messages Generated</CardTitle>
              <div className="h-8 w-8 rounded-full bg-tertiary/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-tertiary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold font-headline text-on-surface">{campaign.messages_generated}</div>
            </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="contacts">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-8 mb-6 gap-4">
          <TabsList className="bg-surface-container-highest/50 border border-outline-variant/20 h-14 sm:h-12 rounded-xl p-1 flex overflow-x-auto w-full justify-start sm:w-auto scrollbar-hide">
            <TabsTrigger value="contacts" className="gap-2 font-label text-xs uppercase tracking-wider rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
              <Users className="h-4 w-4" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2 font-label text-xs uppercase tracking-wider rounded-lg data-[state=active]:bg-secondary/10 data-[state=active]:text-secondary transition-all">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="uploads" className="gap-2 font-label text-xs uppercase tracking-wider rounded-lg data-[state=active]:bg-tertiary/10 data-[state=active]:text-tertiary transition-all">
              <FileUp className="h-4 w-4" />
              Uploads
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => setGenerateOpen(true)} className="bg-gradient-to-r from-primary to-secondary text-background font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity border-0 h-11 px-6 rounded-full">
            <MessageSquare className="mr-2 h-4 w-4" />
            Generate Messages
          </Button>
        </div>

        <TabsContent value="contacts" className="mt-4">
          <ContactsTable campaignId={id} />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <MessagesPanel campaignId={id} />
        </TabsContent>

        <TabsContent value="uploads" className="mt-4">
          <FileUploadZone campaignId={id} />
        </TabsContent>
      </Tabs>

      {/* Generate Dialog */}
      <GenerateDialog
        campaignId={id}
        open={generateOpen}
        onOpenChange={setGenerateOpen}
      />
      </main>
    </div>
  );
}
