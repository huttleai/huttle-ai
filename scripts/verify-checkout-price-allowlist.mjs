/**
 * Dev check: Checkout only sells current Essentials/Pro monthly + annual prices.
 * Run: node scripts/verify-checkout-price-allowlist.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getPurchasableCheckoutPriceIds,
  isPurchasableCheckoutPriceId,
} from '../api/_utils/stripePlans.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const previous = { ...process.env };

process.env.STRIPE_PRICE_ESSENTIALS_MONTHLY = 'price_ess_m';
process.env.VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY = 'price_ess_m_vite';
process.env.STRIPE_PRICE_ESSENTIALS_ANNUAL = 'price_ess_a';
process.env.VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL = 'price_ess_a';
process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro_m';
process.env.VITE_STRIPE_PRICE_PRO_MONTHLY = 'price_pro_m';
process.env.STRIPE_PRICE_PRO_ANNUAL = 'price_pro_a';
process.env.VITE_STRIPE_PRICE_PRO_ANNUAL = 'price_pro_a';
process.env.STRIPE_PRICE_FOUNDER_ANNUAL = 'price_founder_a';
process.env.VITE_STRIPE_PRICE_FOUNDER_ANNUAL = 'price_founder_a';
process.env.STRIPE_PRICE_BUILDER_ANNUAL = 'price_builder_a';
process.env.VITE_STRIPE_PRICE_BUILDER_ANNUAL = 'price_builder_a';

const allowed = getPurchasableCheckoutPriceIds();

assert(allowed.has('price_ess_m'), 'essentials monthly (server env) is purchasable');
assert(allowed.has('price_ess_m_vite'), 'essentials monthly (vite alias) is purchasable');
assert(allowed.has('price_ess_a'), 'essentials annual is purchasable');
assert(allowed.has('price_pro_m'), 'pro monthly is purchasable');
assert(allowed.has('price_pro_a'), 'pro annual is purchasable');
assert(!allowed.has('price_founder_a'), 'founder annual is not purchasable');
assert(!allowed.has('price_builder_a'), 'builder annual is not purchasable');
assert(!isPurchasableCheckoutPriceId('price_founder_a'), 'founder rejected by helper');
assert(!isPurchasableCheckoutPriceId('price_unknown'), 'unknown price rejected');
assert(!isPurchasableCheckoutPriceId(''), 'empty price rejected');
assert(!isPurchasableCheckoutPriceId(null), 'null price rejected');
assert(isPurchasableCheckoutPriceId('price_pro_a'), 'pro annual accepted by helper');

delete process.env.STRIPE_PRICE_ESSENTIALS_MONTHLY;
delete process.env.VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY;
delete process.env.STRIPE_PRICE_ESSENTIALS_ANNUAL;
delete process.env.VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL;
delete process.env.STRIPE_PRICE_PRO_MONTHLY;
delete process.env.VITE_STRIPE_PRICE_PRO_MONTHLY;
delete process.env.STRIPE_PRICE_PRO_ANNUAL;
delete process.env.VITE_STRIPE_PRICE_PRO_ANNUAL;

assert(getPurchasableCheckoutPriceIds().size === 0, 'empty env produces an empty allowlist');

Object.assign(process.env, previous);

const checkoutHandler = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../api/create-checkout-session.js'),
  'utf8',
);
assert(checkoutHandler.includes("payment_method_collection: 'if_required'"), 'no-card trials use if_required');
assert(checkoutHandler.includes('trial_period_days: 7'), '7-day trial is attached');
assert(!checkoutHandler.includes("payment_method_collection: 'always'"), 'card is not forced');
assert(!checkoutHandler.includes('payment_method_types:'), 'payment_method_types is omitted');
assert(!checkoutHandler.includes('!isAnnualBilling'), 'annual plans are not excluded from trial');
assert(checkoutHandler.includes('isPurchasableCheckoutPriceId'), 'server allowlist is enforced');

console.log('verify-checkout-price-allowlist: ok');
