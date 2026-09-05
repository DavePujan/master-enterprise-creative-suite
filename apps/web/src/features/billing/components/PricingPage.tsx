import React, { useState, useEffect } from 'react';
import { 
  Check, 
  ArrowRight, 
  Star, 
  Info, 
  Building,
  Sparkles,
  CreditCard,
  Coins,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WritopediaLogo } from '@web/features/marketing/components/LandingPage.js';
import { apiClient } from '@web/infrastructure/api/apiClient.js';
import type { PlanId } from '@shared-types/billing.js';

interface PricingPageProps {
  onOpenWorkspace: () => void;
  onLogin: () => void;
  navigateTo: (path: string) => void;
  user: any;
  brandSetupComplete: boolean;
  credits?: number;
  setCredits?: React.Dispatch<React.SetStateAction<number>>;
}

export default function PricingPage({ 
  onOpenWorkspace, 
  onLogin, 
  navigateTo, 
  user, 
  brandSetupComplete,
  credits,
  setCredits
}: PricingPageProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>('monthly');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('USD');
  const [currencySource, setCurrencySource] = useState<string>('default'); // 'timezone', 'ipapi', 'ip-api', 'manual'
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const [isScriptLoading, setIsScriptLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{
    status: 'idle' | 'loading' | 'success' | 'failed';
    message?: string;
    planName?: string;
    creditsAdded?: number;
    amountPaid?: number;
    paymentId?: string;
  }>({ status: 'idle' });

  const getPlanPurchaseDetails = (planName: string, period: 'monthly' | 'annually', curr: 'INR' | 'USD') => {
    if (planName === 'Pilot') {
      if (period === 'monthly') {
        return {
          amount: curr === 'INR' ? 1950 : 22,
          credits: 130,
          description: 'Writopedia Pilot Subscription - Monthly'
        };
      } else {
        return {
          amount: curr === 'INR' ? 21060 : 237.6,
          credits: 130 * 12,
          description: 'Writopedia Pilot Subscription - Annual'
        };
      }
    } else if (planName === 'Plus') {
      if (period === 'monthly') {
        return {
          amount: curr === 'INR' ? 10000 : 106,
          credits: 800,
          description: 'Writopedia Plus Subscription - Monthly'
        };
      } else {
        return {
          amount: curr === 'INR' ? 108000 : 1144.8,
          credits: 800 * 12,
          description: 'Writopedia Plus Subscription - Annual'
        };
      }
    } else if (planName === 'Pro') {
      if (period === 'monthly') {
        return {
          amount: curr === 'INR' ? 25000 : 265,
          credits: 2500,
          description: 'Writopedia Pro Subscription - Monthly'
        };
      } else {
        return {
          amount: curr === 'INR' ? 270000 : 2862,
          credits: 2500 * 12,
          description: 'Writopedia Pro Subscription - Annual'
        };
      }
    }
    return null;
  };

  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (planName: string, activeBillingPeriod: 'monthly' | 'annually', activeCurrency: 'INR' | 'USD') => {
    const details = getPlanPurchaseDetails(planName, activeBillingPeriod, activeCurrency);
    if (!details) return;

    setIsScriptLoading(true);
    setPaymentStatus({ status: 'loading', message: "Connecting to Razorpay Secure Gateway...", planName });

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setIsScriptLoading(false);
      setPaymentStatus({
        status: 'failed',
        message: 'Could not load Razorpay Script library. This may be due to adblockers, privacy shield, or restriction settings.'
      });
      return;
    }

    const amountInSubunits = Math.round(details.amount * 100);
    const creditsToApply = details.credits;

    const isYearly = activeBillingPeriod === 'annually';
    const planId =
      planName === 'Pro'
        ? isYearly ? 'plan-pro-yearly' : 'plan-pro-monthly'
        : planName === 'Plus'
        ? isYearly ? 'plan-plus-yearly' : 'plan-plus-monthly'
        : isYearly ? 'plan-pilot-yearly' : 'plan-pilot-monthly';

    let orderData: { id: string; amount: number; currency: string; planId: string; keyId?: string; isSimulated?: boolean };
    try {
      orderData = await apiClient.post<{
        id: string;
        amount: number;
        currency: string;
        planId: string;
        keyId?: string;
        isSimulated?: boolean;
      }>('/api/payment/razorpay-order', {
        planId: planId as PlanId,
        currency: activeCurrency
      });
    } catch (err: any) {
      console.error("Backend order creation failed:", err);
      setIsScriptLoading(false);
      setPaymentStatus({
        status: 'failed',
        message: err.message || 'Failed to initialize subscription checkout with server. Please try again.',
        planName
      });
      return;
    }

    const rzpKeyId = orderData.keyId || ((import.meta as any).env.VITE_RAZORPAY_KEY_ID as string) || '';

    const options: any = {
      key: rzpKeyId,
      amount: orderData.amount,
      currency: orderData.currency || activeCurrency,
      name: "Writopedia",
      description: details.description,
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=120",
      handler: async function (response: any) {
        setIsScriptLoading(false);
        setPaymentStatus({ status: 'loading', message: "Authenticating payment transaction securely...", planName });
        
        try {
          const verifyData = await apiClient.post<{
            verified: boolean;
            paymentId: string;
            creditsGranted: number;
            newBalance?: number;
            alreadyFulfilled?: boolean;
            message?: string;
          }>('/api/payment/razorpay-verify', {
            razorpay_order_id: response.razorpay_order_id || orderData.id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            planId
          });

          const granted = verifyData.creditsGranted || creditsToApply;

          setPaymentStatus({
            status: 'success',
            paymentId: response.razorpay_payment_id,
            planName: planName,
            creditsAdded: granted,
            amountPaid: details.amount
          });

          // Refresh live balance from server truth
          try {
            const balRes = await apiClient.get<{ balance: number }>('/api/payment/balance');
            if (balRes && typeof balRes.balance === 'number' && setCredits) {
              setCredits(balRes.balance);
            } else if (setCredits) {
              setCredits(prev => prev + granted);
            }
          } catch {
            if (setCredits) {
              setCredits(prev => prev + granted);
            }
          }
        } catch (verifyErr: any) {
          console.error("Cryptographic signature authorization failed:", verifyErr);
          setPaymentStatus({
            status: 'failed',
            message: verifyErr.message || 'Razorpay transaction verification failed. Payment signature rejected by server.',
            planName
          });
        }
      },
      prefill: {
        name: user?.displayName || "Creative User",
        email: user?.email || "customer@writopedia.com",
        contact: "9999999999"
      },
      notes: {
        platform: "Writopedia Production App",
        purchassetype: "Subscription Plan",
        plan: planName,
        billingPeriod: activeBillingPeriod,
        targetCredits: String(creditsToApply)
      },
      theme: {
        color: "#DC2626"
      },
      modal: {
        ondismiss: function () {
          setPaymentStatus(prev => prev.status === 'success' ? prev : { status: 'idle' });
        }
      }
    };

    if (orderData && !orderData.isSimulated && orderData.id) {
      options.order_id = orderData.id;
    }

    setIsScriptLoading(false);
    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        console.error("Razorpay payment.failed event:", resp?.error);
        setPaymentStatus({
          status: 'failed',
          message: resp?.error?.description || resp?.error?.reason || "Payment was declined or cancelled at the gateway.",
          planName
        });
      });
      rzp.open();
    } catch (err: any) {
      console.error("RazorPay initialization error:", err);
      setPaymentStatus({
        status: 'failed',
        message: `Payment window initialization was blocked or failed. (${err?.message || err}).`
      });
    }
  };

  // Check for pending pricing plan on mount / login
  useEffect(() => {
    if (user) {
      const pendingStr = localStorage.getItem('pending_pricing_plan');
      if (pendingStr) {
        try {
          const pending = JSON.parse(pendingStr);
          if (pending && pending.name) {
            if (pending.billingPeriod) setBillingPeriod(pending.billingPeriod);
            if (pending.currency) {
              setCurrency(pending.currency);
              setCurrencySource('manual');
            }
            localStorage.removeItem('pending_pricing_plan');
            handleCheckout(pending.name, pending.billingPeriod || billingPeriod, pending.currency || currency);
          }
        } catch (e) {
          console.error("Error parsed pending plan:", e);
          localStorage.removeItem('pending_pricing_plan');
        }
      }
    }
  }, [user]);

  // Auto detect location logic on mount
  useEffect(() => {
    // 1. First-pass heuristic using local Timezone:
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && (tz.includes('Kolkata') || tz.includes('Calcutta') || tz.includes('Delhi') || tz.includes('Asia/Kolkata'))) {
        setCurrency('INR');
        setCurrencySource('timezone');
      }
    } catch (e) {
      console.warn("TZ heuristic failed:", e);
    }

    // 2. Exact match check with active network endpoints:
    fetch('https://ipapi.co/json/')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('ipapi failed');
      })
      .then(data => {
        if (data && data.country_code) {
          if (data.country_code === 'IN') {
            setCurrency('INR');
            setCurrencySource('ipapi');
          } else {
            setCurrency('USD');
            setCurrencySource('ipapi');
          }
        }
      })
      .catch(() => {
        // Fallback endpoint
        fetch('https://ip-api.com/json')
          .then(res => {
            if (res.ok) return res.json();
            throw new Error('ip-api failed');
          })
          .then(data => {
            if (data && data.countryCode) {
              if (data.countryCode === 'IN') {
                setCurrency('INR');
                setCurrencySource('ip-api');
              } else {
                setCurrency('USD');
                setCurrencySource('ip-api');
              }
            }
          })
          .catch(() => {
            console.log("Using timezone check fallback for currency.");
          });
      });
  }, []);

  const pricingModels = [
    {
      name: 'Pilot',
      monthlyPriceInr: '₹1,950',
      monthlyPriceUsd: '$22',
      annualPriceInr: '₹1,755',
      annualPriceUsd: '$19.8',
      credits: '130 Credits',
      costPerCreditInr: '₹15 per Credit',
      costPerCreditUsd: '$0.11 per Credit', // $15 / 130 = ~ $0.11
      equivalence: 'equal to 65 fast image generations or 13 fast videos',
      badge: 'STARTER TIER',
      bgType: 'slate',
      popular: false,
      features: [
        { label: 'Storage', value: '1 GB Storage' },
        { label: 'Asset Retention', value: '1 Month Asset Retention' },
        { label: 'Seats limit', value: '1 User' }
      ]
    },
    {
      name: 'Plus',
      monthlyPriceInr: '₹10,000',
      monthlyPriceUsd: '$106',
      annualPriceInr: '₹9,000',
      annualPriceUsd: '$95.4',
      credits: '800 Credits',
      costPerCreditInr: '₹12.5 per Credit',
      costPerCreditUsd: '$0.12 per Credit', // $106 / 800 = ~ $0.13
      equivalence: 'equal to 400 fast image generations or 80 fast videos',
      badge: 'GROWTH MODE',
      bgType: 'indigo',
      popular: false,
      features: [
        { label: 'Storage', value: '5 GB Storage' },
        { label: 'Asset Retention', value: '3 Months Asset Retention' },
        { label: 'Seats limit', value: '3 Users' }
      ]
    },
    {
      name: 'Pro',
      monthlyPriceInr: '₹25,000',
      monthlyPriceUsd: '$265',
      annualPriceInr: '₹22,500',
      annualPriceUsd: '$238.5',
      credits: '2,500 Credits',
      costPerCreditInr: '₹10 per Credit',
      costPerCreditUsd: '$0.10 per Credit', // $265 / 2500 = ~ $0.10
      equivalence: 'equal to 1250 fast image generations or 250 fast videos',
      badge: 'BEST VALUE',
      bgType: 'rose',
      popular: true,
      features: [
        { label: 'Storage', value: '100 GB Storage' },
        { label: 'Asset Retention', value: '6 Months Asset Retention' },
        { label: 'Seats limit', value: '5 Users' },
        { label: 'Management', value: 'Dedicated Account Manager' }
      ]
    },
    {
      name: 'Enterprise',
      monthlyPriceInr: 'Get in Touch for Quote',
      monthlyPriceUsd: 'Get in Touch for Quote',
      annualPriceInr: 'Get in Touch for Quote',
      annualPriceUsd: 'Get in Touch for Quote',
      credits: 'Unlimited Credits',
      costPerCreditInr: 'Customized as per Brand Requirements',
      costPerCreditUsd: 'Customized as per Brand Requirements',
      equivalence: 'Unlimited Generations',
      badge: 'INFINITE SCALE',
      bgType: 'gold',
      popular: false,
      features: [
        { label: 'Storage', value: 'Unlimited Storage' },
        { label: 'Asset Retention', value: 'Unlimited Asset Retention' },
        { label: 'Seats limit', value: 'Unlimited Users' },
        { label: 'Management', value: 'Dedicated Account Manager' },
        { label: 'Premium Support', value: 'Live Support' },
        { label: 'Training', value: 'Extensive Brand Training' },
        { label: 'Syllabus', value: 'Training for your Team' }
      ]
    }
  ];

  const planDetails = [
    { output: 'Fast Image (Nano Banana)', credits: '2' },
    { output: 'Standard Image (Nano Banana 2)', credits: '3' },
    { output: 'Pro Image (Nano Banana Pro)', credits: '4' },
    { output: 'Plus Image (GPT Image 2)', credits: '5' },
    { output: 'Fast Video (Veo Lite)', credits: '10' },
    { output: 'Standard Video (Veo Fast)', credits: '20' },
    { output: 'Pro Video (Veo Standard)', credits: '40' },
    { output: 'Plus Video (Kling 3.0)', credits: '40' },
    { output: 'Cinematic Video (Seedance 2.0)', credits: '80' },
    { output: 'Corporate PPT (Gemini Pro)', credits: '10' },
    { output: 'Voiceover (Lyra)', credits: '2' },
    { output: 'Campaign Strategy (Gemini Pro)', credits: '5' }
  ];

  const handleAction = (planName: string) => {
    if (planName === 'Enterprise') {
      // Direct them to contact sales
      window.location.href = "mailto:business@writopedia.com?subject=Enterprise%20Quote%20Request";
    } else {
      if (user) {
        handleCheckout(planName, billingPeriod, currency);
      } else {
        localStorage.setItem('pending_pricing_plan', JSON.stringify({
          name: planName,
          billingPeriod,
          currency
        }));
        onLogin();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafc] text-slate-800 font-sans relative overflow-x-hidden selection:bg-crimson/10 selection:text-crimson">
      {/* Subtle Dot Matrix Background Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-size-[16px_16px] opacity-70 pointer-events-none" />


      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <div onClick={() => navigateTo('/')} className="cursor-pointer">
            <WritopediaLogo className="h-14 sm:h-16" />
          </div>

          {/* Nav Center */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button 
              onClick={onOpenWorkspace}
              className="hover:text-crimson transition-colors cursor-pointer text-left"
            >
              Platform
            </button>
            <button 
              onClick={() => navigateTo('/pricing')}
              className="text-crimson font-semibold transition-colors cursor-pointer text-left"
            >
              Pricing
            </button>
            <a 
              href="https://writopedia.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-crimson transition-colors cursor-pointer text-left"
            >
              Website
            </a>
            <button 
              onClick={() => navigateTo('/')}
              className="hover:text-crimson transition-colors cursor-pointer text-left"
            >
              Contact
            </button>
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-4">
            {user ? (
              <button 
                onClick={() => navigateTo('/workspace')}
                className="bg-crimson hover:bg-crimson/90 text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
              >
                Go to Workspace
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-20 relative z-10 space-y-16">
        
        {/* Page Title & Subtitle */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15]">
            Pricing & Subscription <span className="text-crimson">Models</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 font-light leading-relaxed">
            Transparent, credit-based billing designed to adapt perfectly to your production volume.
          </p>
        </div>

        {/* Currency & Billing Toggle Container */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl shadow-sm max-w-xl mx-auto">
          {/* Billing Period Toggle */}
          <div className="flex flex-col items-center gap-1.5 flex-1 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing Period</span>
            <div className="relative p-1 bg-slate-50 border border-slate-200 rounded-lg flex items-center w-full justify-between">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`flex-1 text-center py-2 px-4 text-xs font-semibold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                  billingPeriod === 'monthly' 
                    ? 'text-slate-900 font-bold bg-white shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annually')}
                className={`flex-1 text-center py-2 px-4 text-xs font-semibold uppercase tracking-wider rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  billingPeriod === 'annually' 
                    ? 'text-rose-600 font-bold bg-white shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-rose-600'
                }`}
              >
                <span>Annually</span>
                <span className="text-[9px] bg-rose-50 text-rose-600 font-black px-1.5 py-0.5 rounded-full uppercase leading-none shrink-0">
                  -10%
                </span>
              </button>
            </div>
          </div>

          {/* Active Currency Toggle */}
          <div className="flex flex-col items-center gap-1.5 flex-1 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Currency</span>
            <div className="relative p-1 bg-slate-50 border border-slate-200 rounded-lg flex items-center w-full justify-between">
              <button
                onClick={() => { setCurrency('INR'); setCurrencySource('manual'); }}
                className={`flex-1 text-center py-2 px-4 text-xs font-semibold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                  currency === 'INR' 
                    ? 'text-slate-900 font-bold bg-white shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                INR (₹)
              </button>
              <button
                onClick={() => { setCurrency('USD'); setCurrencySource('manual'); }}
                className={`flex-1 text-center py-2 px-4 text-xs font-semibold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                  currency === 'USD' 
                    ? 'text-slate-900 font-bold bg-white shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                USD ($)
              </button>
            </div>
          </div>
        </div>

        {currencySource !== 'default' && (
          <p className="text-[10px] text-zinc-400 text-center font-mono tracking-wide uppercase flex items-center justify-center gap-1">
            <Globe size={12} className="text-slate-400 shrink-0" />
            <span>Auto-detected currency locale: <strong className="text-rose-600">{currency === 'INR' ? 'India (INR / ₹)' : 'International (USD / $)'}</strong> based on {currencySource === 'timezone' ? 'system timezone preference' : 'IP Geo Location'}</span>
          </p>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {pricingModels.map((plan, index) => {
            const isHovered = hoveredCard === index;
            const isPro = plan.name === 'Pro';

            // Prices calculation
            const rawMonthly = currency === 'INR' ? plan.monthlyPriceInr : plan.monthlyPriceUsd;
            const rawAnnual = currency === 'INR' ? plan.annualPriceInr : plan.annualPriceUsd;
            
            const activePrice = plan.name === 'Enterprise' 
              ? 'Get in Touch for Quote' 
              : (billingPeriod === 'monthly' ? rawMonthly : rawAnnual);

            const activePriceSub = plan.name === 'Enterprise' 
              ? '' 
              : `equivalent to ${currency === 'INR' ? plan.monthlyPriceUsd : plan.monthlyPriceInr} / month`;

            const costPerCredit = currency === 'INR' ? plan.costPerCreditInr : plan.costPerCreditUsd;

            // Calculating actual simulated annual total billing if annually selected
            const numericRate = plan.name === 'Enterprise' ? 0 : parseInt(activePrice.replace(/[^0-9.]/g, ''));
            const finalCredits = plan.name === 'Enterprise' ? 'Unlimited' : (billingPeriod === 'monthly' ? plan.credits : (parseInt(plan.credits.replace(/[^0-9]/g, '')) * 12).toLocaleString() + ' Credits');

            return (
              <div
                key={plan.name}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`bg-white border rounded-3xl transition-all duration-300 relative flex flex-col justify-between overflow-hidden min-h-137.5 ${
                  isPro 
                    ? 'border-crimson shadow-md ring-4 ring-rose-500/10' 
                    : isHovered 
                      ? 'border-slate-350 shadow-md' 
                      : 'border-slate-200/80 shadow-sm'
                }`}
              >
                {/* Popular Corner Star Ribbon */}
                {isPro && (
                  <div className="absolute right-0 top-0 h-20 w-20 overflow-hidden">
                    <div className="absolute top-5 -right-6 rotate-45 bg-crimson text-white text-[9px] font-black uppercase text-center w-28 py-1.5 tracking-widest shadow-sm">
                      POPULAR
                    </div>
                  </div>
                )}


                <div className="p-7 space-y-6 flex-1">
                  {/* Top Badge */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md ${
                        isPro 
                          ? 'bg-rose-50 text-crimson font-black' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {plan.badge}
                      </span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{plan.name}</h3>
                  </div>

                  {/* Price Block */}
                  <div className="border-b border-dashed border-slate-100 pb-5 space-y-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900 font-sans">{activePrice}</span>
                      {plan.name !== 'Enterprise' && (
                        <span className="text-slate-400 text-sm font-light">/ month</span>
                      )}
                    </div>
                    {plan.name !== 'Enterprise' && (
                      <div className="text-[11px] text-slate-400">
                        {activePriceSub}
                      </div>
                    )}
                    {billingPeriod === 'annually' && plan.name !== 'Enterprise' && (
                      <div className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded inline-block mt-1">
                        Billed Annually: {currency === 'INR' ? '₹' : '$'}{(numericRate * 12).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Credits Detail Block */}
                  <div className="space-y-4 py-1">
                    {/* Credits Number */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 bg-rose-500/10 text-crimson rounded-lg h-6 w-6 flex items-center justify-center text-xs font-extrabold shrink-0 font-mono">
                        C
                      </div>
                      <div className="text-xs">
                        <strong className="text-slate-900 block font-bold text-sm">
                          {finalCredits}
                        </strong>
                        <span className="text-slate-400 font-light text-[11px] block mt-0.5">
                          {costPerCredit}
                        </span>
                      </div>
                    </div>

                    {/* Equivalency text */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 bg-slate-100 text-slate-500 rounded-lg h-6 w-6 flex items-center justify-center text-xs font-extrabold shrink-0 font-mono">
                        E
                      </div>
                      <div className="text-xs text-slate-500 font-light leading-relaxed">
                        {plan.equivalence}
                      </div>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="pt-4 border-t border-slate-50 space-y-3">
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs">
                        <Check size={14} className="text-emerald-500 shrink-0" />
                        <span className="text-slate-600 font-medium">{feat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card CTA Footer Button */}
                <div className="p-7 bg-slate-50/50 border-t border-slate-100 shrink-0">
                  <button 
                    onClick={() => handleAction(plan.name)}
                    disabled={isScriptLoading || (paymentStatus.status === 'loading' && paymentStatus.planName === plan.name)}
                    className={`w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      isPro 
                        ? 'bg-crimson hover:bg-crimson/95 text-white shadow-md shadow-crimson/10 hover:shadow-lg' 
                        : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-sm'
                    }`}
                  >
                    {isScriptLoading || (paymentStatus.status === 'loading' && paymentStatus.planName === plan.name) ? (
                      <span className="flex items-center gap-1.5 justify-center">
                        <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Connecting...</span>
                      </span>
                    ) : (
                      <>
                        <span>{plan.name === 'Enterprise' ? 'Contact Sales' : 'Activate'}</span>
                        {plan.name === 'Enterprise' && <ArrowRight size={13} />}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Comparison Table */}
        <div className="space-y-6 pt-10">
          <div className="space-y-1.5 text-center md:text-left">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center justify-center md:justify-start gap-2">
              <Building size={20} className="text-crimson" /> Subscription Comparison Table
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-light">
              Direct matrix representation corresponding perfectly to official enterprise tier structure.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-200">
                <thead className="bg-slate-50/70 text-slate-700 uppercase tracking-widest font-bold border-b border-slate-250/60">
                  <tr>
                    <th className="px-6 py-5">Parameters / Tiers</th>
                    <th className="px-6 py-5 text-center">Pilot</th>
                    <th className="px-6 py-5 text-center">Plus</th>
                    <th className="px-6 py-5 text-center bg-rose-50/10 text-crimson font-black">Pro (Popular)</th>
                    <th className="px-6 py-5 text-center">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="px-6 py-4 font-semibold text-slate-900 bg-slate-50/20">Monthly Cost</td>
                    <td className="px-6 py-4 text-center font-medium">₹1,950 or $22</td>
                    <td className="px-6 py-4 text-center font-medium">₹10,000 or $106</td>
                    <td className="px-6 py-4 text-center bg-rose-50/10 text-rose-950 font-semibold italic">₹25,000 or $265</td>
                    <td className="px-6 py-4 text-center font-medium">Contact for Quote</td>
                  </tr>

                  <tr>
                    <td className="px-6 py-4 font-semibold text-slate-900 bg-slate-50/20">Annual Price (Equivalent Mo.)</td>
                    <td className="px-6 py-4 text-center">₹1,755 / mo ($19.8)</td>
                    <td className="px-6 py-4 text-center">₹9,000 / mo ($95.4)</td>
                    <td className="px-6 py-4 text-center bg-rose-50/10 text-rose-950 font-semibold italic">₹22,500 / mo ($238.5)</td>
                    <td className="px-6 py-4 text-center">Contact Option</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-slate-900 bg-slate-50/20">Included Credits</td>
                    <td className="px-6 py-4 text-center font-mono font-bold">130 Credits</td>
                    <td className="px-6 py-4 text-center font-mono font-bold">800 Credits</td>
                    <td className="px-6 py-4 text-center bg-rose-50/10 font-mono font-black text-rose-600">2500 Credits</td>
                    <td className="px-6 py-4 text-center font-mono font-bold">Unlimited Credits</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-slate-900 bg-slate-50/20">Credit Cost Base</td>
                    <td className="px-6 py-4 text-center">{currency === 'INR' ? '₹15 / credit' : '$0.17 / credit'}</td>
                    <td className="px-6 py-4 text-center text-indigo-600 font-bold">{currency === 'INR' ? '₹12.5 / credit' : '$0.13 / credit'}</td>
                    <td className="px-6 py-4 text-center bg-rose-50/10 text-rose-600 font-bold">{currency === 'INR' ? '₹10 / credit' : '$0.11 / credit'}</td>
                    <td className="px-6 py-4 text-center">Customized</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-slate-900 bg-slate-50/20">Outputs Capacity</td>
                    <td className="px-6 py-4 text-center text-[11px] leading-relaxed">65 fast images OR 13 films</td>
                    <td className="px-6 py-4 text-center text-[11px] leading-relaxed">400 fast images OR 80 films</td>
                    <td className="px-6 py-4 text-center bg-rose-50/10 text-[11px] leading-relaxed text-slate-800">1250 fast images OR 250 films</td>
                    <td className="px-6 py-4 text-center">Unlimited Generations</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-slate-900 bg-slate-50/20">Cloud Storage Size</td>
                    <td className="px-6 py-4 text-center">1 GB Storage</td>
                    <td className="px-6 py-4 text-center">5 GB Storage</td>
                    <td className="px-6 py-4 text-center bg-rose-50/10">100 GB Storage</td>
                    <td className="px-6 py-4 text-center font-semibold">Unlimited Storage</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-slate-900 bg-slate-50/20">Asset Retention</td>
                    <td className="px-6 py-4 text-center">1 Month</td>
                    <td className="px-6 py-4 text-center">3 Months</td>
                    <td className="px-6 py-4 text-center bg-rose-50/10 font-semibold">6 Months</td>
                    <td className="px-6 py-4 text-center font-semibold">Unlimited (Durable)</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-slate-900 bg-slate-50/20">Team Capacity</td>
                    <td className="px-6 py-4 text-center">1 User seat</td>
                    <td className="px-6 py-4 text-center">3 User seats</td>
                    <td className="px-6 py-4 text-center bg-rose-50/10 font-semibold">5 User seats</td>
                    <td className="px-6 py-4 text-center font-semibold text-amber-600">Unlimited Seats</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-slate-900 bg-slate-50/20">Dedicated Account Manager</td>
                    <td className="px-6 py-4 text-center">―</td>
                    <td className="px-6 py-4 text-center">―</td>
                    <td className="px-6 py-4 text-center bg-rose-50/10 text-emerald-500 font-bold">
                      <span className="inline-flex items-center gap-1"><Check size={14} /> Yes</span>
                    </td>
                    <td className="px-6 py-4 text-center text-emerald-500 font-bold">
                      <span className="inline-flex items-center gap-1"><Check size={14} /> Yes</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-slate-900 bg-slate-50/20">Extended Team Training & Live Support</td>
                    <td className="px-6 py-4 text-center">―</td>
                    <td className="px-6 py-4 text-center">―</td>
                    <td className="px-6 py-4 text-center bg-rose-50/10">―</td>
                    <td className="px-6 py-4 text-center text-emerald-500 font-bold">
                      <span className="inline-flex items-center gap-1"><Check size={14} /> Unlimited VIP Support</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Usage Unit Reference Details from original */}
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-amber-500 shrink-0" />
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-700">Creative Credits Consumption Rates Guide</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {planDetails.map((item, idx) => (
              <div key={idx} className="bg-white p-4 border border-slate-150 rounded-xl space-y-1 shadow-sm">
                <span className="font-semibold text-slate-900 text-xs block truncate" title={item.output}>
                  {item.output}
                </span>
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span>Usage Rate:</span>
                  <span className="font-mono font-bold text-rose-500">{item.credits} Credits</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Support Highlight Callout Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-rose-50/40 border border-rose-100 rounded-3xl p-10 text-center space-y-6 shadow-sm"
        >
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-900 font-sans">Need a customized workspace?</h3>
            <p className="text-slate-600 font-light max-w-lg mx-auto leading-relaxed">
              Our business operations lead is available to construct specialized credits quota or SLA agreements.
            </p>
          </div>
          
          <a 
            href="mailto:business@writopedia.com?subject=Enterprise%20Quote%2520Request"
            className="inline-flex items-center gap-2 bg-crimson hover:bg-crimson/95 text-white font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-full shadow-lg shadow-crimson/10 hover:shadow-xl hover:shadow-crimson/20 transition-all duration-200 cursor-pointer"
          >
            Contact business@writopedia.com
          </a>
        </motion.div>

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
            <button onClick={() => navigateTo('/legal')} className="hover:text-crimson transition-colors font-medium cursor-pointer">Privacy Policy</button>
            <button onClick={() => navigateTo('/legal')} className="hover:text-crimson transition-colors font-medium cursor-pointer">Refund Policy</button>
            <button onClick={() => navigateTo('/legal')} className="hover:text-crimson transition-colors font-medium cursor-pointer">Terms of Service</button>
            <a href="mailto:business@writopedia.com" className="hover:text-crimson transition-colors font-medium cursor-pointer">Contact</a>
          </div>
        </div>
      </footer>

      {/* Payment Status Modal */}
      <AnimatePresence>
        {paymentStatus.status !== 'idle' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-6 text-center"
            >
              {paymentStatus.status === 'loading' && (
                <div className="space-y-4 py-4">
                  <div className="relative h-16 w-16 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-crimson border-t-transparent animate-spin"></div>
                    <CreditCard size={24} className="text-crimson animate-pulse" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-slate-900">Processing Subscription</h3>
                    <p className="text-xs text-slate-500 font-light leading-relaxed px-4">
                      {paymentStatus.message || "Initializing secure transactional checkout..."}
                    </p>
                  </div>
                </div>
              )}

              {paymentStatus.status === 'success' && (
                <div className="space-y-5">
                  <div className="h-16 w-16 mx-auto bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-inner">
                    <Sparkles size={28} className="animate-bounce" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-slate-900 leading-tight">Subscription Activated!</h3>
                    <p className="text-xs text-slate-500 font-light leading-relaxed">
                      Your premium <strong>{paymentStatus.planName}</strong> membership is now active. We have credited your account balance.
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Selected Plan:</span>
                      <span className="font-bold text-slate-900">{paymentStatus.planName} Tier</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Credits Credited:</span>
                      <span className="font-mono font-bold text-emerald-600 flex items-center gap-1">
                        <Coins size={12} />
                        +{paymentStatus.creditsAdded?.toLocaleString()} Credits
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Amount Charged:</span>
                      <span className="font-bold text-slate-900">
                        {currency === 'INR' ? '₹' : '$'}{paymentStatus.amountPaid?.toLocaleString()}
                      </span>
                    </div>
                    {paymentStatus.paymentId && (
                      <div className="flex justify-between items-center text-[10px] border-t border-slate-200/50 pt-2 mt-1">
                        <span className="text-slate-400 font-mono">TXID:</span>
                        <span className="font-mono text-slate-500 select-all font-semibold uppercase">{paymentStatus.paymentId}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setPaymentStatus({ status: 'idle' });
                        if (!brandSetupComplete) {
                          navigateTo('/brand-init');
                        } else {
                          navigateTo('/workspace');
                        }
                      }}
                      className="w-full bg-crimson hover:bg-crimson/95 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-md hover:shadow-lg"
                    >
                      Go to Workspace
                    </button>
                    <button
                      onClick={() => setPaymentStatus({ status: 'idle' })}
                      className="w-full text-slate-500 hover:text-slate-700 py-1.5 text-xs font-medium cursor-pointer"
                    >
                      Dismiss View
                    </button>
                  </div>
                </div>
              )}

              {paymentStatus.status === 'failed' && (
                <div className="space-y-5">
                  <div className="h-16 w-16 mx-auto bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
                    <Info size={28} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900">Checkout Unsuccessful</h3>
                    <p className="text-xs text-slate-500 font-light leading-relaxed px-4">
                      {paymentStatus.message || "An unexpected issue was reported by Razorpay checkout gateway. Please verify your funding sources and retry."}
                    </p>
                  </div>

                  <div className="pt-4 flex flex-col gap-2">
                    <button
                      onClick={() => setPaymentStatus({ status: 'idle' })}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Acknowledge & Retry
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
