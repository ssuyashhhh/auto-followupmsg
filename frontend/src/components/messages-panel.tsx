"use client";

import { useState } from "react";
import {
  useCampaignMessages,
  useGenerationStats,
  useRegenerateMessage,
} from "@/lib/hooks";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

const MESSAGE_TYPES = [
  { value: "all", label: "All Types" },
  { value: "initial_outreach", label: "Initial Outreach" },
  { value: "follow_up_1", label: "Follow Up 1" },
  { value: "follow_up_2", label: "Follow Up 2" },
  { value: "follow_up_3", label: "Follow Up 3" },
  { value: "breakup", label: "Breakup" },
];

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  generated: "secondary",
  approved: "default",
  sent: "outline",
  failed: "destructive",
};

interface MessagesPanelProps {
  campaignId: string;
}

export function MessagesPanel({ campaignId }: MessagesPanelProps) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data: statsData } = useGenerationStats(campaignId);
  const { data, isLoading } = useCampaignMessages(campaignId, {
    message_type: typeFilter === "all" ? undefined : typeFilter,
    skip: page * limit,
    limit,
    active_only: true,
  });
  const regenerate = useRegenerateMessage();

  const messages = data?.messages ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const handleRegenerate = async (msg: { contact_id: string; campaign_id: string; message_type: string }) => {
    try {
      const result = await regenerate.mutateAsync({
        contact_id: msg.contact_id,
        campaign_id: msg.campaign_id,
        message_type: msg.message_type,
      });
      toast.success(`Regenerating (Task: ${result.task_id.slice(0, 8)}...)`);
    } catch (err) {
      toast.error(`Failed to regenerate: ${typeof err === "object" ? JSON.stringify(err) : String(err)}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      {statsData && (
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="text-sm">
            Total: {statsData.total}
          </Badge>
          {Object.entries(statsData.by_type).map(([type, count]) => (
            <Badge key={type} variant="secondary" className="text-sm">
              {type.replace(/_/g, " ")}: {count as number}
            </Badge>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MESSAGE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {total} message{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Messages */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No messages generated yet. Click &quot;Generate Messages&quot; to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <Card key={message.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">
                      {message.message_type.replace(/_/g, " ")}
                    </CardTitle>
                    <Badge variant={statusVariant[message.status] ?? "secondary"}>
                      {message.status}
                    </Badge>
                    <Badge variant="outline">v{message.version}</Badge>
                    <span className="text-xs text-muted-foreground">{message.ai_model}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRegenerate(message)}
                    disabled={regenerate.isPending}
                  >
                    <RefreshCw className={`mr-1 h-3 w-3 ${regenerate.isPending ? "animate-spin" : ""}`} />
                    Regen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </p>
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  <span>{message.word_count} words</span>
                  <span>{new Date(message.generated_at).toLocaleString()}</span>
                  {message.ai_metadata && (
                    <span>
                      Cost: ${((message.ai_metadata as Record<string, number>).cost_usd ?? 0).toFixed(4)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
