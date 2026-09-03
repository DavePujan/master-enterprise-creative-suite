import React, { useState } from 'react';
import { 
  Rocket, 
  Tag, 
  Shield, 
  MessageSquare, 
  Info, 
  Check, 
  ArrowRight, 
  X, 
  Mail, 
  Phone, 
  Clock, 
  FileText,
  Lock,
  Compass,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Custom, highly accurate logo component displaying the uploaded brand asset from the public folder
export function WritopediaLogo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 cursor-pointer select-none ${className}`} onClick={() => window.location.reload()}>
      <img 
        src="/logo.png" 
        alt="Writopedia Logo" 
        className="h-full w-auto object-contain" 
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

interface LandingPageProps {
  onOpenWorkspace: () => void;
  onLogin: () => void;
  navigateTo?: (path: string) => void;
}

export default function LandingPage({ onOpenWorkspace, onLogin, navigateTo }: LandingPageProps) {
  const [activeModal, setActiveModal] = useState<'plans' | 'legal' | 'contact' | 'about' | 'documentation' | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms' | 'refund'>('privacy');

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setContactForm({ name: '', email: '', message: '' });
      setActiveModal(null);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#fafafc] text-slate-800 font-sans relative overflow-x-hidden selection:bg-crimson/10 selection:text-crimson">
      {/* Subtle Dot Matrix Background Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-70 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <WritopediaLogo className="h-14 sm:h-16" />

          {/* Nav Center */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button 
              onClick={onOpenWorkspace}
              className="hover:text-crimson transition-colors cursor-pointer"
            >
              Platform
            </button>
            <button 
              onClick={() => { if (navigateTo) { navigateTo('/pricing'); } else { setActiveModal('plans'); } }}
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
              onClick={() => setActiveModal('contact')}
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

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 pt-16 pb-20 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.15]">
            Writopedia AI Platform
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-600 font-light max-w-2xl mx-auto leading-relaxed">
            Create brand-consistent campaigns, presentations, images, videos, and marketing content from a single AI workspace.
          </p>

          <p className="text-sm text-slate-400 font-light max-w-lg mx-auto">
            Browse the platform, pricing and documentation before creating your workspace.
          </p>

          {/* Badges */}
          <div className="flex flex-wrap justify-center items-center gap-3 pt-4">
            {[
              "Brand AI Workspace",
              "Secure Payments",
              "Free Trial Available",
              "Enterprise Ready"
            ].map((pill, idx) => (
              <span 
                key={idx} 
                className="bg-white border border-slate-200/80 px-4 py-2 rounded-full text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <Check size={14} className="text-crimson shrink-0" />
                {pill}
              </span>
            ))}
          </div>

          <p className="text-xs text-slate-400 font-light max-w-md mx-auto pt-4 leading-relaxed">
            Writopedia AI is an enterprise SaaS platform for AI-powered creative automation, trusted by businesses worldwide.
          </p>
        </motion.div>

        {/* Dashboard Cards Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-12 gap-6 max-w-4xl mx-auto text-left">
          {/* Open Workspace Action Box (Crimson Gradient) */}
          <motion.div 
            whileHover={{ scale: 1.01, y: -2 }}
            className="md:col-span-5 bg-gradient-to-br from-crimson to-[#b51034] rounded-2xl p-8 flex flex-col justify-between h-[280px] shadow-lg shadow-crimson/10 hover:shadow-crimson/20 transition-all duration-300 cursor-pointer"
            onClick={onOpenWorkspace}
            id="open-workspace-card"
          >
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Rocket className="text-white w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-white font-bold text-2xl tracking-tight">
                <span>Open Workspace</span>
                <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-white/80 font-light text-sm">
                Access your AI workspace
              </p>
            </div>
          </motion.div>

          {/* Sub Grid for Secondary Actions */}
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Plans Card */}
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => { if (navigateTo) { navigateTo('/pricing'); } else { setActiveModal('plans'); } }}
              className="bg-white border border-slate-200/60 rounded-2xl p-6 hover:shadow-sm hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col justify-between h-[134px]"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm uppercase tracking-wide">
                  <Tag size={16} className="text-slate-500" />
                  <span>Plans</span>
                </div>
                <p className="text-xs text-slate-500 font-light leading-snug">
                  Starter from ₹1,950/month
                </p>
              </div>
              <button 
                type="button"
                className="text-[11px] font-bold text-crimson hover:text-crimson/80 transition-colors flex items-center gap-1.5 self-start"
              >
                Compare Plans →
              </button>
            </motion.div>

            {/* Legal Card */}
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => { if (navigateTo) { navigateTo('/legal'); } else { setLegalTab('privacy'); setActiveModal('legal'); } }}
              className="bg-white border border-slate-200/60 rounded-2xl p-6 hover:shadow-sm hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col justify-between h-[134px]"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm uppercase tracking-wide">
                  <Shield size={16} className="text-slate-500" />
                  <span>Legal</span>
                </div>
                <p className="text-xs text-slate-500 font-light leading-snug">
                  Privacy, Terms, Refund Policy
                </p>
              </div>
            </motion.div>

            {/* Contact Card */}
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => setActiveModal('contact')}
              className="bg-white border border-slate-200/60 rounded-2xl p-6 hover:shadow-sm hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col justify-between h-[134px]"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm uppercase tracking-wide">
                  <MessageSquare size={16} className="text-slate-500" />
                  <span>Contact</span>
                </div>
                <p className="text-xs text-slate-500 font-light leading-snug">
                  Enterprise support team
                </p>
              </div>
            </motion.div>

            {/* About Card */}
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => window.open("https://writopedia.com", "_blank")}
              className="bg-white border border-slate-200/60 rounded-2xl p-6 hover:shadow-sm hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col justify-between h-[134px]"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm uppercase tracking-wide">
                  <Info size={16} className="text-slate-500" />
                  <span>About</span>
                </div>
                <p className="text-xs text-slate-500 font-light leading-snug">
                  Learn about Writopedia, our company, and policies.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Support Sub-footer */}
      <div className="border-t border-slate-200/50 bg-slate-50/50 py-6 text-center text-[11px] text-slate-500 space-y-2">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center items-center gap-x-6 gap-y-2">
          <span>Need help choosing a plan?</span>
          <a href="mailto:business@writopedia.com" className="hover:text-crimson transition-colors flex items-center gap-1">
            <Mail size={12} /> business@writopedia.com
          </a>
          <span className="flex items-center gap-1">
            <Phone size={12} /> +91 84695 11803
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} /> Monday-Friday • 10:00 AM - 6:00 PM IST
          </span>
        </div>
        <p className="max-w-xl mx-auto px-6 leading-relaxed">
          Writopedia AI helps businesses generate AI-powered marketing assets, presentations, documents and campaigns while maintaining brand consistency.
        </p>
      </div>

      {/* Primary Footer */}
      <footer className="border-t border-slate-100 bg-white py-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© 2026 Writopedia AI</span>
          <span className="text-slate-500">business@writopedia.com</span>
          <div className="flex items-center gap-6">
            <button onClick={() => { if (navigateTo) { navigateTo('/legal#privacy'); } else { setLegalTab('privacy'); setActiveModal('legal'); } }} className="hover:text-crimson transition-colors cursor-pointer">Privacy Policy</button>
            <button onClick={() => { if (navigateTo) { navigateTo('/legal#refund'); } else { setLegalTab('refund'); setActiveModal('legal'); } }} className="hover:text-crimson transition-colors cursor-pointer">Refund Policy</button>
            <button onClick={() => { if (navigateTo) { navigateTo('/legal#terms'); } else { setLegalTab('terms'); setActiveModal('legal'); } }} className="hover:text-crimson transition-colors cursor-pointer">Terms of Service</button>
            <button onClick={() => setActiveModal('contact')} className="hover:text-crimson transition-colors cursor-pointer">Contact</button>
          </div>
        </div>
      </footer>

      {/* Modals & Overlays */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl border border-slate-100 flex flex-col z-10"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                  {activeModal === 'plans' && <><Tag className="text-crimson" /> Subscription Plans</>}
                  {activeModal === 'legal' && <><Shield className="text-crimson" /> Legal Agreements & Rules</>}
                  {activeModal === 'contact' && <><MessageSquare className="text-crimson" /> Enterprise Support Line</>}
                  {activeModal === 'about' && <><Info className="text-crimson" /> Corporate Profile</>}
                  {activeModal === 'documentation' && <><Compass className="text-crimson" /> Platform Quickstart</>}
                </h3>
                <button 
                  onClick={() => setActiveModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content Scroll */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* 1. Plans */}
                {activeModal === 'plans' && (
                  <div className="space-y-6">
                    <p className="text-slate-500 font-light text-sm">
                      Select a flexible, high-capacity license to scale your brand expressions with professional quality.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Tier 1 */}
                      <div className="border border-slate-150 rounded-xl p-5 bg-slate-50/50 flex flex-col justify-between h-72">
                        <div className="space-y-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Starter</span>
                          <div className="space-y-1">
                            <div className="text-2xl font-bold text-slate-900">₹1,950</div>
                            <div className="text-[10px] text-slate-400">per user / month</div>
                          </div>
                          <ul className="text-[11px] text-slate-500 space-y-2">
                            <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500 shrink-0" /> 50 AI Credits</li>
                            <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500 shrink-0" /> 1 Brand Profile</li>
                            <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500 shrink-0" /> Full HD Imagery</li>
                          </ul>
                        </div>
                        <button onClick={() => { setActiveModal(null); onLogin(); }} className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] py-2 rounded-lg font-bold tracking-wider uppercase transition-colors">Choose Starter</button>
                      </div>

                      {/* Tier 2 */}
                      <div className="border-2 border-crimson rounded-xl p-5 bg-white relative flex flex-col justify-between h-72 shadow-md shadow-crimson/5">
                        <div className="absolute top-0 right-6 -translate-y-1/2 bg-crimson text-white text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full">Popular</div>
                        <div className="space-y-3">
                          <span className="text-[10px] font-bold text-crimson uppercase tracking-widest">Professional</span>
                          <div className="space-y-1">
                            <div className="text-2xl font-bold text-slate-900">₹4,950</div>
                            <div className="text-[10px] text-slate-400">per user / month</div>
                          </div>
                          <ul className="text-[11px] text-slate-500 space-y-2">
                            <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500 shrink-0" /> 150 AI Credits</li>
                            <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500 shrink-0" /> Unlimited Brand Kits</li>
                            <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500 shrink-0" /> 4K Image & Cinematic Video</li>
                            <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500 shrink-0" /> Human Touch Support</li>
                          </ul>
                        </div>
                        <button onClick={() => { setActiveModal(null); onLogin(); }} className="w-full bg-crimson hover:bg-crimson/95 text-white text-[10px] py-2 rounded-lg font-bold tracking-wider uppercase transition-colors">Go Professional</button>
                      </div>

                      {/* Tier 3 */}
                      <div className="border border-slate-150 rounded-xl p-5 bg-slate-50/50 flex flex-col justify-between h-72">
                        <div className="space-y-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enterprise</span>
                          <div className="space-y-1">
                            <div className="text-xl font-bold text-slate-900">Custom Rate</div>
                            <div className="text-[10px] text-slate-400">tailored SLA terms</div>
                          </div>
                          <ul className="text-[11px] text-slate-500 space-y-2">
                            <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500 shrink-0" /> Unlimited AI Quota</li>
                            <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500 shrink-0" /> Dedicated Account Lead</li>
                            <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500 shrink-0" /> Custom API Integrations</li>
                            <li className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500 shrink-0" /> Fine-tuned brand models</li>
                          </ul>
                        </div>
                        <button onClick={() => { setActiveModal(null); onLogin(); }} className="w-full bg-slate-150 hover:bg-slate-200 text-slate-700 text-[10px] py-2 rounded-lg font-bold tracking-wider uppercase transition-colors">Talk to Sales</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Legal */}
                {activeModal === 'legal' && (
                  <div className="space-y-4">
                    <div className="flex border-b border-slate-100">
                      {[
                        { id: 'privacy', label: 'Privacy Policy' },
                        { id: 'terms', label: 'Terms of Service' },
                        { id: 'refund', label: 'Refund Policy' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setLegalTab(tab.id as any)}
                          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px cursor-pointer ${
                            legalTab === tab.id 
                              ? 'border-crimson text-crimson' 
                              : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="text-slate-600 font-light text-xs leading-relaxed max-h-64 overflow-y-auto pr-2 space-y-4">
                      {legalTab === 'privacy' && (
                        <>
                          <p className="font-bold text-slate-800">1. Data Storage and Protection</p>
                          <p>Writopedia AI holds corporate security in absolute priority. Any brand asset, including logos, target keywords, custom text copy, or draft guidelines, are locked to your private user account using Supabase enterprise authentication and PostgreSQL Row Level Security (RLS).</p>
                          <p className="font-bold text-slate-800">2. AI Training Exclusions</p>
                          <p>We do not use customer data, uploaded logos, or generated templates to train public models. Your intellectual property is strictly protected.</p>
                        </>
                      )}
                      {legalTab === 'terms' && (
                        <>
                          <p className="font-bold text-slate-800">1. Usage Rights</p>
                          <p>All campaigns, slideshow presentations, generated vectors, and synthetic audio clips created on Writopedia belong entirely to the creative license holder. You have global distribution rights.</p>
                          <p className="font-bold text-slate-800">2. Prohibited Content</p>
                          <p>Users must not generate misinformation, deep-fakes, or abusive copy. Any breach of terms will lead to immediate account lock without refund.</p>
                        </>
                      )}
                      {legalTab === 'refund' && (
                        <>
                          <p className="font-bold text-slate-800">1. Credit Consumption and Refunds</p>
                          <p>We provide 50 free credits on sign-up so you can test all engines risk-free. Paid subscriptions come with a 7-day money-back guarantee if less than 15 credits have been used.</p>
                          <p className="font-bold text-slate-800">2. Curation Request Guarantee</p>
                          <p>If a human-touch refinement request fails to satisfy your target guidelines, credits will be refunded back to your balance immediately.</p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Contact Form */}
                {activeModal === 'contact' && (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    {contactSubmitted ? (
                      <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-6 rounded-xl text-center space-y-2">
                        <Check className="mx-auto w-10 h-10 text-emerald-500 animate-bounce" />
                        <h4 className="font-bold text-sm">Message Transmitted</h4>
                        <p className="text-xs text-emerald-500 font-light">An enterprise advisor will reply within 2 hours.</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-slate-500 font-light text-xs">
                          Have specialized pipeline requirements? Complete the form below to reach our dedicated enterprise onboarding desk.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                            <input 
                              type="text" 
                              required 
                              value={contactForm.name}
                              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                              placeholder="Jane Doe" 
                              className="w-full bg-slate-50 border border-slate-150 focus:border-crimson p-2.5 rounded-lg text-xs outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                            <input 
                              type="email" 
                              required 
                              value={contactForm.email}
                              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                              placeholder="jane@yourcompany.com" 
                              className="w-full bg-slate-50 border border-slate-150 focus:border-crimson p-2.5 rounded-lg text-xs outline-none transition-all"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Detailed Requirements</label>
                          <textarea 
                            rows={4} 
                            required
                            value={contactForm.message}
                            onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                            placeholder="Please outline your estimated campaign volume, custom model fine-tuning needs, or API throughput requirements." 
                            className="w-full bg-slate-50 border border-slate-150 focus:border-crimson p-2.5 rounded-lg text-xs outline-none transition-all resize-none"
                          />
                        </div>
                        <button 
                          type="submit" 
                          className="w-full bg-crimson hover:bg-crimson/95 text-white font-bold text-xs py-3 rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Send Message
                        </button>
                      </>
                    )}
                  </form>
                )}

                {/* 4. About */}
                {activeModal === 'about' && (
                  <div className="space-y-4">
                    <p className="text-slate-600 font-light text-xs leading-relaxed">
                      Writopedia AI leads creative workflow transformation by orchestrating unified brand voices across text, image, audio, and cinematic sequences.
                    </p>
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
                      <div className="flex items-center gap-3">
                        <Briefcase className="text-crimson shrink-0" size={18} />
                        <div>
                          <p className="font-bold text-xs text-slate-800">Enterprise AI Infrastructure</p>
                          <p className="text-[10px] text-slate-400">Harnessing custom generative foundation models to deploy dynamic brand assets safely.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Lock className="text-crimson shrink-0" size={18} />
                        <div>
                          <p className="font-bold text-xs text-slate-800">Data-Compliance Standard</p>
                          <p className="text-[10px] text-slate-400">Locked sandboxes hosting safe curation, translation, and media editing suites.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Documentation */}
                {activeModal === 'documentation' && (
                  <div className="space-y-4">
                    <p className="text-slate-600 font-light text-xs leading-relaxed">
                      Welcome to the Enterprise Creative Suite. Build a coherent, high-impact presence in minutes:
                    </p>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-crimson/10 text-crimson flex items-center justify-center text-xs font-bold shrink-0">1</div>
                        <div>
                          <p className="font-bold text-xs text-slate-800">Deploy Brand Identity</p>
                          <p className="text-[11px] text-slate-400">Scan your website URL or write a brief to generate coordinated hex themes, logo assets, and custom pillars.</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-crimson/10 text-crimson flex items-center justify-center text-xs font-bold shrink-0">2</div>
                        <div>
                          <p className="font-bold text-xs text-slate-800">Launch Creative Gems</p>
                          <p className="text-[11px] text-slate-400">Leverage specialized pipelines like photorealistic imaging, text copy writing, interactive audio readouts, and cinematic sequences.</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-crimson/10 text-crimson flex items-center justify-center text-xs font-bold shrink-0">3</div>
                        <div>
                          <p className="font-bold text-xs text-slate-800">Human Refinement</p>
                          <p className="text-[11px] text-slate-400">Submit requests directly to specialized human designers when complex layouts or custom editing are required.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
