/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Bell, 
  Settings, 
  MoreVertical, 
  Users, 
  Sparkles, 
  Edit2,
  LayoutDashboard
} from 'lucide-react';
import { motion } from 'motion/react';
import { Campaign, Stat } from './types';

const CAMPAIGNS: Campaign[] = [
  {
    id: '1',
    title: 'Inbound Outreach - Q1',
    status: 'active',
    contacts: 452,
    messages: 1208,
    lastActive: '2m ago',
    avatars: [
      'https://picsum.photos/seed/user1/64/64',
      'https://picsum.photos/seed/user2/64/64',
    ]
  },
  {
    id: '2',
    title: 'Nurture - New Leads',
    status: 'draft',
    contacts: 89,
    messages: 0,
    createdDate: 'yesterday'
  },
  {
    id: '3',
    title: 'Enterprise Outreach 2023',
    status: 'completed',
    contacts: 709,
    messages: 3094,
    endDate: 'Oct 24',
    responseRate: '84%'
  },
  {
    id: '4',
    title: 'SaaS Partnership Program',
    status: 'active',
    contacts: 112,
    messages: 560,
    lastActive: '1h ago',
    avatars: [
      'https://picsum.photos/seed/user3/64/64',
      'https://picsum.photos/seed/user4/64/64',
    ]
  }
];

