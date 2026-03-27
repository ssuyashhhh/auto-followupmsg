"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "motion/react";

import { useAuthStore } from "@/stores/auth";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      router.push("/dashboard");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center w-full min-h-screen px-4 pt-10 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8 md:p-10 rounded-[2rem] shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
          
          <div className="relative z-10">
            <div className="mb-10 text-center">
              <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface mb-2">
                Welcome Back
              </h1>
              <p className="text-on-surface-variant font-medium text-sm">
                Sign in to your account
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-1.5">
                <label className="block font-label text-[0.65rem] uppercase tracking-widest text-on-surface-variant ml-1">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="text-outline w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    {...register("email")}
                    className={`w-full bg-surface-container-highest border-0 rounded-xl py-3.5 pl-11 pr-4 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-tertiary/50 transition-all outline-none ${errors.email ? 'ring-1 ring-destructive' : ''}`}
                    placeholder="name@company.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-[10px] text-destructive ml-1">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="px-1">
                  <label className="block font-label text-[0.65rem] uppercase tracking-widest text-on-surface-variant">
                    Password
                  </label>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="text-outline w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    {...register("password")}
                    className={`w-full bg-surface-container-highest border-0 rounded-xl py-3.5 pl-11 pr-4 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-tertiary/50 transition-all outline-none ${errors.password ? 'ring-1 ring-destructive' : ''}`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && (
                  <p className="text-[10px] text-destructive ml-1">{errors.password.message}</p>
                )}
              </div>

              <div className="pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-primary to-secondary text-background font-bold rounded-full shadow-lg shadow-primary/20 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
                  {!isLoading && <ArrowRight className="w-5 h-5" />}
                </motion.button>
              </div>
            </form>

            <div className="mt-10 text-center">
              <p className="text-on-surface-variant text-sm">
                Don&apos;t have an account? 
                <Link href="/register" className="text-primary font-semibold hover:underline decoration-secondary underline-offset-4 transition-all ml-1">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          whileHover={{ opacity: 1 }}
          className="mt-8 text-center transition-opacity hidden md:block"
        >
          <p className="font-label text-[0.65rem] uppercase tracking-widest text-outline mb-4">
            Trusted by high-growth teams
          </p>
          <div className="flex justify-center gap-8 grayscale contrast-125">
            <div className="font-bold text-xs tracking-tighter text-on-surface-variant">STRATOS</div>
            <div className="font-bold text-xs tracking-tighter text-on-surface-variant">NEXUS</div>
            <div className="font-bold text-xs tracking-tighter text-on-surface-variant">VERTEX</div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
