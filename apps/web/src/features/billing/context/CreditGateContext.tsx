import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { InsufficientCreditsErrorPayload } from '@shared-types/billing.js';
import { apiClient, registerInsufficientCreditsHandler } from '@web/infrastructure/api/apiClient.js';

export interface SafeReturnContext {
  sourceGem?: string;
  sourceView?: string;
  serviceName?: string;
  requiredCredits?: number;
  timestamp: number;
}

export interface ReturnedFromTopUpNotice {
  creditsAdded: number;
  newBalance?: number;
  serviceName?: string;
  requiredCredits?: number;
}

export interface CreditGateContextType {
  credits: number;
  isOpen: boolean;
  payload: InsufficientCreditsErrorPayload | null;
  returnContext: SafeReturnContext | null;
  returnedFromTopUpNotice: ReturnedFromTopUpNotice | null;
  openCreditGate: (details: {
    requiredCredits: number;
    availableCredits?: number;
    service: string;
    action?: string;
    model?: string;
    error?: string;
  }) => void;
  closeCreditGate: () => void;
  navigateToTopUp: () => void;
  navigateToUpgrade: () => void;
  returnToGem: () => void;
  dismissTopUpNotice: () => void;
  handleTopUpFulfillment: (creditsAdded: number, newBalance?: number) => void;
}

let globalCreditGateHandler: ((details: any) => void) | null = null;

export function triggerGlobalCreditGate(details: {
  requiredCredits: number;
  availableCredits?: number;
  service: string;
  action?: string;
  model?: string;
  error?: string;
}) {
  if (globalCreditGateHandler) {
    globalCreditGateHandler(details);
  } else {
    console.warn('[CreditGate] Triggered before provider mounted:', details);
  }
}

const CreditGateContext = createContext<CreditGateContextType | null>(null);

interface CreditGateProviderProps {
  children: ReactNode;
  activeGemId?: string;
  currentView: 'tools' | 'assets' | 'plan' | 'admin' | 'curation' | 'topup';
  setView: (view: 'tools' | 'assets' | 'plan' | 'admin' | 'curation' | 'topup') => void;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
}

export const CreditGateProvider: React.FC<CreditGateProviderProps> = ({
  children,
  activeGemId,
  currentView,
  setView,
  credits,
  setCredits
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [payload, setPayload] = useState<InsufficientCreditsErrorPayload | null>(null);
  const [returnContext, setReturnContext] = useState<SafeReturnContext | null>(null);
  const [returnedFromTopUpNotice, setReturnedFromTopUpNotice] = useState<ReturnedFromTopUpNotice | null>(null);

  const openCreditGate = useCallback(
    (details: {
      requiredCredits: number;
      availableCredits?: number;
      service: string;
      action?: string;
      model?: string;
      error?: string;
    }) => {
      const available = typeof details.availableCredits === 'number' 
        ? Math.max(0, details.availableCredits) 
        : Math.max(0, credits);
      const missing = Math.max(0, details.requiredCredits - available);

      // Invariant: If user's available credits cover the requirement, NEVER trigger the modal!
      if (details.requiredCredits <= available || missing <= 0) {
        console.warn(`[CreditGate] Suppression: User has sufficient balance (${available} >= ${details.requiredCredits}). Gate will not open.`);
        return;
      }

      const normalized: InsufficientCreditsErrorPayload = {
        error: details.error || `Insufficient credits for ${details.service}.`,
        code: 'INSUFFICIENT_CREDITS',
        requiredCredits: details.requiredCredits,
        availableCredits: available,
        missingCredits: missing,
        currency: 'credits',
        service: details.service,
        action: details.action,
        model: details.model,
        retryable: false
      };

      setPayload(normalized);
      setReturnContext({
        sourceGem: activeGemId,
        sourceView: currentView,
        serviceName: details.service,
        requiredCredits: details.requiredCredits,
        timestamp: Date.now()
      });
      setIsOpen(true);
    },
    [activeGemId, currentView, credits]
  );

  const closeCreditGate = useCallback(() => {
    setIsOpen(false);
  }, []);

  React.useEffect(() => {
    globalCreditGateHandler = openCreditGate;
    registerInsufficientCreditsHandler((details) => {
      openCreditGate(details);
    });
    return () => {
      globalCreditGateHandler = null;
      registerInsufficientCreditsHandler(null);
    };
  }, [openCreditGate]);

  const navigateToTopUp = useCallback(() => {
    setIsOpen(false);
    setView('topup');
  }, [setView]);

  const navigateToUpgrade = useCallback(() => {
    setIsOpen(false);
    setView('plan');
  }, [setView]);

  const returnToGem = useCallback(() => {
    setView('tools');
    setReturnedFromTopUpNotice(null);
  }, [setView]);

  const dismissTopUpNotice = useCallback(() => {
    setReturnedFromTopUpNotice(null);
  }, []);

  const handleTopUpFulfillment = useCallback(
    (creditsAdded: number, newBalance?: number) => {
      if (typeof newBalance === 'number') {
        setCredits(newBalance);
      } else {
        setCredits(prev => prev + creditsAdded);
      }

      // Re-verify authoritative balance from PostgreSQL
      apiClient.get<{ success: boolean; availableBalance: number }>('/api/payment/balance')
        .then(res => {
          if (res?.availableBalance !== undefined) {
            setCredits(res.availableBalance);
          }
        })
        .catch(() => {});

      if (returnContext) {
        setReturnedFromTopUpNotice({
          creditsAdded,
          newBalance: typeof newBalance === 'number' ? newBalance : credits + creditsAdded,
          serviceName: returnContext.serviceName,
          requiredCredits: returnContext.requiredCredits
        });
      }
    },
    [returnContext, credits, setCredits]
  );

  return (
    <CreditGateContext.Provider
      value={{
        credits,
        isOpen,
        payload,
        returnContext,
        returnedFromTopUpNotice,
        openCreditGate,
        closeCreditGate,
        navigateToTopUp,
        navigateToUpgrade,
        returnToGem,
        dismissTopUpNotice,
        handleTopUpFulfillment
      }}
    >
      {children}
    </CreditGateContext.Provider>
  );
};

export const useCreditGate = () => {
  const context = useContext(CreditGateContext);
  if (!context) {
    throw new Error('useCreditGate must be used within a CreditGateProvider');
  }
  return context;
};
