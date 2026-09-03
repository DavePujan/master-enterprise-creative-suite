/**
 * Canonical Server-Authoritative Pricing & Billing Catalog.
 * The server is the exclusive authority on pricing, currencies, amounts, and credits granted.
 */

export type PlanId =
  | 'booster-starter'
  | 'booster-power'
  | 'booster-super'
  | 'plan-pilot-monthly'
  | 'plan-pilot-yearly'
  | 'plan-plus-monthly'
  | 'plan-plus-yearly'
  | 'plan-pro-monthly'
  | 'plan-pro-yearly'
  | 'plan-studio-monthly'
  | 'plan-studio-yearly';

export interface PlanPricing {
  id: PlanId;
  name: string;
  type: 'topup' | 'subscription';
  credits: number;
  inrSubunits: number; // in paise
  usdSubunits: number; // in cents
}

export const PLAN_PRICING_CATALOG: Record<PlanId, PlanPricing> = {
  'booster-starter': {
    id: 'booster-starter',
    name: 'Starter Booster',
    type: 'topup',
    credits: 100,
    inrSubunits: 150000, // ₹1,500
    usdSubunits: 1700    // $17
  },
  'booster-power': {
    id: 'booster-power',
    name: 'Power Booster',
    type: 'topup',
    credits: 500,
    inrSubunits: 625000, // ₹6,250
    usdSubunits: 6600    // $66
  },
  'booster-super': {
    id: 'booster-super',
    name: 'Super Booster',
    type: 'topup',
    credits: 1100,
    inrSubunits: 1100000, // ₹11,000
    usdSubunits: 11500    // $115
  },
  'plan-pilot-monthly': {
    id: 'plan-pilot-monthly',
    name: 'Pilot Tier (Monthly)',
    type: 'subscription',
    credits: 50,
    inrSubunits: 0,
    usdSubunits: 0
  },
  'plan-pilot-yearly': {
    id: 'plan-pilot-yearly',
    name: 'Pilot Tier (Yearly)',
    type: 'subscription',
    credits: 50,
    inrSubunits: 0,
    usdSubunits: 0
  },
  'plan-plus-monthly': {
    id: 'plan-plus-monthly',
    name: 'Plus Tier (Monthly)',
    type: 'subscription',
    credits: 200,
    inrSubunits: 160000, // ₹1,600
    usdSubunits: 1900    // $19
  },
  'plan-plus-yearly': {
    id: 'plan-plus-yearly',
    name: 'Plus Tier (Yearly)',
    type: 'subscription',
    credits: 2400,
    inrSubunits: 1536000, // ₹15,360
    usdSubunits: 18000    // $180
  },
  'plan-pro-monthly': {
    id: 'plan-pro-monthly',
    name: 'Pro Tier (Monthly)',
    type: 'subscription',
    credits: 500,
    inrSubunits: 240000, // ₹2,400
    usdSubunits: 2900    // $29
  },
  'plan-pro-yearly': {
    id: 'plan-pro-yearly',
    name: 'Pro Tier (Yearly)',
    type: 'subscription',
    credits: 6000,
    inrSubunits: 2280000, // ₹22,800
    usdSubunits: 27600    // $276
  },
  'plan-studio-monthly': {
    id: 'plan-studio-monthly',
    name: 'Studio Tier (Monthly)',
    type: 'subscription',
    credits: 1500,
    inrSubunits: 650000, // ₹6,500
    usdSubunits: 7900    // $79
  },
  'plan-studio-yearly': {
    id: 'plan-studio-yearly',
    name: 'Studio Tier (Yearly)',
    type: 'subscription',
    credits: 18000,
    inrSubunits: 6240000, // ₹62,400
    usdSubunits: 75600    // $756
  }
};
