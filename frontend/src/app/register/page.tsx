"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { User, Mail, Building, Lock, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "motion/react";

import { useAuthStore } from "@/stores/auth";

const registerSchema = z
  .object({
    full_name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email"),
    company: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        company: data.company,
      });
      toast.success("Account created! Please sign in.");
      router.push("/login");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center w-full min-h-screen px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8 md:p-10 rounded-[2rem] shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-secondary/20 blur-3xl rounded-full pointer-events-none" />
          
          <div className="relative z-10">
            <div className="mb-8 text-center">
              <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface mb-2">
                Create Account
              </h1>
              <p className="text-on-surface-variant font-medium text-sm">
                Get started with AI-powered outreach
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block font-label text-[0.65rem] uppercase tracking-widest text-on-surface-variant ml-1">
                  Full Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="text-outline w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    {...register("full_name")}
                    className={`w-full bg-surface-container-highest border-0 rounded-xl py-3 pl-11 pr-4 text-sm text-on-surface placeholder:text-outline focus:ring-1 focus:ring-secondary/50 transition-all outline-none ${errors.full_name ? 'ring-1 ring-destructive' : ''}`}
                    placeholder="John Doe"
                  />
                </div>
                {errors.full_name && (
                  <p className="text-[10px] text-destructive ml-1">{errors.full_name.message}</p>
                )}
              </div>

              {/* Email */}
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
                    className={`w-full bg-surface-container-highest border-0 rounded-xl py-3 pl-11 pr-4 text-sm text-on-surface placeholder:text-outline focus:ring-1 focus:ring-secondary/50 transition-all outline-none ${errors.email ? 'ring-1 ring-destructive' : ''}`}
                    placeholder="you@company.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-[10px] text-destructive ml-1">{errors.email.message}</p>
                )}
              </div>

              {/* Company */}
              <div className="space-y-1.5">
                <label className="block font-label text-[0.65rem] uppercase tracking-widest text-on-surface-variant ml-1">
                  Company (Optional)
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Building className="text-outline w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    {...register("company")}
                    className="w-full bg-surface-container-highest border-0 rounded-xl py-3 pl-11 pr-4 text-sm text-on-surface placeholder:text-outline focus:ring-1 focus:ring-secondary/50 transition-all outline-none"
                    placeholder="Acme Inc."
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block font-label text-[0.65rem] uppercase tracking-widest text-on-surface-variant ml-1">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="text-outline w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    {...register("password")}
                    className={`w-full bg-surface-container-highest border-0 rounded-xl py-3 pl-11 pr-4 text-sm text-on-surface placeholder:text-outline focus:ring-1 focus:ring-secondary/50 transition-all outline-none ${errors.password ? 'ring-1 ring-destructive' : ''}`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && (
                  <p className="text-[10px] text-destructive ml-1">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block font-label text-[0.65rem] uppercase tracking-widest text-on-surface-variant ml-1">
                  Confirm Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="text-outline w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    {...register("confirmPassword")}
                    className={`w-full bg-surface-container-highest border-0 rounded-xl py-3 pl-11 pr-4 text-sm text-on-surface placeholder:text-outline focus:ring-1 focus:ring-secondary/50 transition-all outline-none ${errors.confirmPassword ? 'ring-1 ring-destructive' : ''}`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-[10px] text-destructive ml-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-secondary to-primary text-background font-bold rounded-full shadow-lg shadow-secondary/20 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create account"}
                  {!isLoading && <ArrowRight className="w-5 h-5" />}
                </motion.button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-on-surface-variant text-sm">
                Already have an account? 
                <Link href="/login" className="text-primary font-semibold hover:underline decoration-secondary underline-offset-4 transition-all ml-1">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
