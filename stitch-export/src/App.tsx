/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Mail, Lock, ArrowRight } from "lucide-react";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Ambient Glow Background */}
      <div className="fixed inset-0 bg-glow -z-10 pointer-events-none" />
      <div className="fixed -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="w-full z-50">
        <nav className="flex justify-between items-center px-6 md:px-12 py-6 w-full max-w-7xl mx-auto font-headline antialiased tracking-tight">
          <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-400">
            Auto Follow-Ups
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="text-on-surface-variant font-medium hover:text-primary transition-all">Product</a>
            <a href="#" className="text-on-surface-variant font-medium hover:text-primary transition-all">Solutions</a>
            <a href="#" className="text-on-surface-variant font-medium hover:text-primary transition-all">Pricing</a>
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="#"
              className="px-5 py-2 rounded-full border border-outline-variant/30 text-primary font-medium hover:bg-surface-container-highest/40 transition-all"
            >
              Sign Up
            </motion.a>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Glassmorphism Login Card */}
          <div className="glass-card p-8 md:p-10 rounded-[2rem] shadow-2xl relative overflow-hidden">
            {/* Inner Light Leak Decorative Element */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-3xl rounded-full" />
            
            <div className="relative z-10">
              {/* Title Section */}
              <div className="mb-10 text-center">
                <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface mb-2">
                  Welcome Back
                </h1>
                <p className="text-on-surface-variant font-medium text-sm">
                  Sign in to your account
                </p>
              </div>

              {/* Login Form */}
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-2">
                  <label className="block font-label text-[0.65rem] uppercase tracking-widest text-on-surface-variant ml-1">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="text-outline w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      className="w-full bg-surface-container-highest border-0 rounded-xl py-3.5 pl-11 pr-4 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-tertiary/50 transition-all outline-none"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
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
                      className="w-full bg-surface-container-highest border-0 rounded-xl py-3.5 pl-11 pr-4 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-tertiary/50 transition-all outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full py-4 px-6 bg-gradient-to-r from-primary to-secondary text-background font-bold rounded-full shadow-lg shadow-primary/20 transition-all flex justify-center items-center gap-2"
                  >
                    Sign In
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </form>

              {/* Bottom Action */}
              <div className="mt-10 text-center">
                <p className="text-on-surface-variant text-sm">
                  Don't have an account? 
                  <a href="#" className="text-primary font-semibold hover:underline decoration-secondary underline-offset-4 transition-all ml-1">
                    Sign up
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Social Proof / Context */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            whileHover={{ opacity: 1 }}
            className="mt-8 text-center transition-opacity"
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
      </main>

      {/* Footer */}
      <footer className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-12 py-8 w-full max-w-7xl mx-auto font-body text-[10px] tracking-widest uppercase">
          <div className="opacity-60 text-on-surface-variant mb-4 md:mb-0">
            © 2024 Auto Follow-Ups. All rights reserved.
          </div>
          <div className="flex gap-8">
            <a href="#" className="text-on-surface-variant hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="text-on-surface-variant hover:text-primary transition-colors">Terms</a>
            <a href="#" className="text-on-surface-variant hover:text-primary transition-colors">Help</a>
          </div>
        </div>
      </footer>

      {/* Background Decoration Image */}
      <div className="fixed top-1/4 -right-20 w-96 h-96 opacity-10 pointer-events-none rotate-12 hidden lg:block">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDar_8jf2dugr3YQgn0ZhuV3Gsavej5t_KXIUkTtFaw97B5Cv-HCm1Lk-Inn6XB7hd02si7U3jzQya5ZCCSuDRf7cSLPWapffhSW0Bz6E9vO5EOkTLjZBoHaLFQpR3Ic7b28fK7bzYJ4G6h3bbXJet5AgC_n9zPhxcOUd84v3ECJ5ggszD70ojn905ROVksT_FI51Oy9WcYk32tQo5lMX_B3sH-4Zu4cfmmRev60Vo_lzgtApJsEzzvEzecNYWkmx45GU9-rJDnqLZJ"
          alt="Decorative tech pattern"
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
