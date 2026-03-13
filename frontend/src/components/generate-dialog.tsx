"use client";

import { useState } from "react";
import {
  useGenerateMessages,
  usePromptTemplates,
  useTaskStatus,
} from "@/lib/hooks";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const MESSAGE_TYPES = [
  { value: "cold_outreach", label: "Cold Outreach" },
  { value: "follow_up_1", label: "Follow Up 1" },
  { value: "follow_up_2", label: "Follow Up 2" },
  { value: "follow_up_3", label: "Follow Up 3" },
  { value: "custom", label: "Custom" },
];

const AI_MODELS = [
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Free)" },
  { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Free)" },
  { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B (Free)" },
  { value: "gemma2-9b-it", label: "Gemma 2 9B (Free)" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "claude-3.5-haiku", label: "Claude 3.5 Haiku" },
  { value: "claude-3-opus", label: "Claude 3 Opus" },
  { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
  { value: "claude-3-haiku", label: "Claude 3 Haiku" },
];

interface GenerateDialogProps {
  campaignId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateDialog({
  campaignId,
  open,
  onOpenChange,
}: GenerateDialogProps) {
  const [messageType, setMessageType] = useState("cold_outreach");
  const [model, setModel] = useState("llama-3.3-70b-versatile");
  const [templateId, setTemplateId] = useState<string>("default");
  const [taskId, setTaskId] = useState<string | null>(null);

  const { data: templatesData } = usePromptTemplates(messageType);
  const generate = useGenerateMessages();
  const { data: taskStatus } = useTaskStatus(taskId);

  const templates = templatesData?.templates ?? [];
  const isRunning = taskId !== null && taskStatus && !["SUCCESS", "FAILURE", "REVOKED"].includes(taskStatus.status);
  const isDone = taskStatus?.status === "SUCCESS";
  const isFailed = taskStatus?.status === "FAILURE";

  const progress = taskStatus?.progress;
  const progressPct = progress
    ? Math.round(((progress.completed as number) / (progress.total as number || 1)) * 100)
    : 0;

  const handleGenerate = async () => {
    try {
      const result = await generate.mutateAsync({
        campaign_id: campaignId,
        message_type: messageType,
        model,
        prompt_template_id: templateId === "default" ? undefined : templateId,
      });
      setTaskId(result.task_id);
      toast.success(`Generation started for ${result.contact_count} contacts`);
    } catch (err) {
      toast.error(`Failed to start generation: ${typeof err === "object" ? JSON.stringify(err) : String(err)}`);
    }
  };

  const handleClose = () => {
    setTaskId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={taskId ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Messages</DialogTitle>
          <DialogDescription>
            Select message type, AI model, and optionally a prompt template.
          </DialogDescription>
        </DialogHeader>

        {!taskId ? (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Message Type</Label>
                <Select value={messageType} onValueChange={setMessageType}>
                  <SelectTrigger>
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
              </div>

              <div className="space-y-2">
                <Label>AI Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prompt Template</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Template</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={generate.isPending}>
                {generate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="space-y-4 py-4">
            {/* Progress display */}
            <div className="flex items-center gap-3">
              {isRunning && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              {isDone && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {isFailed && <XCircle className="h-5 w-5 text-destructive" />}
              <div>
                <p className="font-medium">
                  {isRunning && "Generating messages..."}
                  {isDone && "Generation complete!"}
                  {isFailed && "Generation failed"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Task: {taskId.slice(0, 12)}...
                </p>
              </div>
            </div>

            {progress && (
              <div className="space-y-2">
                <Progress value={progressPct} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {progress.completed as number} / {progress.total as number} contacts
                  </span>
                  <span>{progressPct}%</span>
                </div>
                {(progress.failed as number) > 0 && (
                  <Badge variant="destructive">{progress.failed as number} failed</Badge>
                )}
              </div>
            )}

            {isDone && taskStatus?.result && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p>Generated: {(taskStatus.result as Record<string, number>).generated ?? 0}</p>
                <p>Failed: {(taskStatus.result as Record<string, number>).failed ?? 0}</p>
              </div>
            )}

            {isFailed && taskStatus?.error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {taskStatus.error}
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose} disabled={!!isRunning}>
                {isRunning ? "Please wait..." : "Close"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
