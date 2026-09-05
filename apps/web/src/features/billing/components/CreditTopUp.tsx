import React, { useState } from 'react';
import { 
  Check, 
  CreditCard, 
  Sparkles, 
  ArrowRight,
  Shield,
  HelpCircle,
  Info,
  Zap,
  Coins,
  Globe
} from 'lucide-react';
import { AppIcon } from '@web/shared/components/icons/AppIconRegistry.js';
import { motion } from 'motion/react';
import { useCreditGate } from '../context/CreditGateContext.js';
import { findRecommendedCreditPack, PLAN_PRICING_CATALOG } from '@shared-types/billing.js';
import { apiClient } from '@web/infrastructure/api/apiClient.js';
import { PaymentStatusModal } from './PaymentStatusModal.js';

interface CreditTopUpProps {
  credits?: number;
  setCredits?: React.Dispatch<React.SetStateAction<number>>;
  user?: any;
  onLogin?: () => void;
}

// Function to load Razorpay script dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const CreditTopUp: React.FC<CreditTopUpProps> = ({ credits = 50, setCredits, user, onLogin }) => {
  const { returnContext, returnToGem, handleTopUpFulfillment } = useCreditGate();
  const [currency, setCurrency] = useState<'INR' | 'USD'>('USD');
  const [currencySource, setCurrencySource] = useState<string>('default'); // 'timezone', 'ipapi', 'ip-api', 'manual'
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const missingGap = returnContext?.requiredCredits ? Math.max(0, returnContext.requiredCredits - credits) : 0;
  const recommendedPack = missingGap > 0 ? findRecommendedCreditPack(missingGap) : null;
  
  // Auto detect location logic on mount (same logic as EnterprisePlan)
  React.useEffect(() => {
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

  // Payment states
  const [isScriptLoading, setIsScriptLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{
    status: 'idle' | 'loading' | 'success' | 'failed';
    message?: string;
    paymentId?: string;
    planName?: string;
    creditsAdded?: number;
    amountPaid?: number;
  }>({ status: 'idle' });

  // Top up models mapping to screenshot requirements exactly
  const topUpModels = [
    {
      name: 'Starter Booster',
      priceInr: '₹1,500',
      priceUsd: '$17',
      credits: '100 Credits',
      costPerCreditInr: '₹15 / credit',
      costPerCreditUsd: '$0.17 / credit',
      equivalence: 'equal to 50 fast image generations or 10 fast videos',
      badge: 'Best Starter',
      bgType: 'slate',
      popular: false,
      rawAmountInr: 1500,
      rawAmountUsd: 17,
      rawCredits: 100
    },
    {
      name: 'Power Booster',
      priceInr: '₹6,250',
      priceUsd: '$66',
      credits: '500 Credits',
      costPerCreditInr: '₹12.5 / credit',
      costPerCreditUsd: '$0.13 / credit',
      equivalence: 'equal to 250 fast image generations or 50 fast videos',
      badge: 'Most Popular',
      bgType: 'indigo',
      popular: true,
      rawAmountInr: 6250,
      rawAmountUsd: 66,
      rawCredits: 500
    },
    {
      name: 'Super Booster',
      priceInr: '₹11,000',
      priceUsd: '$115',
      credits: '1,100 Credits',
      costPerCreditInr: '₹10 / credit',
      costPerCreditUsd: '$0.10 / credit',
      equivalence: 'equal to 550 fast image generations or 110 fast videos',
      badge: 'Maximum Saver',
      bgType: 'rose',
      popular: false,
      rawAmountInr: 11000,
      rawAmountUsd: 115,
      rawCredits: 1100
    }
  ];

  const getBgClass = (type: string, active: boolean) => {
    if (type === 'rose') {
      return active 
        ? 'border-rose-400 dark:border-rose-500 shadow-rose-100 dark:shadow-rose-950/20 shadow-md ring-2 ring-rose-500/20' 
        : 'border-slate-150 dark:border-slate-800';
    }
    if (type === 'indigo') {
      return active 
        ? 'border-indigo-400 dark:border-indigo-500 shadow-indigo-100 dark:shadow-indigo-950/20 shadow-md ring-2 ring-indigo-500/20' 
        : 'border-slate-150 dark:border-slate-800';
    }
    return active 
        ? 'border-slate-400 dark:border-slate-500 shadow-slate-100 dark:shadow-slate-800/10 shadow-md ring-2 ring-slate-500/20' 
        : 'border-slate-150 dark:border-slate-800';
  };

  const getBadgeClass = (type: string) => {
    if (type === 'rose') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
    if (type === 'indigo') return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
  };

  // Reference to last attempted pack for instant retry on failure
  const lastSelectedTopUpRef = React.useRef<typeof topUpModels[0] | null>(null);

  // Launch Razorpay checkout flow
  const handlePurchaseTopUp = async (plan: typeof topUpModels[0]) => {
    lastSelectedTopUpRef.current = plan;
    if (!user) {
      localStorage.setItem('pending_pricing_plan', JSON.stringify({
        name: plan.name,
        type: 'topup',
        credits: plan.credits,
        currency,
        source: 'credit_topup'
      }));
      if (onLogin) {
        onLogin();
      } else {
        window.location.hash = '#/login';
      }
      return;
    }

    setIsScriptLoading(true);
    setPaymentStatus({ status: 'loading', message: "Connecting to Razorpay Secure Gateway..." });

    // Load Razorpay dynamically
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setIsScriptLoading(false);
      setPaymentStatus({
        status: 'failed',
        message: 'Could not load Razorpay Script library. This may be due to adblockers, privacy shield, or restriction settings.'
      });
      return;
    }

    const price = currency === 'INR' ? plan.rawAmountInr : plan.rawAmountUsd;
    const planIdMap: Record<string, string> = {
      'Starter Booster': 'booster-starter',
      'Power Booster': 'booster-power',
      'Super Booster': 'booster-super'
    };
    const planId = planIdMap[plan.name] || 'booster-starter';

    // 1. Call backend to register and retrieve Razorpay Order ID securely
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
        planId,
        currency,
      });
    } catch (err: any) {
      console.error("Backend order creation failed:", err);
      setIsScriptLoading(false);
      setPaymentStatus({
        status: 'failed',
        message: err.message || "Failed to initialize payment gateway order with server. Please try again."
      });
      return;
    }

    const rzpKeyId = orderData.keyId || ((import.meta as any).env.VITE_RAZORPAY_KEY_ID as string) || '';

    const options: any = {
      key: rzpKeyId,
      amount: orderData.amount,
      currency: orderData.currency || currency,
      name: "Writopedia",
      description: `Writopedia Booster Top-up: ${plan.credits}`,
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=120",
      handler: async function (response: any) {
        setIsScriptLoading(false);
        setPaymentStatus({ status: 'loading', message: "Authenticating payment transaction securely..." });
        
        try {
          // 2. Transmit payment tokens to server for cryptographic handshake signature verification
          const verifyData = await apiClient.post<{
            verified: boolean;
            paymentId: string;
            creditsGranted: number;
            newBalance?: number;
            alreadyFulfilled?: boolean;
            message?: string;
          }>('/api/payment/razorpay-verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            planId
          });

          const granted = verifyData.creditsGranted || plan.rawCredits;

          setPaymentStatus({
            status: 'success',
            paymentId: response.razorpay_payment_id,
            planName: plan.name,
            creditsAdded: granted,
            amountPaid: price
          });

          // Refresh balance from server truth
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

          handleTopUpFulfillment(granted, verifyData.newBalance);
        } catch (err: any) {
          console.error("Payment signature verification failed:", err);
          setPaymentStatus({
            status: 'failed',
            message: err.message || "Payment signature verification rejected."
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
        purchassetype: "Credit Top-Up Booster",
        plan: plan.name,
        targetCredits: String(plan.rawCredits)
      },
      theme: {
        color: "#6366F1" // matches indigo-500/600 brand accent
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
          message: resp?.error?.description || resp?.error?.reason || "Payment was declined or cancelled at the gateway."
        });
      });
      rzp.open();
    } catch (err: any) {
      console.error("RazorPay initialization error:", err);
      setPaymentStatus({
        status: 'failed',
        message: `Writopedia Sandbox: Payment window initialization was blocked or failed. (${err?.message || err}). In iframe preview grids, please use simulated triggers or open index in custom tab.`
      });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#fafafa] dark:bg-slate-950">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="text-center space-y-4 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
            <Coins size={12} className="text-indigo-500 animate-bounce" />
            <span>INSTANT CREDIT TOP-UP BOOSTER</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-light text-slate-900 dark:text-white tracking-tight leading-none">
            Inject More <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Creative Credits</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-light">
            Need an instant boost? Add high-velocity credits straight into your live workspace balance. No long-term commitments required.
          </p>

          {/* Controls Container: Currency Selection */}
          <div className="pt-4 flex flex-col items-center justify-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Currency</span>
            <div className="relative p-1 bg-slate-100 dark:bg-slate-900 rounded-sm border border-slate-200/60 dark:border-slate-800 flex items-center gap-1">
              <button
                onClick={() => {
                  setCurrency('INR');
                  setCurrencySource('manual');
                }}
                className={`px-6 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-sm transition-all relative z-10 cursor-pointer flex items-center gap-1 ${
                  currency === 'INR' 
                    ? 'text-slate-900 dark:text-white font-bold bg-white dark:bg-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>INR (₹)</span>
              </button>
              <button
                onClick={() => {
                  setCurrency('USD');
                  setCurrencySource('manual');
                }}
                className={`px-6 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-sm transition-all relative z-10 cursor-pointer flex items-center gap-1 ${
                  currency === 'USD' 
                    ? 'text-slate-900 dark:text-white font-bold bg-white dark:bg-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>USD ($)</span>
              </button>
            </div>

            {currencySource !== 'default' && (
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono tracking-wide uppercase mt-1 flex items-center justify-center gap-1">
                <Globe size={12} className="text-slate-400 shrink-0" />
                <span>Auto-detected locale: <strong className="text-indigo-500 dark:text-indigo-400">{currency === 'INR' ? 'India (INR / ₹)' : 'International (USD / $)'}</strong> based on {currencySource === 'timezone' ? 'system timezone preference' : 'IP Geo Location'}</span>
              </p>
            )}
          </div>
        </div>

        {/* Unified Payment Notification Dialog */}
        <PaymentStatusModal
          status={paymentStatus}
          currency={currency}
          currentBalance={credits}
          onDismiss={() => setPaymentStatus({ status: 'idle' })}
          onRetry={lastSelectedTopUpRef.current ? () => handlePurchaseTopUp(lastSelectedTopUpRef.current!) : undefined}
          onAction={() => {
            setPaymentStatus({ status: 'idle' });
            if (returnContext) {
              returnToGem();
            }
          }}
          actionLabel={returnContext ? `Return to ${returnContext.serviceName || 'Generator'}` : 'Resume Workspace'}
        />

        {/* Page-Aware Context Banner if navigated via Credit Gate */}
        {returnContext && (
          <div className="max-w-4xl mx-auto p-4 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Continue your generation: <span className="text-rose-600 dark:text-rose-400">{returnContext.serviceName}</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Required: <strong>{returnContext.requiredCredits} credits</strong> (balance: {credits} credits).
                  {missingGap > 0 ? ` You need ${missingGap} more credits.` : ' You now have sufficient credits!'}
                  {recommendedPack ? ` Smallest pack: ${recommendedPack.name} (${recommendedPack.credits} credits).` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={returnToGem}
              className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md transition-all shadow-xs shrink-0 cursor-pointer"
            >
              ← Return to Gem
            </button>
          </div>
        )}

        {/* Top-Up Plans Card Matrix Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative max-w-5xl mx-auto">
          {topUpModels.map((plan, index) => {
            const isHovered = hoveredCard === index;
            const price = currency === 'INR' ? plan.priceInr : plan.priceUsd;
            const costPerCredit = currency === 'INR' ? plan.costPerCreditInr : plan.costPerCreditUsd;

            return (
              <div
                key={index}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`bg-white dark:bg-slate-900 border rounded-lg transition-all duration-300 relative flex flex-col justify-between overflow-hidden min-h-120 ${getBgClass(plan.bgType, isHovered || plan.popular)}`}
              >
                {/* Visual Accent Rim */}
                {plan.popular && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500" />
                )}


                {/* Card Main Interior Body */}
                <div className="p-6 md:p-8 space-y-6">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border border-slate-200/50 dark:border-slate-800 ${getBadgeClass(plan.bgType)}`}>
                        {plan.badge}
                      </span>
                      {plan.popular && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest font-mono">
                          <Zap size={10} />
                          <span>SUPERCHARGER</span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-2xl font-light text-slate-900 dark:text-white tracking-tight">{plan.name}</h3>
                  </div>

                  {/* Pricing Banner Panel */}
                  <div className="py-4 border-y border-slate-100 dark:border-slate-800/80 space-y-1">
                    <div className="text-3xl font-bold text-slate-950 dark:text-white tracking-tight font-sans">
                      {price}
                    </div>
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded inline-block mt-1 font-mono uppercase tracking-wide">
                      Instant Delivery
                    </div>
                  </div>

                  {/* Volume Highlights Info Group */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-1 rounded-sm bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                        <Coins size={14} />
                      </div>
                      <div>
                        <strong className="text-slate-900 dark:text-white block font-semibold text-sm">
                          {plan.credits}
                        </strong>
                        <span className="text-slate-400 dark:text-slate-500 font-light text-[11px] block mt-0.5">
                          Rate: {costPerCredit}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      <div className="p-1 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5">
                        <Check size={14} />
                      </div>
                      <span>{plan.equivalence}</span>
                    </div>
                  </div>
                </div>

                {/* Card Button footer Section */}
                <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/50 flex flex-col gap-3">
                  <button
                    onClick={() => handlePurchaseTopUp(plan)}
                    className="w-full py-3 rounded text-xs font-extrabold uppercase tracking-widest transition-all duration-200 transform active:scale-[0.98] shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer bg-rose-600 text-white hover:bg-rose-700 hover:scale-[1.01]"
                  >
                    <span>Activate</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Secure Badges & Frequently Asked Questions Section */}
        <div className="max-w-4xl mx-auto border-t border-slate-200/80 dark:border-slate-800/80 pt-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="space-y-1">
            <span className="flex justify-center md:justify-start text-emerald-500"><AppIcon name="trust-security" size={20} strokeWidth={1.75} /></span>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mt-1">PCI-DSS Compliant</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-light">All pricing transactions are authorized securely via multi-layered tokenised systems, bypassing any raw credit storage.</p>
          </div>
          <div className="space-y-1">
            <span className="flex justify-center md:justify-start text-indigo-500"><Zap size={20} /></span>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mt-1">Instant Accrual</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-light">Credits are dynamically added on checkouts. No delayed batch runs or manual accounting cycles.</p>
          </div>
          <div className="space-y-1">
            <span className="flex justify-center md:justify-start text-indigo-500"><AppIcon name="credit-token" size={20} strokeWidth={1.75} /></span>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mt-1">Non-Expiring Boosters</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-light">Top-up credit balances carry over indefinitely across monthly renewals. Use them only when creativity demands.</p>
          </div>
        </div>

      </div>
    </div>
  );
};
