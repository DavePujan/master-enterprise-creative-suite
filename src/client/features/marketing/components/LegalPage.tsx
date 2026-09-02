import React, { useEffect, useRef } from 'react';
import { 
  Shield, 
  FileText, 
  RotateCcw, 
  Copyright, 
  Mail, 
  ArrowRight,
  Lock,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { WritopediaLogo } from './LandingPage';

interface LegalPageProps {
  onOpenWorkspace: () => void;
  onLogin: () => void;
  navigateTo: (path: string) => void;
  user: any;
  brandSetupComplete: boolean;
}

export default function LegalPage({ 
  onOpenWorkspace, 
  onLogin, 
  navigateTo, 
  user, 
  brandSetupComplete 
}: LegalPageProps) {
  
  const privacyRef = useRef<HTMLDivElement>(null);
  const termsRef = useRef<HTMLDivElement>(null);
  const refundRef = useRef<HTMLDivElement>(null);
  const ipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to section based on hash on mount
    const hash = window.location.hash;
    if (hash === '#privacy') {
      privacyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (hash === '#terms') {
      termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (hash === '#refund') {
      refundRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (hash === '#ip') {
      ipRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div id="legal-page-container" className="min-h-screen bg-[#fafafc] text-slate-800 font-sans relative overflow-x-hidden selection:bg-crimson/10 selection:text-crimson">
      {/* Subtle Dot Matrix Background Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-70 pointer-events-none" />

      {/* Header */}
      <header id="legal-header" className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <div onClick={() => navigateTo('/')} className="cursor-pointer">
            <WritopediaLogo className="h-14 sm:h-16" />
          </div>

          {/* Nav Center */}
          <nav id="legal-nav" className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button 
              onClick={onOpenWorkspace}
              className="hover:text-crimson transition-colors cursor-pointer"
            >
              Platform
            </button>
            <button 
              onClick={() => navigateTo('/pricing')}
              className="hover:text-crimson transition-colors cursor-pointer"
            >
              Pricing
            </button>
            <a 
              href="https://writopedia.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-crimson transition-colors cursor-pointer"
            >
              Website
            </a>
            <button 
              onClick={() => navigateTo('/')}
              className="hover:text-crimson transition-colors cursor-pointer"
            >
              Contact
            </button>
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-4">
            <button 
              onClick={onLogin}
              className="text-sm font-semibold text-slate-600 hover:text-crimson transition-colors px-3 py-1.5 cursor-pointer"
            >
              Log In
            </button>
            <button 
              onClick={onLogin}
              className="bg-crimson hover:bg-crimson/90 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 pt-16 pb-20 relative z-10">
        
        {/* Hero Area */}
        <div className="space-y-4 mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 font-sans"
          >
            Legal Information
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 text-lg font-light max-w-2xl leading-relaxed"
          >
            Writopedia AI operates as a subscription-based Software-as-a-Service (SaaS) platform. Use of the platform is governed by our legal policies.
          </motion.p>
          <div className="h-px bg-slate-200 w-full mt-8" />
        </div>

        {/* Available Policies Jump Grid */}
        <div className="space-y-6 mb-16">
          <h2 className="text-xl font-semibold text-slate-800 font-sans">Available Policies</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Quick Card 1: Privacy Policy */}
            <motion.div 
              whileHover={{ y: -4, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)' }}
              onClick={() => scrollToSection(privacyRef)}
              className="bg-white border border-slate-200/80 rounded-2xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between h-[160px] shadow-sm"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-crimson/5 border border-crimson/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-crimson" />
                </div>
                <div className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Privacy Policy
                </div>
              </div>
              <div className="text-crimson text-sm font-bold flex items-center gap-1 hover:underline">
                Read Policy <ArrowRight size={14} />
              </div>
            </motion.div>

            {/* Quick Card 2: Terms of Service */}
            <motion.div 
              whileHover={{ y: -4, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)' }}
              onClick={() => scrollToSection(termsRef)}
              className="bg-white border border-slate-200/80 rounded-2xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between h-[160px] shadow-sm"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-crimson/5 border border-crimson/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-crimson" />
                </div>
                <div className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Terms of Service
                </div>
              </div>
              <div className="text-crimson text-sm font-bold flex items-center gap-1 hover:underline">
                Read Terms <ArrowRight size={14} />
              </div>
            </motion.div>

            {/* Quick Card 3: Refund Policy */}
            <motion.div 
              whileHover={{ y: -4, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)' }}
              onClick={() => scrollToSection(refundRef)}
              className="bg-white border border-slate-200/80 rounded-2xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between h-[160px] shadow-sm"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-crimson/5 border border-crimson/10 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-crimson" />
                </div>
                <div className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Refund Policy
                </div>
              </div>
              <div className="text-crimson text-sm font-bold flex items-center gap-1 hover:underline">
                Read Policy <ArrowRight size={14} />
              </div>
            </motion.div>

          </div>
        </div>

        {/* Detailed Policies Section Vertical Stack */}
        <div className="space-y-8 mb-16">
          
          {/* Section 1: Privacy */}
          <div ref={privacyRef} className="scroll-mt-24">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm flex flex-col md:flex-row gap-6 items-start"
            >
              <div className="w-12 h-12 rounded-full bg-crimson/5 border border-crimson/10 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-crimson" />
              </div>
              <div className="space-y-4 flex-1">
                <h3 className="text-2xl font-bold text-slate-900 font-sans">Privacy</h3>
                <p className="text-slate-600 leading-relaxed font-light">
                  We respect user privacy and process personal information in accordance with our Privacy Policy. Customer content is handled securely. We utilize industry-standard encryption protocols to ensure that all data transmitted to and from Writopedia AI remains confidential. Your intellectual property and personal data are never sold to third parties.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Section 2: Terms of Service */}
          <div ref={termsRef} className="scroll-mt-24">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm flex flex-col md:flex-row gap-6 items-start"
            >
              <div className="w-12 h-12 rounded-full bg-crimson/5 border border-crimson/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-crimson" />
              </div>
              <div className="space-y-4 flex-1">
                <h3 className="text-2xl font-bold text-slate-900 font-sans">Terms of Service</h3>
                <p className="text-slate-600 leading-relaxed font-light">
                  By creating an account or using Writopedia AI, you agree to comply with our Terms of Service. These terms outline the acceptable use of our platform, user responsibilities, and limitations of liability. We reserve the right to suspend accounts that violate these terms, particularly concerning the generation of harmful or illegal content.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Section 3: Refund Policy */}
          <div ref={refundRef} className="scroll-mt-24">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm flex flex-col md:flex-row gap-6 items-start"
            >
              <div className="w-12 h-12 rounded-full bg-crimson/5 border border-crimson/10 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-crimson" />
              </div>
              <div className="space-y-4 flex-1">
                <h3 className="text-2xl font-bold text-slate-900 font-sans">Refund Policy</h3>
                <p className="text-slate-600 leading-relaxed font-light">
                  Subscription payments are generally non-refundable unless required by applicable law. Because Writopedia AI provides immediate access to computational resources and proprietary models upon subscription, we cannot offer prorated refunds for mid-cycle cancellations. Users may cancel their subscription at any time to prevent future billing.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Section 4: Intellectual Property */}
          <div ref={ipRef} className="scroll-mt-24">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm flex flex-col md:flex-row gap-6 items-start"
            >
              <div className="w-12 h-12 rounded-full bg-crimson/5 border border-crimson/10 flex items-center justify-center shrink-0">
                <Copyright className="w-5 h-5 text-crimson" />
              </div>
              <div className="space-y-4 flex-1">
                <h3 className="text-2xl font-bold text-slate-900 font-sans">Intellectual Property</h3>
                <p className="text-slate-600 leading-relaxed font-light">
                  All platform software, branding, and proprietary technology are owned by Writopedia AI. Users retain full ownership and copyright of the content they generate using our platform. We claim no rights to your original creative work or the final outputs produced through your prompts and editorial input.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Support Highlight Callout Card (Soft light-blue background) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-[#eef2ff] border border-indigo-100 rounded-3xl p-10 text-center space-y-6 mt-12 shadow-sm"
          >
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-indigo-950 font-sans">Questions about our policies?</h3>
              <p className="text-indigo-700 font-light max-w-lg mx-auto leading-relaxed">
                Our legal team is available to address any concerns regarding data privacy or terms.
              </p>
            </div>
            
            <a 
              href="mailto:business@writopedia.com"
              className="inline-flex items-center gap-2 bg-crimson hover:bg-crimson/95 text-white font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-full shadow-lg shadow-crimson/10 hover:shadow-xl hover:shadow-crimson/20 transition-all duration-200 cursor-pointer"
            >
              Contact business@writopedia.com
            </a>
          </motion.div>

        </div>

      </main>

      {/* Primary Footer */}
      <footer className="border-t border-slate-100 bg-white py-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div onClick={() => navigateTo('/')} className="cursor-pointer">
              <WritopediaLogo className="h-10" />
            </div>
            <span className="text-slate-300">|</span>
            <span className="font-light">© 2026 Writopedia AI. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => { scrollToSection(privacyRef); }} className="hover:text-crimson transition-colors font-medium cursor-pointer">Privacy Policy</button>
            <button onClick={() => { scrollToSection(refundRef); }} className="hover:text-crimson transition-colors font-medium cursor-pointer">Refund Policy</button>
            <button onClick={() => { scrollToSection(termsRef); }} className="hover:text-crimson transition-colors font-medium cursor-pointer">Terms of Service</button>
            <a href="mailto:business@writopedia.com" className="hover:text-crimson transition-colors font-medium cursor-pointer">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
