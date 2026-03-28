"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { useCreateCampaign } from "@/lib/hooks";
import { TopNav } from "@/components/top-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewCampaignPage() {
  const router = useRouter();
  const createCampaign = useCreateCampaign();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const campaign = await createCampaign.mutateAsync(data);
      toast.success("Campaign created");
      router.push(`/campaigns/${campaign.id}`);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : JSON.stringify(detail) || "Failed to create campaign");
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* 3D Background Asset */}
      <div className="fixed top-1/2 left-[80%] -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] opacity-15 pointer-events-none mix-blend-screen -z-10 select-none">
        <img src="/3d-assets/spheres.png" alt="3D Spheres" className="w-full h-full object-contain" />
      </div>

      <TopNav />
      <main className="flex-1 pt-32 pb-20 px-4 sm:px-8 max-w-7xl mx-auto w-full relative">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">New Campaign</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input id="name" placeholder="Q1 Sales Outreach" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Target tech decision-makers in the Bay Area..."
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>
            <Button type="submit" disabled={createCampaign.isPending}>
              {createCampaign.isPending ? "Creating..." : "Create Campaign"}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
      </main>
    </div>
  );
}
