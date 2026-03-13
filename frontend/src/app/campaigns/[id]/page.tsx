"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileUp,
  MessageSquare,
  Settings,
  Trash2,
  Users,
} from "lucide-react";

import {
  useCampaign,
  useCampaignContacts,
  useCampaignMessages,
  useCampaignUploads,
  useDeleteCampaign,
  useGenerateMessages,
  useGenerationStats,
  useUpdateCampaign,
} from "@/lib/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUploadZone } from "@/components/file-upload-zone";
import { ContactsTable } from "@/components/contacts-table";
import { MessagesPanel } from "@/components/messages-panel";
import { GenerateDialog } from "@/components/generate-dialog";
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
  const { data: contactsData } = useCampaignContacts(id, { limit: 10 });
  const { data: statsData } = useGenerationStats(id);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{campaign.name}</h1>
              <Badge variant={statusColor[campaign.status]}>{campaign.status}</Badge>
            </div>
            {campaign.description && (
              <p className="mt-1 text-muted-foreground">{campaign.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === "draft" && (
            <Button onClick={() => handleStatusChange("active")}>Activate</Button>
          )}
          {campaign.status === "active" && (
            <Button variant="outline" onClick={() => handleStatusChange("paused")}>
              Pause
            </Button>
          )}
          {campaign.status === "paused" && (
            <Button onClick={() => handleStatusChange("active")}>Resume</Button>
          )}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Campaign</DialogTitle>
                <DialogDescription>
                  This will permanently delete the campaign and all its data.
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.total_contacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uploadsData?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Messages Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.messages_generated}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.messages_sent}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="contacts">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="contacts" className="gap-2">
              <Users className="h-4 w-4" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="uploads" className="gap-2">
              <FileUp className="h-4 w-4" />
              Upload
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => setGenerateOpen(true)}>
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
    </div>
  );
}