const STATS: Stat[] = [
  { label: 'Total Campaigns', value: '12', icon: 'campaign', color: 'primary' },
  { label: 'Total Contacts', value: '1,250', icon: 'groups', color: 'secondary' },
  { label: 'Messages Generated', value: '4,302', icon: 'auto_awesome', color: 'tertiary' }
];

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-white/5 h-16 flex justify-between items-center px-8">
        <div className="flex items-center gap-12">
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-headline tracking-tight">
            Auto Follow-Ups
          </span>
          <div className="hidden md:flex items-center gap-8 font-headline tracking-tight text-sm">
            <a href="#" className="text-primary border-b-2 border-primary pb-1">Dashboard</a>
            <a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">Sequences</a>
            <a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">Analytics</a>
            <a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">Leads</a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center bg-surface-container-highest rounded-full px-4 py-1.5 border border-white/5">
            <Search className="text-on-surface-variant w-4 h-4 mr-2" />
            <input 
              type="text" 
              placeholder="Search campaigns..." 
              className="bg-transparent border-none focus:outline-none text-sm placeholder:text-on-surface-variant w-48"
            />
          </div>
          <button className="bg-gradient-to-r from-primary to-secondary text-surface font-headline font-bold text-sm px-6 py-2 rounded-full active:scale-95 transition-all shadow-[0_0_20px_-5px_rgba(159,167,255,0.4)]">
            New Campaign
          </button>
          <div className="flex items-center gap-2 border-l border-white/10 ml-2 pl-4">
            <button className="p-2 text-on-surface-variant hover:bg-surface-bright rounded-full transition-all">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 text-on-surface-variant hover:bg-surface-bright rounded-full transition-all">
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/20 ml-2">
              <img 
                src="https://picsum.photos/seed/profile/100/100" 
                alt="Profile" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 pt-32 pb-20 px-8 max-w-7xl mx-auto w-full relative">
        {/* Ambient Glows */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10" />
        <div className="absolute top-[40%] right-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] -z-10" />

        <header className="mb-12">
          <h1 className="font-headline text-4xl text-on-surface font-extrabold tracking-tight mb-2">Campaign Performance</h1>
          <p className="text-on-surface-variant text-lg max-w-2xl">
            Monitor your AI-driven outreach across all active sequences. Your engagement rate has increased by <span className="text-tertiary">14.2%</span> this week.
          </p>
        </header>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {STATS.map((stat, idx) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-6 rounded-xl flex items-center justify-between"
            >
              <div>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-widest block mb-1 font-bold">
                  {stat.label}
                </span>
                <span className="font-headline text-3xl font-bold text-on-surface tracking-tight">
                  {stat.value}
                </span>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                stat.color === 'primary' ? 'bg-primary/10 text-primary' :
                stat.color === 'secondary' ? 'bg-secondary/10 text-secondary' :
                'bg-tertiary/10 text-tertiary'
              }`}>
                {stat.icon === 'campaign' && <LayoutDashboard className="w-6 h-6" />}
                {stat.icon === 'groups' && <Users className="w-6 h-6" />}
                {stat.icon === 'auto_awesome' && <Sparkles className="w-6 h-6" />}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Campaign Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {CAMPAIGNS.map((campaign, idx) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              className="glass-card rounded-xl p-6 glow-hover group cursor-pointer"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  campaign.status === 'active' ? 'bg-secondary/10 text-secondary' :
                  campaign.status === 'completed' ? 'bg-tertiary/10 text-tertiary' :
                  'bg-surface-container-highest text-on-surface-variant'
                }`}>
                  {campaign.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />}
                  {campaign.status}
                </div>
                <button className="text-on-surface-variant hover:text-on-surface transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <h3 className="font-headline text-lg font-bold text-on-surface mb-6 group-hover:text-primary transition-colors">
                {campaign.title}
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-surface-container-low p-3 rounded-lg">
                  <span className="block text-[10px] text-on-surface-variant uppercase tracking-tighter mb-1 font-bold">Contacts</span>
                  <span className="font-headline font-semibold text-on-surface">{campaign.contacts}</span>
                </div>
                <div className="bg-surface-container-low p-3 rounded-lg">
                  <span className="block text-[10px] text-on-surface-variant uppercase tracking-tighter mb-1 font-bold">Messages</span>
                  <span className="font-headline font-semibold text-on-surface">{campaign.messages}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-on-surface-variant pt-4 border-t border-white/5">
                <span>
                  {campaign.status === 'active' && `Last active ${campaign.lastActive}`}
                  {campaign.status === 'draft' && `Created ${campaign.createdDate}`}
                  {campaign.status === 'completed' && `Ended ${campaign.endDate}`}
                </span>
                
                {campaign.status === 'draft' ? (
                  <div className="flex items-center gap-1 text-primary font-bold">
                    <Edit2 className="w-3 h-3" />
                    Continue
                  </div>
                ) : campaign.status === 'completed' ? (
                  <span className="text-tertiary font-medium">{campaign.responseRate} Response Rate</span>
                ) : (
                  <div className="flex -space-x-2">
                    {campaign.avatars?.map((src, i) => (
                      <img 
                        key={i}
                        src={src} 
                        alt="Avatar" 
                        className="w-6 h-6 rounded-full border-2 border-surface-container"
                        referrerPolicy="no-referrer"
                      />
                    ))}
                    <div className="w-6 h-6 rounded-full bg-surface-container-highest border-2 border-surface-container flex items-center justify-center text-[10px] font-bold">
                      +12
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Launch New Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all group cursor-pointer min-h-[280px]"
          >
            <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:bg-primary/10">
              <Plus className="w-8 h-8" />
            </div>
            <span className="font-headline font-bold text-lg">Launch New Sequence</span>
            <p className="text-center text-sm mt-2 max-w-[200px] opacity-60">
              Leverage AI to create a personalized outreach strategy in seconds.
            </p>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface w-full py-12 border-t border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 max-w-7xl mx-auto w-full">
          <div className="mb-6 md:mb-0">
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              © 2024 Auto Follow-Ups. Powered by Ethereal Intelligence.
            </span>
          </div>
          <div className="flex items-center gap-8 text-[10px] uppercase tracking-widest font-bold">
            <a href="#" className="text-on-surface-variant hover:text-tertiary transition-colors">Privacy Policy</a>
            <a href="#" className="text-on-surface-variant hover:text-tertiary transition-colors">Terms of Service</a>
            <a href="#" className="text-on-surface-variant hover:text-tertiary transition-colors">API Docs</a>
            <a href="#" className="text-on-surface-variant hover:text-tertiary transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
