"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { FileUp, File, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

import { useCampaignUploads, useUploadFile } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ACCEPTED = {
  "text/csv": [".csv"],
  "text/plain": [".txt"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
};

const statusIcon: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="h-4 w-4 text-green-600" />,
  failed: <XCircle className="h-4 w-4 text-red-600" />,
  processing: <Loader2 className="h-4 w-4 animate-spin text-blue-600" />,
  pending: <Clock className="h-4 w-4 text-yellow-600" />,
};

export function FileUploadZone({ campaignId }: { campaignId: string }) {
  const { data } = useCampaignUploads(campaignId);
  const uploadFile = useUploadFile();

  const onDrop = useCallback(
    async (acceptedFiles: globalThis.File[]) => {
      for (const file of acceptedFiles) {
        try {
          await uploadFile.mutateAsync({ campaignId, file });
          toast.success(`Uploaded ${file.name}`);
        } catch (err: any) {
          const detail = err.response?.data?.detail;
          toast.error(typeof detail === "string" ? detail : JSON.stringify(detail) || `Failed to upload ${file.name}`);
        }
      }
    },
    [campaignId, uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  });

  const uploads = data?.uploads ?? [];

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <FileUp className="mb-4 h-10 w-10 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-lg font-medium text-primary">Drop files here</p>
        ) : (
          <>
            <p className="text-lg font-medium">Drag & drop files here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              or click to browse — CSV, TXT, XLSX, XLS (max 10MB)
            </p>
          </>
        )}
        {uploadFile.isPending && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </div>
        )}
      </div>

      {/* Upload History */}
      {uploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <File className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{upload.original_filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {(upload.file_size_bytes / 1024).toFixed(1)} KB
                        {upload.row_count != null && ` · ${upload.row_count} rows`}
                        {upload.parsed_count > 0 && ` · ${upload.parsed_count} parsed`}
                        {upload.failed_count > 0 && ` · ${upload.failed_count} failed`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusIcon[upload.status] || null}
                    <Badge
                      variant={
                        upload.status === "completed"
                          ? "success"
                          : upload.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {upload.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
