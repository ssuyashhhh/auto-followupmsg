"use client";

import { useState } from "react";
import { useContact, useContactMessages, useRegenerateMessage } from "@/lib/hooks";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Mail, Building, Briefcase, ExternalLink } from "lucide-react";

interface ContactDetailDialogProps {
  contactId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDetailDialog({
  contactId,
  open,
  onOpenChange,
}: ContactDetailDialogProps) {
  const { data: contact } = useContact(contactId ?? "");
  const { data: messagesData } = useContactMessages(contactId ?? "");
  const regenerate = useRegenerateMessage();

  if (!contact) return null;

  const messages = messagesData?.messages ?? [];

  const [regeneratingType, setRegeneratingType] = useState<string | null>(null);

  const handleRegenerate = async (messageType: string) => {
    setRegeneratingType(messageType);
    try {
      const result = await regenerate.mutateAsync({
        contact_id: contact.id,
        campaign_id: contact.campaign_id,
        message_type: messageType,
      });
      toast.success(`Regenerating message (Task: ${result.task_id.slice(0, 8)}...)`);
    } catch {
      toast.error("Failed to regenerate");
    } finally {
      setRegeneratingType(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contact.full_name}</DialogTitle>
        </DialogHeader>

        {/* Contact Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {contact.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {contact.email}
            </div>
          )}
          {contact.company && (
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              {contact.company}
            </div>
          )}
          {contact.role && (
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              {contact.role}
            </div>
          )}
          {contact.linkedin_url && (
            <a
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              LinkedIn
            </a>
          )}
        </div>

        {contact.notes && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <span className="font-medium">Notes: </span>
            {contact.notes}
          </div>
        )}

        {/* Messages */}
        <div className="space-y-3">
          <h4 className="font-semibold">Messages ({messages.length})</h4>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages generated yet</p>
          ) : (
            messages
              .filter((m) => m.is_active)
              .map((message) => (
                <Card key={message.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm">
                          {message.message_type.replace(/_/g, " ")}
                        </CardTitle>
                        <Badge variant="secondary">v{message.version}</Badge>
                        <Badge variant="outline">{message.ai_model}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRegenerate(message.message_type)}
                        disabled={regeneratingType === message.message_type}
                      >
                        <RefreshCw className={`mr-1 h-3 w-3 ${regeneratingType === message.message_type ? "animate-spin" : ""}`} />
                        Regenerate
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                      <span>{message.word_count} words</span>
                      <span>{new Date(message.generated_at).toLocaleString()}</span>
                      {message.ai_metadata && (
                        <span>${(message.ai_metadata as any).cost_usd?.toFixed(4) || "N/A"}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
