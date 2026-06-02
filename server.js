const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const { parsePhoneNumberFromString } = require('libphonenumber-js/min');
const path = require('path');
const portfinder = require('portfinder');
const GoogleSheetsService = require('./googleSheets');
const SupabaseLeadStore = require('./supabaseService');
const ScheduleService = require('./scheduleService');

if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (error) {
    console.log('dotenv not installed; using system environment variables');
  }
}

const app = express();
app.disable('x-powered-by');

const PORT = process.env.PORT || 3000;
const CLIENT_APP_DIRECTORY = path.join(__dirname, 'dist');
const CLIENT_APP_INDEX_PATH = path.join(CLIENT_APP_DIRECTORY, 'index.html');
const googleSheets = new GoogleSheetsService();
const supabaseLeadStore = new SupabaseLeadStore();
const scheduleService = new ScheduleService();

const STUDIO_CLASS_OPTIONS = {
  'Supreme Headquarters, Bandra': ['powerCycle', 'Barre 57'],
  'Kwality House, Kemps Corner': ['powerCycle', 'Strength Lab', 'Barre 57']
};

const STUDIO_SCHEDULE_LOCATION_IDS = {
  'Supreme Headquarters, Bandra': ['29821'],
  'Kwality House, Kemps Corner': ['9030']
};

const ALLOWED_TIME_WINDOWS = [
  'Early Morning (6 AM - 9 AM)',
  'Mid-Morning (9 AM - 12 PM)',
  'Afternoon (12 PM - 4 PM)',
  'Evening (4 PM - 8 PM)',
  'Flexible / Needs Recommendation'
];

const TRACKING_FIELDS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_id',
  'utm_term',
  'gclid',
  'fbclid',
  'msclkid',
  'ttclid',
  'gbraid',
  'wbraid',
  'fbp',
  'fbc'
];

const URL_FIELDS = ['landing_page', 'referrer'];
const PARTIAL_FIELDS = ['draft_id', 'phoneCountry', 'session_id', 'status'];
const JSON_BODY_LIMIT = '32kb';
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 8;
const rateLimitStore = new Map();

const DEFAULT_STRIPE_CHECKOUT_CONFIG = {
  amount: 183800,
  currency: 'inr',
  productName: 'Physique 57 trial booking fee',
  productDescription: 'Secure your paid trial and onboarding flow.',
  paymentMethodTypes: ['card'],
  allowPromotionCodes: true,
  billingAddressCollection: 'required',
  phoneNumberCollection: true,
  taxIdCollection: false,
  automaticTax: false,
  invoiceCreation: false,
  submitType: 'pay',
  shippingCountries: [],
  customFields: [],
  customText: {},
  consentCollection: null,
  metadata: {},
  buttonLabel: 'Pay ₹1,838',
  successUrl: '/?payment=success&session_id={CHECKOUT_SESSION_ID}',
  cancelUrl: '/?payment=cancelled'
};

const DEFAULT_MOMENCE_MEMBERSHIP = {
  id: 240932,
  hostId: 13752,
  taxBracketId: 36758,
  type: 'package-events',
  subscriptionType: 'absolute',
  name: 'Newcomers 2 For 1',
  price: 1750,
  currency: 'inr',
  duration: 14,
  durationUnit: 'days',
  activateOnFirstUse: true,
  numberOfEvents: 2,
  isIntroOffer: true,
  isSingleBuy: true,
  priceAfterProration: 1750,
  description: 'Physique 57 Newcomers 2 For 1 package.'
};

const DEFAULT_PAYMENT_STAGE = 'production';
const DEFAULT_PAYMENT_STAGE_CONFIGS = {
  production: {
    label: 'Production',
    description: 'Production mode charges ₹1,838 and triggers the live Momence membership purchase after payment.',
    checkout: {},
    membership: {}
  },
  testing: {
    label: 'Testing',
    description: 'Testing mode charges ₹1 and triggers the Momence test membership purchase after payment.',
    checkout: {
      amount: 100,
      productName: 'Physique 57 trial test payment',
      productDescription: 'Testing checkout flow for the paid trial experience.',
      buttonLabel: 'Pay ₹1'
    },
    membership: {
      id: 675444,
      name: 'Test',
      price: 1,
      priceAfterProration: 1,
      currency: 'inr',
      description: 'Momence test membership purchase used for checkout validation.'
    }
  }
};

app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.use(express.json({ limit: JSON_BODY_LIMIT }));

function setStaticAssetCacheHeaders(res, filePath) {
  const normalizedPath = String(filePath || '').toLowerCase();

  if (normalizedPath.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return;
  }

  if (/\.[a-f0-9]{8}\.(css|js)$/.test(normalizedPath) || normalizedPath.includes('/assets/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return;
  }

  res.setHeader('Cache-Control', 'public, max-age=3600');
}

function sendAppIndex(res) {
  return res.sendFile(CLIENT_APP_INDEX_PATH, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0'
    }
  });
}

app.use('/static-assets', express.static(path.join(__dirname, 'assets'), {
  setHeaders: setStaticAssetCacheHeaders
}));
app.use(express.static(CLIENT_APP_DIRECTORY, {
  index: false,
  setHeaders: setStaticAssetCacheHeaders
}));

// Stripe checkout endpoints (optional - requires STRIPE_SECRET_KEY in environment)
let stripeClient = null;
const stripeSecretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
if (stripeSecretKey) {
  try {
    const Stripe = require('stripe');
    stripeClient = Stripe(stripeSecretKey);
  } catch (err) {
    console.error('Stripe module not available or failed to initialize:', err && err.message);
    stripeClient = null;
  }
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function parseInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(value, fallback = []) {
  if (!value) {
    return fallback;
  }

  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseJson(value, fallback) {
  if (!value || !String(value).trim()) {
    return fallback;
  }

  try {
    return JSON.parse(String(value));
  } catch (error) {
    console.error('Invalid JSON configuration detected:', error.message);
    return fallback;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(baseValue, overrideValue) {
  if (Array.isArray(baseValue) || Array.isArray(overrideValue)) {
    return Array.isArray(overrideValue) ? [...overrideValue] : [...(baseValue || [])];
  }

  if (!isPlainObject(baseValue) || !isPlainObject(overrideValue)) {
    return overrideValue === undefined ? baseValue : overrideValue;
  }

  const merged = { ...baseValue };
  Object.keys(overrideValue).forEach((key) => {
    merged[key] = deepMerge(baseValue[key], overrideValue[key]);
  });
  return merged;
}

function stripUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(stripUndefined).filter((entry) => entry !== undefined);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const result = {};
  Object.entries(value).forEach(([key, entry]) => {
    const cleaned = stripUndefined(entry);
    if (cleaned !== undefined) {
      result[key] = cleaned;
    }
  });

  return result;
}

function getRequestOrigin(req) {
  const configuredOrigin = String(process.env.FORM_API_BASE_URL || '').trim();
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, '');
  }

  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('x-forwarded-host') || req.get('host') || `localhost:${PORT}`;
  return `${protocol}://${host}`.replace(/\/$/, '');
}

function resolveUrl(value, origin, fallbackPath) {
  const target = String(value || fallbackPath || '').trim();
  if (!target) {
    return origin;
  }

  try {
    return new URL(target, `${origin}/`).toString();
  } catch (error) {
    return new URL(fallbackPath || '/', `${origin}/`).toString();
  }
}

function normalizeCheckoutReturnPath(value) {
  const normalized = String(value || '').trim();

  if (normalized === '/test' || normalized.startsWith('/test?')) {
    return '/test';
  }

  return '/';
}

function formatMoney(amountMinor, currency = 'INR') {
  const normalizedCurrency = String(currency || 'INR').toUpperCase();
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: normalizedCurrency,
    maximumFractionDigits: 2
  }).format((Number(amountMinor) || 0) / 100);
}

function normalizePaymentStage(value, fallback = process.env.DEFAULT_PAYMENT_STAGE || DEFAULT_PAYMENT_STAGE) {
  const normalizedValue = String(value || '').trim().toLowerCase();
  const fallbackValue = String(fallback || DEFAULT_PAYMENT_STAGE).trim().toLowerCase();

  if (normalizedValue === 'testing') {
    return 'testing';
  }

  if (normalizedValue === 'production') {
    return 'production';
  }

  return fallbackValue === 'testing' ? 'testing' : DEFAULT_PAYMENT_STAGE;
}

function getPaymentStageConfigs() {
  const configuredStages = parseJson(process.env.PAYMENT_STAGE_CONFIG_JSON, {});
  return deepMerge(DEFAULT_PAYMENT_STAGE_CONFIGS, configuredStages);
}

function getPaymentStageConfig(stageName) {
  const stages = getPaymentStageConfigs();
  const normalizedStage = normalizePaymentStage(stageName);
  return stages[normalizedStage] || stages[DEFAULT_PAYMENT_STAGE] || DEFAULT_PAYMENT_STAGE_CONFIGS.production;
}

function getStripeCheckoutConfig(req, stageName = normalizePaymentStage(), returnPath = '/') {
  const envConfig = parseJson(process.env.STRIPE_CHECKOUT_CONFIG_JSON, {});
  const origin = getRequestOrigin(req);
  const normalizedReturnPath = normalizeCheckoutReturnPath(returnPath);
  const merged = deepMerge(DEFAULT_STRIPE_CHECKOUT_CONFIG, envConfig);
  const configuredBase = {
    ...merged,
    amount: parseInteger(process.env.STRIPE_CHECKOUT_AMOUNT, merged.amount),
    currency: String(process.env.STRIPE_CHECKOUT_CURRENCY || merged.currency || 'inr').trim().toLowerCase(),
    productName: String(process.env.STRIPE_CHECKOUT_PRODUCT_NAME || merged.productName || '').trim() || DEFAULT_STRIPE_CHECKOUT_CONFIG.productName,
    productDescription: String(process.env.STRIPE_CHECKOUT_PRODUCT_DESCRIPTION || merged.productDescription || '').trim(),
    paymentMethodTypes: parseList(process.env.STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES, merged.paymentMethodTypes || ['card']),
    allowPromotionCodes: parseBoolean(process.env.STRIPE_CHECKOUT_ALLOW_PROMO_CODES, merged.allowPromotionCodes),
    billingAddressCollection: String(process.env.STRIPE_CHECKOUT_BILLING_ADDRESS_COLLECTION || merged.billingAddressCollection || 'required').trim(),
    phoneNumberCollection: parseBoolean(process.env.STRIPE_CHECKOUT_PHONE_NUMBER_COLLECTION, merged.phoneNumberCollection),
    taxIdCollection: parseBoolean(process.env.STRIPE_CHECKOUT_TAX_ID_COLLECTION, merged.taxIdCollection),
    automaticTax: parseBoolean(process.env.STRIPE_CHECKOUT_AUTOMATIC_TAX, merged.automaticTax),
    invoiceCreation: parseBoolean(process.env.STRIPE_CHECKOUT_INVOICE_CREATION, merged.invoiceCreation),
    submitType: String(process.env.STRIPE_CHECKOUT_SUBMIT_TYPE || merged.submitType || 'pay').trim(),
    shippingCountries: parseList(process.env.STRIPE_CHECKOUT_SHIPPING_COUNTRIES, merged.shippingCountries || []),
    customFields: parseJson(process.env.STRIPE_CHECKOUT_CUSTOM_FIELDS_JSON, merged.customFields || []),
    customText: parseJson(process.env.STRIPE_CHECKOUT_CUSTOM_TEXT_JSON, merged.customText || {}),
    consentCollection: parseJson(process.env.STRIPE_CHECKOUT_CONSENT_COLLECTION_JSON, merged.consentCollection),
    metadata: parseJson(process.env.STRIPE_CHECKOUT_METADATA_JSON, merged.metadata || {}),
    buttonLabel: String(process.env.STRIPE_CHECKOUT_BUTTON_LABEL || merged.buttonLabel || '').trim() || `Pay ${formatMoney(parseInteger(process.env.STRIPE_CHECKOUT_AMOUNT, merged.amount), String(process.env.STRIPE_CHECKOUT_CURRENCY || merged.currency || 'inr').trim().toLowerCase())}`,
    successUrl: resolveUrl(
      process.env.STRIPE_CHECKOUT_SUCCESS_URL || merged.successUrl,
      origin,
      `${normalizedReturnPath}?payment=success&session_id={CHECKOUT_SESSION_ID}`
    ),
    cancelUrl: resolveUrl(
      process.env.STRIPE_CHECKOUT_CANCEL_URL || merged.cancelUrl,
      origin,
      `${normalizedReturnPath}?payment=cancelled`
    )
  };
  const stageConfig = getPaymentStageConfig(stageName);
  const stageCheckoutConfig = deepMerge(configuredBase, stageConfig.checkout || {});

  const amount = parseInteger(stageCheckoutConfig.amount, configuredBase.amount);
  const currency = String(stageCheckoutConfig.currency || configuredBase.currency || 'inr').trim().toLowerCase();
  const config = {
    ...stageCheckoutConfig,
    amount,
    currency,
    productName: String(stageCheckoutConfig.productName || '').trim() || DEFAULT_STRIPE_CHECKOUT_CONFIG.productName,
    productDescription: String(stageCheckoutConfig.productDescription || '').trim(),
    paymentMethodTypes: Array.isArray(stageCheckoutConfig.paymentMethodTypes) && stageCheckoutConfig.paymentMethodTypes.length
      ? stageCheckoutConfig.paymentMethodTypes
      : ['card'],
    allowPromotionCodes: Boolean(stageCheckoutConfig.allowPromotionCodes),
    billingAddressCollection: String(stageCheckoutConfig.billingAddressCollection || 'required').trim(),
    phoneNumberCollection: Boolean(stageCheckoutConfig.phoneNumberCollection),
    taxIdCollection: Boolean(stageCheckoutConfig.taxIdCollection),
    automaticTax: Boolean(stageCheckoutConfig.automaticTax),
    invoiceCreation: Boolean(stageCheckoutConfig.invoiceCreation),
    submitType: String(stageCheckoutConfig.submitType || 'pay').trim(),
    shippingCountries: Array.isArray(stageCheckoutConfig.shippingCountries) ? stageCheckoutConfig.shippingCountries : [],
    customFields: Array.isArray(stageCheckoutConfig.customFields) ? stageCheckoutConfig.customFields : [],
    customText: isPlainObject(stageCheckoutConfig.customText) ? stageCheckoutConfig.customText : {},
    consentCollection: stageCheckoutConfig.consentCollection || null,
    metadata: isPlainObject(stageCheckoutConfig.metadata) ? stageCheckoutConfig.metadata : {},
    buttonLabel: String(stageCheckoutConfig.buttonLabel || '').trim() || `Pay ${formatMoney(amount, currency)}`,
    successUrl: resolveUrl(
      stageCheckoutConfig.successUrl,
      origin,
      `${normalizedReturnPath}?payment=success&session_id={CHECKOUT_SESSION_ID}`
    ),
    cancelUrl: resolveUrl(
      stageCheckoutConfig.cancelUrl,
      origin,
      `${normalizedReturnPath}?payment=cancelled`
    )
  };

  return config;
}

function getMomencePostPaymentConfig(stageName = normalizePaymentStage()) {
  const baseMembership = deepMerge(DEFAULT_MOMENCE_MEMBERSHIP, parseJson(process.env.MOMENCE_MEMBERSHIP_JSON, {}));
  const stageConfig = getPaymentStageConfig(stageName);
  const membership = deepMerge(baseMembership, stageConfig.membership || {});
  const explicitUrl = String(process.env.SUPABASE_MOMENCE_PAYMENT_SYNC_URL || '').trim();
  const supabaseBase = String(process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const functionUrl = explicitUrl || (supabaseBase ? `${supabaseBase}/functions/v1/manual-momence-sync` : '');
  const functionKey = String(
    process.env.SUPABASE_MOMENCE_PAYMENT_SYNC_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_MOMENCE_SESSIONS_KEY
    || ''
  ).trim();

  return {
    mode: String(process.env.MOMENCE_POST_PAYMENT_MODE || (functionUrl ? 'supabase-function' : 'disabled')).trim(),
    functionUrl,
    functionKey,
    action: String(process.env.SUPABASE_MOMENCE_PAYMENT_SYNC_ACTION || 'create-member-and-purchase-membership').trim(),
    membership
  };
}

function resolveScheduleLocationIds(center = '') {
  const normalizedCenter = String(center || '').trim().toLowerCase();
  const match = Object.entries(STUDIO_SCHEDULE_LOCATION_IDS).find(([studioName]) => {
    const normalizedStudioName = studioName.toLowerCase();
    return normalizedCenter === normalizedStudioName
      || normalizedCenter.includes(normalizedStudioName)
      || normalizedStudioName.includes(normalizedCenter);
  });

  return match ? [...match[1]] : [];
}

function buildStudioSchedulePageUrl(req, center = '') {
  const origin = getRequestOrigin(req);
  const locationIds = resolveScheduleLocationIds(center);
  const targetUrl = new URL('/schedule-mum', `${origin}/`);

  if (locationIds.length) {
    targetUrl.searchParams.set('locationId', locationIds[0]);
  }

  return targetUrl.toString();
}

function normalizePhoneDigits(phone = '') {
  return normalizePhone(phone);
}

function buildOpenBarreMembershipConfig(overrides = {}) {
  const envConfig = parseJson(process.env.MOMENCE_OPEN_BARRE_MEMBERSHIP_JSON, {});
  const membership = deepMerge({
    id: 33609,
    name: 'Studio Open Barre Class',
    price: 0,
    priceAfterProration: 0,
    currency: 'inr',
    homeLocationId: parseInteger(process.env.MOMENCE_DEFAULT_HOME_LOCATION_ID, 29821),
    checkoutItemId: 'open-barre-membership',
    paymentMethodId: 'open-barre-free'
  }, envConfig);

  return deepMerge(membership, overrides);
}

function buildStudioComplimentaryClassMembershipConfig(overrides = {}) {
  const envConfig = parseJson(process.env.MOMENCE_STUDIO_COMPLIMENTARY_CLASS_MEMBERSHIP_JSON, {});
  const membershipId = parseInteger(
    process.env.MOMENCE_STUDIO_COMPLIMENTARY_CLASS_MEMBERSHIP_ID,
    Number(envConfig.id || envConfig.membershipId || 97880)
  );
  const membership = deepMerge({
    id: membershipId,
    name: 'Studio Complimentary Class',
    price: 0,
    priceAfterProration: 0,
    currency: 'inr',
    homeLocationId: parseInteger(process.env.MOMENCE_DEFAULT_HOME_LOCATION_ID, 29821),
    checkoutItemId: 'studio-complimentary-class-membership',
    paymentMethodId: 'studio-complimentary-class-free'
  }, envConfig);

  return deepMerge(membership, overrides);
}

class MomencePublicApiClient {
  constructor(config = {}) {
    this.apiBaseUrl = String(config.apiBaseUrl || process.env.MOMENCE_API_V2_BASE_URL || 'https://api.momence.com/api/v2').replace(/\/$/, '');
    this.basicAuth = String(config.basicAuth || process.env.MOMENCE_API_V2_BASIC_AUTH || '').trim();
    this.username = String(config.username || process.env.MOMENCE_API_V2_USERNAME || '').trim();
    this.password = String(config.password || process.env.MOMENCE_API_V2_PASSWORD || '').trim();
    this.defaultHomeLocationId = parseInteger(config.defaultHomeLocationId ?? process.env.MOMENCE_DEFAULT_HOME_LOCATION_ID, 29821);
    this.homeLocationId = parseInteger(config.homeLocationId ?? process.env.MOMENCE_HOME_LOCATION_ID, this.defaultHomeLocationId);
    this.kwalityHomeLocationId = parseInteger(config.kwalityHomeLocationId ?? process.env.MOMENCE_KWALITY_HOME_LOCATION_ID, this.homeLocationId);
    this.fetchImpl = config.fetchImpl || fetch;
    this.accessToken = String(config.accessToken || '').trim();
  }

  assertConfigured() {
    if (!this.basicAuth || !this.username || !this.password) {
      throw new Error('Momence API v2 is not configured. Set MOMENCE_API_V2_BASIC_AUTH, MOMENCE_API_V2_USERNAME, and MOMENCE_API_V2_PASSWORD.');
    }
  }

  resolveHomeLocationId(input = {}) {
    if (Number.isFinite(Number(input.homeLocationId)) && Number(input.homeLocationId) > 0) {
      return Number(input.homeLocationId);
    }

    const center = String(input.center || input.studio_location || '').toLowerCase();
    if (center.includes('kwality') || center.includes('kemps')) {
      return this.kwalityHomeLocationId || this.homeLocationId || this.defaultHomeLocationId;
    }

    return this.defaultHomeLocationId || this.homeLocationId;
  }

  async getAccessToken() {
    if (this.accessToken) {
      return this.accessToken;
    }

    this.assertConfigured();

    const response = await this.fetchImpl(`${this.apiBaseUrl}/auth/token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: this.basicAuth,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username: this.username,
        password: this.password
      })
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`Momence auth failed: ${response.status} ${responseText || response.statusText}`.trim());
    }

    const data = responseText ? JSON.parse(responseText) : {};
    this.accessToken = String(data.access_token || '').trim();
    if (!this.accessToken) {
      throw new Error('Momence auth response did not include an access token.');
    }

    return this.accessToken;
  }

  async request(pathname, options = {}) {
    const accessToken = await this.getAccessToken();
    const response = await this.fetchImpl(`${this.apiBaseUrl}${pathname}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : {};
    if (!response.ok) {
      throw new Error(`Momence API request failed: ${response.status} ${responseText || response.statusText}`.trim());
    }

    return data;
  }

  parseMember(member, action = 'found_existing') {
    return {
      memberId: Number(member.memberId || member.id || 0),
      email: String(member.email || ''),
      firstName: String(member.firstName || member.first_name || ''),
      lastName: String(member.lastName || member.last_name || ''),
      phoneNumber: String(member.phoneNumber || member.phone || ''),
      action
    };
  }

  getMembersFromResponse(data) {
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.payload)) {
      return data.payload;
    }

    if (Array.isArray(data?.data)) {
      return data.data;
    }

    if (Array.isArray(data?.items)) {
      return data.items;
    }

    return [];
  }

  async listMembers(query) {
    const params = new URLSearchParams({
      page: '0',
      pageSize: '20',
      query: String(query || '').trim()
    });
    const data = await this.request(`/host/members?${params.toString()}`);
    return this.getMembersFromResponse(data).map((member) => this.parseMember(member));
  }

  async findMemberByEmailOrPhone(email, phoneNumber) {
    const normalizedEmail = sanitizeEmail(email);
    const normalizedPhone = normalizePhoneDigits(phoneNumber);
    const queries = [normalizedEmail, phoneNumber].map((query) => String(query || '').trim()).filter(Boolean);

    for (const query of queries) {
      const members = await this.listMembers(query);
      const matchedMember = members.find((member) => {
        const emailMatches = normalizedEmail && sanitizeEmail(member.email) === normalizedEmail;
        const phoneMatches = normalizedPhone && normalizePhoneDigits(member.phoneNumber) === normalizedPhone;
        return emailMatches || phoneMatches;
      });

      if (matchedMember?.memberId) {
        return matchedMember;
      }
    }

    return null;
  }

  async createMember(input) {
    const payload = {
      email: sanitizeEmail(input.email),
      firstName: sanitizeText(input.firstName, 100),
      lastName: sanitizeText(input.lastName, 100),
      phoneNumber: sanitizePhone(input.phoneNumber),
      homeLocationId: this.resolveHomeLocationId(input)
    };

    const data = await this.request('/host/members', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const memberId = Number(data.memberId || data.id || 0);
    if (!memberId) {
      throw new Error('Momence member creation response did not include a member id.');
    }

    return {
      ...payload,
      memberId,
      action: 'created_new'
    };
  }

  async ensureMember(input) {
    const existingMember = await this.findMemberByEmailOrPhone(input.email, input.phoneNumber);
    if (existingMember?.memberId) {
      return existingMember;
    }

    return this.createMember(input);
  }

  async addMembershipToMember(memberId, membershipConfig = buildOpenBarreMembershipConfig()) {
    const membershipId = Number(membershipConfig.id || membershipConfig.membershipId || 0);
    if (!membershipId) {
      throw new Error(`${membershipConfig.name || 'Momence'} membership id is missing.`);
    }

    const payload = {
      memberId: Number(memberId),
      homeLocationId: parseInteger(membershipConfig.homeLocationId, this.defaultHomeLocationId),
      items: [
        {
          id: String(membershipConfig.checkoutItemId || 'membership'),
          type: 'subscription',
          membershipId,
          attemptedPriceInCurrency: String(Number(membershipConfig.priceAfterProration ?? membershipConfig.price ?? 0))
        }
      ],
      paymentMethods: [
        {
          id: String(membershipConfig.paymentMethodId || 'free'),
          type: 'free'
        }
      ]
    };

    const data = await this.request('/host/checkout', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const purchasedItem = Array.isArray(data.purchasedItems) ? data.purchasedItems[0] : null;

    return {
      success: true,
      memberId: Number(memberId),
      purchaseId: purchasedItem?.boughtMembershipId || purchasedItem?.id || data.orderId || '',
      membershipId,
      data
    };
  }

  async ensureMemberAndAddMembership(input, membershipConfig = buildOpenBarreMembershipConfig()) {
    const member = await this.ensureMember(input);
    const checkout = await this.addMembershipToMember(member.memberId, {
      ...membershipConfig,
      homeLocationId: membershipConfig.homeLocationId || this.resolveHomeLocationId(input)
    });

    return {
      ...checkout,
      member,
      customerAction: member.action
    };
  }
}

function getOpenBarreSyncConfig(overrides = {}) {
  const paymentConfig = getMomencePostPaymentConfig();
  return {
    functionUrl: overrides.functionUrl || paymentConfig.functionUrl,
    functionKey: overrides.functionKey || paymentConfig.functionKey,
    action: overrides.action || paymentConfig.action,
    membership: overrides.membership || buildOpenBarreMembershipConfig()
  };
}

function getInfluencerMembershipSyncConfig(overrides = {}) {
  const paymentConfig = getMomencePostPaymentConfig();
  return {
    functionUrl: overrides.functionUrl || paymentConfig.functionUrl,
    functionKey: overrides.functionKey || paymentConfig.functionKey,
    action: overrides.action || paymentConfig.action,
    membership: overrides.membership || buildStudioComplimentaryClassMembershipConfig()
  };
}

function buildMomenceMemberInput(leadData) {
  return {
    firstName: leadData.firstName,
    lastName: leadData.lastName,
    email: leadData.email,
    phoneNumber: leadData.phoneNumber,
    center: leadData.center,
    homeLocationId: leadData.homeLocationId
  };
}

async function provisionMembershipViaSupabase(leadData, options = {}) {
  const syncConfig = (options.getSyncConfig || getOpenBarreSyncConfig)(options.syncConfig || {});
  const fetchImpl = options.fetchImpl || fetch;

  if (!syncConfig.functionUrl || !syncConfig.functionKey) {
    throw new Error(`Supabase Momence sync is not configured for ${syncConfig.membership?.name || 'membership'} provisioning.`);
  }

  const member = buildMomenceMemberInput(leadData);
  const response = await fetchImpl(syncConfig.functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${syncConfig.functionKey}`,
      apikey: syncConfig.functionKey
    },
    body: JSON.stringify({
      action: syncConfig.action,
      source: 'influencer-barre-form',
      lead: {
        ...member,
        phoneCountry: leadData.phoneCountry,
        type: leadData.type,
        waiverAccepted: leadData.waiverAccepted,
        event_id: leadData.event_id,
        draft_id: leadData.draft_id
      },
      member,
      membership: syncConfig.membership
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.error || result.message || `Supabase Momence sync failed with ${response.status}`);
  }

  return {
    success: true,
    source: 'supabase-function',
    memberId: result.memberId || result.customerId || '',
    purchaseId: result.purchaseId || result.orderId || result.membershipPurchaseId || '',
    membershipId: result.membershipId || syncConfig.membership?.id || '',
    membershipName: syncConfig.membership?.name || '',
    customerAction: result.action || result.customerAction || '',
    raw: result
  };
}

async function provisionOpenBarreViaSupabase(leadData, options = {}) {
  return provisionMembershipViaSupabase(leadData, {
    ...options,
    getSyncConfig: getOpenBarreSyncConfig
  });
}

async function provisionMembership(leadData, options = {}) {
  const client = options.client || new MomencePublicApiClient();
  const membershipConfig = options.membershipConfig || buildOpenBarreMembershipConfig();
  const getSyncConfig = options.getSyncConfig || getOpenBarreSyncConfig;

  try {
    const result = await client.ensureMemberAndAddMembership(buildMomenceMemberInput(leadData), membershipConfig);
    return {
      ...result,
      membershipName: membershipConfig.name || ''
    };
  } catch (directError) {
    if (options.disableFallback) {
      throw directError;
    }

    try {
      const fallbackResult = await provisionMembershipViaSupabase(leadData, {
        ...options,
        getSyncConfig
      });
      return {
        ...fallbackResult,
        directError: directError.message || 'Direct Momence checkout failed.'
      };
    } catch (fallbackError) {
      throw new Error(`Direct Momence checkout failed: ${directError.message || directError}; Supabase fallback failed: ${fallbackError.message || fallbackError}`);
    }
  }
}

async function provisionOpenBarreMembership(leadData, options = {}) {
  return provisionMembership(leadData, {
    ...options,
    membershipConfig: options.membershipConfig || buildOpenBarreMembershipConfig(),
    getSyncConfig: getOpenBarreSyncConfig
  });
}

async function provisionInfluencerMembership(leadData, options = {}) {
  return provisionMembership(leadData, {
    ...options,
    membershipConfig: options.membershipConfig || buildStudioComplimentaryClassMembershipConfig(),
    getSyncConfig: getInfluencerMembershipSyncConfig
  });
}

async function getScheduleForLead(leadData, req) {
  try {
    const sessionsPayload = await scheduleService.getSessions({
      center: leadData.center,
      type: 'Barre'
    });

    return {
      success: true,
      ...sessionsPayload,
      schedulePageUrl: buildStudioSchedulePageUrl(req, leadData.center),
      fallbackUrl: getPublicClientConfig().scheduleUrl
    };
  } catch (error) {
    console.error('Influencer schedule fetch failed:', error.message);
    return {
      success: false,
      error: error.message || 'Unable to load the schedule right now.',
      meta: {
        center: leadData.center || '',
        type: 'Barre',
        totalSessions: 0
      },
      sessions: [],
      groupedSessions: [],
      schedulePageUrl: buildStudioSchedulePageUrl(req, leadData.center),
      fallbackUrl: getPublicClientConfig().scheduleUrl
    };
  }
}

function buildInfluencerSubmissionSuccessPayload({
  leadData,
  momenceSyncResult = {},
  schedule = {},
  fallbackRedirectUrl = getPublicClientConfig().scheduleUrl
}) {
  const membershipProvisioned = Boolean(momenceSyncResult.success);

  return {
    success: true,
    id: leadData.id,
    event_id: leadData.event_id,
    momenceSynced: true,
    momence: {
      membershipProvisioned,
      membershipName: momenceSyncResult.membershipName || momenceSyncResult.membership?.name || 'Studio Complimentary Class',
      openBarreProvisioned: membershipProvisioned,
      memberId: momenceSyncResult.memberId || momenceSyncResult.member?.memberId || '',
      membershipId: momenceSyncResult.membershipId || '',
      purchaseId: momenceSyncResult.purchaseId || '',
      customerAction: momenceSyncResult.customerAction || '',
      error: membershipProvisioned ? '' : String(momenceSyncResult.error || '')
    },
    schedule,
    redirectUrl: schedule.schedulePageUrl || fallbackRedirectUrl
  };
}

function buildStripeMetadata(leadPayload, checkoutConfig) {
  return {
    source: 'paid-trial-form',
    source_form: String(leadPayload.source_form || 'paid-trial-form'),
    payment_stage: String(leadPayload.stage || normalizePaymentStage()),
    event_id: String(leadPayload.event_id || ''),
    draft_id: String(leadPayload.draft_id || ''),
    first_name: String(leadPayload.firstName || ''),
    last_name: String(leadPayload.lastName || ''),
    email: String(leadPayload.email || ''),
    phone_number: String(leadPayload.phoneNumber || ''),
    phone_country: String(leadPayload.phoneCountry || ''),
    center: String(leadPayload.center || ''),
    type: String(leadPayload.type || ''),
    time: String(leadPayload.time || ''),
    product_name: String(checkoutConfig.productName || ''),
    waiver_accepted: String(leadPayload.waiverAccepted || ''),
    ...Object.fromEntries(Object.entries(checkoutConfig.metadata || {}).map(([key, value]) => [key, String(value)]))
  };
}

function isPaidStripeSession(session) {
  return Boolean(session) && (
    session.payment_status === 'paid'
    || session.status === 'complete'
    || session.payment_intent?.status === 'succeeded'
  );
}

function buildLeadPayloadFromCheckoutSession(session) {
  const metadata = session?.metadata || {};
  const customerDetails = session?.customer_details || {};
  const fullName = String(customerDetails.name || '').trim();
  const [derivedFirstName = '', ...restName] = fullName.split(' ');

  return {
    firstName: metadata.first_name || derivedFirstName,
    lastName: metadata.last_name || restName.join(' '),
    email: metadata.email || customerDetails.email || '',
    phoneNumber: metadata.phone_number || customerDetails.phone || '',
    phoneCountry: metadata.phone_country || 'IN',
    center: metadata.center || '',
    type: metadata.type || '',
    time: metadata.time || '',
    stage: metadata.payment_stage || normalizePaymentStage(),
    waiverAccepted: metadata.waiver_accepted || 'accepted',
    event_id: metadata.event_id || '',
    draft_id: metadata.draft_id || '',
    payment_session_id: session?.id || '',
    source_form: metadata.source_form || metadata.source || 'paid-trial-form'
  };
}

async function updateCheckoutSessionMetadata(sessionId, metadataPatch = {}) {
  if (!stripeClient || !sessionId || !Object.keys(metadataPatch).length) {
    return null;
  }

  try {
    return await stripeClient.checkout.sessions.update(sessionId, {
      metadata: Object.fromEntries(Object.entries(metadataPatch).map(([key, value]) => [key, String(value)]))
    });
  } catch (error) {
    console.error('Unable to update Stripe checkout session metadata:', error.message);
    return null;
  }
}

async function fulfillMomencePurchaseFromSession(session) {
  const paymentStage = normalizePaymentStage(session?.metadata?.payment_stage);
  const paymentConfig = getMomencePostPaymentConfig(paymentStage);
  const existingStatus = String(session?.metadata?.momence_fulfillment_status || '').trim().toLowerCase();

  if (existingStatus === 'success') {
    return {
      success: true,
      memberId: session.metadata.momence_member_id || '',
      purchaseId: session.metadata.momence_purchase_id || '',
      source: 'stripe-metadata'
    };
  }

  if (paymentConfig.mode !== 'supabase-function' || !paymentConfig.functionUrl || !paymentConfig.functionKey) {
    throw new Error('Post-payment Momence sync is not configured. Set the Supabase Momence payment sync function URL and key.');
  }

  const leadData = buildLeadPayloadFromCheckoutSession(session);
  const payload = {
    action: paymentConfig.action,
    source: 'paid-trial-form',
    lead: leadData,
    member: {
      firstName: leadData.firstName,
      lastName: leadData.lastName,
      email: leadData.email,
      phoneNumber: leadData.phoneNumber,
      phoneCountry: leadData.phoneCountry,
      waiverAccepted: leadData.waiverAccepted,
      center: leadData.center,
      type: leadData.type,
      time: leadData.time
    },
    membership: paymentConfig.membership,
    stripe: {
      sessionId: session.id,
      paymentIntentId: session.payment_intent?.id || session.payment_intent || '',
      paymentStatus: session.payment_status || '',
      amountTotal: session.amount_total,
      currency: session.currency,
      customerDetails: session.customer_details || {},
      metadata: session.metadata || {}
    }
  };

  const response = await fetch(paymentConfig.functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${paymentConfig.functionKey}`,
      apikey: paymentConfig.functionKey
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    const failureMessage = result.error || result.message || `Supabase Momence sync failed with ${response.status}`;
    await updateCheckoutSessionMetadata(session.id, {
      momence_fulfillment_status: 'failed',
      momence_fulfillment_error: failureMessage.slice(0, 400)
    });
    throw new Error(failureMessage);
  }

  const normalizedResult = {
    success: true,
    memberId: result.memberId || result.customerId || result.member?.id || '',
    purchaseId: result.purchaseId || result.orderId || result.membershipPurchaseId || '',
    stage: paymentStage,
    raw: result
  };

  await updateCheckoutSessionMetadata(session.id, {
    momence_fulfillment_status: 'success',
    momence_member_id: normalizedResult.memberId || '',
    momence_purchase_id: normalizedResult.purchaseId || ''
  });

  return normalizedResult;
}

async function retrievePaidSession(sessionId) {
  if (!stripeClient) {
    throw new Error('Payments are not configured on this server.');
  }

  const normalizedSessionId = String(sessionId || '').trim();
  if (!normalizedSessionId) {
    throw new Error('Missing payment session identifier.');
  }

  let session;

  try {
    session = await stripeClient.checkout.sessions.retrieve(normalizedSessionId, {
      expand: ['payment_intent']
    });
  } catch (error) {
    if (error && error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
      const missingSessionError = new Error('This checkout session could not be found. It may belong to an older test run or a different Stripe key. Please start the payment flow again.');
      missingSessionError.code = 'checkout_session_missing';
      throw missingSessionError;
    }

    throw error;
  }

  if (!isPaidStripeSession(session)) {
    throw new Error('Payment has not been completed yet.');
  }

  return session;
}

async function retrieveAndValidatePaidSession(sessionId) {
  const session = await retrievePaidSession(sessionId);
  const fulfillment = await fulfillMomencePurchaseFromSession(session);
  return { session, fulfillment };
}

function getPublicClientConfig() {
  const mockRequest = {
    get: () => '',
    protocol: 'https'
  };
  const defaultPaymentStage = normalizePaymentStage();
  const checkoutConfig = getStripeCheckoutConfig(mockRequest, defaultPaymentStage);
  const paymentStages = ['production', 'testing'].reduce((result, stageName) => {
    const stageCheckoutConfig = getStripeCheckoutConfig(mockRequest, stageName);
    const stageConfig = getPaymentStageConfig(stageName);
    const stageMembership = getMomencePostPaymentConfig(stageName).membership;

    result[stageName] = {
      label: String(stageConfig.label || (stageName === 'testing' ? 'Testing' : 'Production')),
      amountDisplay: formatMoney(stageCheckoutConfig.amount, stageCheckoutConfig.currency),
      buttonLabel: stageCheckoutConfig.buttonLabel,
      description: String(stageConfig.description || ''),
      membershipName: String(stageMembership.name || ''),
      membershipId: Number(stageMembership.id || 0) || ''
    };

    return result;
  }, {});

  return {
    gaMeasurementId: process.env.GA_MEASUREMENT_ID || '',
    googleAdsId: process.env.GOOGLE_ADS_ID || '',
    googleAdsConversionLabel: process.env.GOOGLE_ADS_CONVERSION_LABEL || '',
    googleAdsConversionValue: process.env.GOOGLE_ADS_CONVERSION_VALUE || '',
    googleAdsConversionCurrency: process.env.GOOGLE_ADS_CONVERSION_CURRENCY || 'INR',
    metaPixelId: process.env.META_PIXEL_ID || '',
    snapPixelId: process.env.SNAP_PIXEL_ID || '',
    gtmId: process.env.GTM_ID || '',
    apiBaseUrl: process.env.FORM_API_BASE_URL || '',
    scheduleUrl: process.env.FORM_SCHEDULE_URL || process.env.FORM_REDIRECT_URL || 'https://momence.com/u/physique-57-india-fffoSp',
    redirectUrl: process.env.FORM_REDIRECT_URL || 'https://momence.com/u/physique-57-india-fffoSp',
    defaultPaymentStage,
    paymentStages,
    paymentButtonLabel: checkoutConfig.buttonLabel,
    paymentAmountDisplay: formatMoney(checkoutConfig.amount, checkoutConfig.currency),
    paymentCurrency: String(checkoutConfig.currency || 'inr').toUpperCase()
  };
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function normalizePhone(phone = '') {
  return String(phone).replace(/\D/g, '');
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.socket?.remoteAddress || '';
}

function sanitizeText(value, maxLength = 255) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeEmail(value) {
  return sanitizeText(value, 254).toLowerCase();
}

function sanitizePhone(value) {
  const rawValue = String(value || '').trim();
  const digits = rawValue.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return `+${digits}`;
}

function normalizeCountryIso(value) {
  const normalized = sanitizeText(value, 4).toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : 'IN';
}

function normalizeAndValidatePhone(value, countryIso) {
  const rawValue = String(value || '').trim();
  if (!rawValue) {
    return { number: '', isValid: false };
  }

  const parsed = parsePhoneNumberFromString(rawValue, normalizeCountryIso(countryIso));
  if (!parsed || !parsed.isValid()) {
    return { number: '', isValid: false };
  }

  return {
    number: parsed.number,
    isValid: true
  };
}

function sanitizeTrackingValue(value) {
  return sanitizeText(value, 255);
}

function sanitizeUrl(value) {
  const rawValue = sanitizeText(value, 2048);

  if (!rawValue) {
    return '';
  }

  try {
    const parsed = new URL(rawValue);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : '';
  } catch (error) {
    return '';
  }
}

function generateLeadId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateEventId(value) {
  const sanitized = sanitizeText(value, 120);
  return /^[A-Za-z0-9_-]{8,120}$/.test(sanitized) ? sanitized : `lead_${generateLeadId().replace(/[^A-Za-z0-9_-]/g, '')}`;
}

function isTruthyConsent(value) {
  return ['accepted', 'true', '1', 'on', 'yes'].includes(String(value || '').trim().toLowerCase());
}

function validateLeadPayload(payload) {
  const fieldErrors = {};

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      isValid: false,
      fieldErrors: {
        form: 'Invalid request body.'
      }
    };
  }

  if (sanitizeText(payload.company, 255)) {
    return {
      isValid: false,
      isBot: true,
      fieldErrors: {}
    };
  }

  const firstName = sanitizeText(payload.firstName, 80);
  if (!firstName) {
    fieldErrors.firstName = 'First name is required.';
  }

  const lastName = sanitizeText(payload.lastName, 80);
  if (!lastName) {
    fieldErrors.lastName = 'Last name is required.';
  }

  const email = sanitizeEmail(payload.email);
  if (!email) {
    fieldErrors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  const phoneCountry = normalizeCountryIso(payload.phoneCountry);
  const normalizedPhone = normalizeAndValidatePhone(payload.phoneNumber, phoneCountry);
  const phoneNumber = normalizedPhone.number;
  const phoneDigits = normalizePhone(phoneNumber);
  if (!phoneNumber) {
    fieldErrors.phoneNumber = 'Phone number is required.';
  } else if (!normalizedPhone.isValid || phoneDigits.length < 8 || phoneDigits.length > 15) {
    fieldErrors.phoneNumber = `Enter a valid phone number for ${phoneCountry}.`;
  }

  const time = sanitizeText(payload.time, 80) || 'Flexible / Needs Recommendation';
  if (time && !ALLOWED_TIME_WINDOWS.includes(time)) {
    fieldErrors.time = 'Choose an available time window.';
  }

  const center = sanitizeText(payload.center, 120);
  if (!Object.prototype.hasOwnProperty.call(STUDIO_CLASS_OPTIONS, center)) {
    fieldErrors.center = 'Choose a valid studio location.';
  }

  const type = sanitizeText(payload.type, 80);
  if (!type) {
    fieldErrors.type = 'Choose a class format.';
  } else if (center && Array.isArray(STUDIO_CLASS_OPTIONS[center]) && !STUDIO_CLASS_OPTIONS[center].includes(type)) {
    fieldErrors.type = 'Choose a class format available at that studio.';
  }

  if (!isTruthyConsent(payload.waiverAccepted)) {
    fieldErrors.waiverAccepted = 'You must accept the waiver before submitting.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      isValid: false,
      fieldErrors
    };
  }

  const sanitizedPayload = {
    firstName,
    lastName,
    email,
    phoneNumber,
    phoneCountry,
    time,
    center,
    type,
    waiverAccepted: 'accepted',
    event_id: getOrCreateEventId(payload.event_id),
    draft_id: sanitizeText(payload.draft_id || payload.draftId, 120),
    session_id: sanitizeText(payload.session_id || payload.sessionId, 120),
    payment_session_id: sanitizeText(payload.payment_session_id || payload.paymentSessionId, 120)
  };

  TRACKING_FIELDS.forEach((fieldName) => {
    sanitizedPayload[fieldName] = sanitizeTrackingValue(payload[fieldName]);
  });

  URL_FIELDS.forEach((fieldName) => {
    sanitizedPayload[fieldName] = sanitizeUrl(payload[fieldName]);
  });

  return {
    isValid: true,
    fieldErrors: {},
    data: sanitizedPayload
  };
}

function sanitizePartialLeadPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const sanitizedPayload = {
    draft_id: sanitizeText(payload.draft_id || payload.draftId, 120),
    event_id: getOrCreateEventId(payload.event_id || payload.eventId || generateLeadId()),
    status: sanitizeText(payload.status || 'in_progress', 40) || 'in_progress',
    session_id: sanitizeText(payload.session_id || payload.sessionId, 120),
    phoneCountry: sanitizeText(payload.phoneCountry, 4).toUpperCase(),
    firstName: sanitizeText(payload.firstName, 80),
    lastName: sanitizeText(payload.lastName, 80),
    email: sanitizeEmail(payload.email),
    phoneNumber: sanitizePhone(payload.phoneNumber),
    time: sanitizeText(payload.time, 80),
    center: sanitizeText(payload.center, 120),
    type: sanitizeText(payload.type, 80),
    waiverAccepted: isTruthyConsent(payload.waiverAccepted) ? 'accepted' : '',
    company: sanitizeText(payload.company, 255)
  };

  TRACKING_FIELDS.forEach((fieldName) => {
    sanitizedPayload[fieldName] = sanitizeTrackingValue(payload[fieldName]);
  });

  URL_FIELDS.forEach((fieldName) => {
    sanitizedPayload[fieldName] = sanitizeUrl(payload[fieldName]);
  });

  const hasMeaningfulData = [
    sanitizedPayload.firstName,
    sanitizedPayload.lastName,
    sanitizedPayload.email,
    sanitizedPayload.phoneNumber,
    sanitizedPayload.center,
    sanitizedPayload.type,
    sanitizedPayload.time,
    sanitizedPayload.waiverAccepted,
    ...TRACKING_FIELDS.map((fieldName) => sanitizedPayload[fieldName])
  ].some((value) => Boolean(String(value || '').trim()));

  if (!sanitizedPayload.draft_id || sanitizedPayload.company || !hasMeaningfulData) {
    return null;
  }

  return sanitizedPayload;
}

function applySubmissionRateLimit(req, res, next) {
  const now = Date.now();
  const clientIp = getClientIp(req) || 'unknown';
  const currentEntry = rateLimitStore.get(clientIp);

  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }

  if (!currentEntry || currentEntry.resetAt <= now) {
    rateLimitStore.set(clientIp, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    });
    return next();
  }

  if (currentEntry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((currentEntry.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      success: false,
      error: 'Too many submission attempts. Please wait a few minutes and try again.'
    });
  }

  currentEntry.count += 1;
  rateLimitStore.set(clientIp, currentEntry);
  return next();
}

function buildLeadRecord(validatedPayload) {
  return {
    id: generateLeadId(),
    timestamp: new Date().toISOString(),
    ...validatedPayload
  };
}

function buildMomencePayload(leadData) {
  const momencePayload = {
    firstName: leadData.firstName,
    lastName: leadData.lastName,
    email: leadData.email,
    phoneNumber: leadData.phoneNumber,
    time: leadData.time,
    center: leadData.center,
    type: leadData.type,
    waiverAccepted: leadData.waiverAccepted,
    event_id: leadData.event_id
  };

  TRACKING_FIELDS.forEach((fieldName) => {
    if (leadData[fieldName]) {
      momencePayload[fieldName] = leadData[fieldName];
    }
  });

  URL_FIELDS.forEach((fieldName) => {
    if (leadData[fieldName]) {
      momencePayload[fieldName] = leadData[fieldName];
    }
  });

  return momencePayload;
}

async function sendMetaLeadEvent(leadData, req) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CONVERSIONS_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    return { sent: false, reason: 'Meta Conversions API not configured' };
  }

  const email = normalizeEmail(leadData.email);
  const phone = normalizePhone(leadData.phoneNumber);
  const firstName = String(leadData.firstName || '').trim().toLowerCase();
  const lastName = String(leadData.lastName || '').trim().toLowerCase();
  const clientUserAgent = req.headers['user-agent'] || '';
  const clientIpAddress = getClientIp(req);
  const eventId = leadData.event_id;
  const payload = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_id: eventId,
        event_source_url: leadData.landing_page || '',
        user_data: {
          ...(email ? { em: [sha256(email)] } : {}),
          ...(phone ? { ph: [sha256(phone)] } : {}),
          ...(firstName ? { fn: [sha256(firstName)] } : {}),
          ...(lastName ? { ln: [sha256(lastName)] } : {}),
          ...(leadData.fbp ? { fbp: leadData.fbp } : {}),
          ...(leadData.fbc ? { fbc: leadData.fbc } : {}),
          ...(clientUserAgent ? { client_user_agent: clientUserAgent } : {}),
          ...(clientIpAddress ? { client_ip_address: clientIpAddress } : {}),
          external_id: [sha256(String(leadData.id))]
        },
        custom_data: {
          studio_location: leadData.center || '',
          class_type: leadData.type || '',
          preferred_time: leadData.time || '',
          utm_source: leadData.utm_source || '',
          utm_medium: leadData.utm_medium || '',
          utm_campaign: leadData.utm_campaign || '',
          gclid: leadData.gclid || '',
          gbraid: leadData.gbraid || '',
          wbraid: leadData.wbraid || ''
        }
      }
    ]
  };

  if (process.env.META_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Meta Conversions API error: ${response.status} ${responseText || response.statusText}`.trim());
  }

  return { sent: true, eventId, response: responseText };
}

function buildMomenceLeadRequestPayload(leadData, options = {}) {
  const momenceToken = options.token || process.env.MOMENCE_API_TOKEN || process.env.MOMENCE_TOKEN;
  const momenceSourceId = options.sourceId || process.env.MOMENCE_SOURCE_ID;

  return {
    token: momenceToken,
    sourceId: String(momenceSourceId || ''),
    ...buildMomencePayload(leadData)
  };
}

async function submitToMomence(leadData, options = {}) {
  const momenceToken = options.token || process.env.MOMENCE_API_TOKEN || process.env.MOMENCE_TOKEN;
  const momenceSourceId = options.sourceId || process.env.MOMENCE_SOURCE_ID;
  const momenceEndpoint = process.env.MOMENCE_LEAD_ENDPOINT;

  if (!momenceToken || !momenceSourceId || !momenceEndpoint) {
    throw new Error('Server configuration incomplete. Please set the Momence environment variables.');
  }

  const momencePayload = buildMomenceLeadRequestPayload(leadData, {
    token: momenceToken,
    sourceId: momenceSourceId
  });

  const momenceResponse = await fetch(momenceEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${momenceToken}`
    },
    body: JSON.stringify(momencePayload)
  });

  if (!momenceResponse.ok) {
    const errorText = await momenceResponse.text();
    throw new Error(`Failed to submit to Momence: ${momenceResponse.status} ${errorText || momenceResponse.statusText}`.trim());
  }
}

async function storeLeadData(leadData, requestMeta = {}) {
  try {
    const supabaseResult = await supabaseLeadStore.saveSubmittedLead(leadData, requestMeta);
    if (supabaseResult.success) {
      const submissionRowId = Array.isArray(supabaseResult.data) && supabaseResult.data[0] ? supabaseResult.data[0].id : null;

      if (leadData.draft_id) {
        try {
          await supabaseLeadStore.markPartialSubmitted(leadData.draft_id, leadData, submissionRowId);
        } catch (error) {
          console.error('Supabase partial lead update failed:', error.message);
        }
      }
    }
  } catch (error) {
    console.error('Supabase submitted lead sync failed:', error.message);
  }

  try {
    await googleSheets.appendLead(leadData);
  } catch (error) {
    console.error('Google Sheets sync failed:', error.message);
  }

  return leadData;
}

async function processLeadSubmission(leadData, req, dependencies = {}) {
  const persistLead = dependencies.storeLeadData || storeLeadData;
  const sendMetaEvent = dependencies.sendMetaLeadEvent || sendMetaLeadEvent;
  const syncToMomence = dependencies.submitToMomence || submitToMomence;
  let momenceSyncResult = { success: true, error: '' };

  await persistLead(leadData, {
    ip_address: getClientIp(req),
    user_agent: req.get('user-agent') || ''
  });

  try {
    await syncToMomence(leadData);
  } catch (error) {
    momenceSyncResult = {
      success: false,
      error: error.message || 'Unable to submit to Momence.'
    };
    console.error('Momence sync failed:', momenceSyncResult.error);
  }

  if (!momenceSyncResult.success) {
    return {
      success: true,
      stored: true,
      id: leadData.id,
      event_id: leadData.event_id,
      momenceSynced: false,
      warning: 'Your details were saved, but the Momence sync failed. Please contact the studio team to complete the booking.',
      error: 'Your details were saved, but the Momence sync failed. Please contact the studio team to complete the booking.',
      detail: momenceSyncResult.error,
      redirectUrl: getPublicClientConfig().redirectUrl
    };
  }

  try {
    const metaResult = await sendMetaEvent(leadData, req);
    if (metaResult.sent) {
      console.log(`Meta Conversions API event sent: ${metaResult.eventId}`);
    } else {
      console.log(`Meta Conversions API skipped: ${metaResult.reason}`);
    }
  } catch (error) {
    console.error('Meta Conversions API send failed:', error.message);
  }

  return {
    success: true,
    id: leadData.id,
    event_id: leadData.event_id,
    momenceSynced: true,
    redirectUrl: getPublicClientConfig().redirectUrl
  };
}

async function finalizeLeadSubmissionFromSession(session, req) {
  const existingStatus = String(session?.metadata?.lead_submission_status || '').trim().toLowerCase();

  if (existingStatus === 'success') {
    return {
      success: true,
      alreadySubmitted: true,
      id: session?.metadata?.lead_submission_id || '',
      redirectUrl: getPublicClientConfig().redirectUrl
    };
  }

  const leadPayload = buildLeadPayloadFromCheckoutSession(session);
  const leadData = buildLeadRecord({
    ...leadPayload,
    source_form: leadPayload.source_form || 'paid-trial-form',
    payment_bypass: ''
  });

  const submissionResult = await processLeadSubmission(leadData, req);

  await updateCheckoutSessionMetadata(session.id, {
    lead_submission_status: submissionResult.success ? 'success' : 'failed',
    lead_submission_id: submissionResult.id || '',
    lead_submission_error: String(submissionResult.detail || submissionResult.error || '').slice(0, 400)
  });

  return submissionResult;
}

function requireAdmin(req, res, next) {
  const adminApiKey = process.env.ADMIN_API_KEY;

  if (!adminApiKey) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }

  const providedKey = req.get('x-admin-key') || req.query.key || '';

  if (providedKey !== adminApiKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  return next();
}

app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripeClient) {
    return res.status(500).json({ success: false, error: 'Payments are not configured on this server.' });
  }

  try {
    const validation = validateLeadPayload(req.body);

    if (validation.isBot) {
      return res.status(202).json({ success: false, error: 'Request ignored.' });
    }

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed.',
        fieldErrors: validation.fieldErrors
      });
    }

    const paymentStage = normalizePaymentStage(req.body?.stage);
    const returnPath = normalizeCheckoutReturnPath(req.body?.returnPath || req.body?.return_path);
    const checkoutConfig = getStripeCheckoutConfig(req, paymentStage, returnPath);
    const metadata = buildStripeMetadata({ ...validation.data, stage: paymentStage }, checkoutConfig);
    const sessionPayload = stripUndefined({
      payment_method_types: checkoutConfig.paymentMethodTypes?.length ? checkoutConfig.paymentMethodTypes : ['card'],
      mode: 'payment',
      client_reference_id: validation.data.event_id,
      customer_email: validation.data.email,
      submit_type: checkoutConfig.submitType || 'pay',
      allow_promotion_codes: checkoutConfig.allowPromotionCodes,
      billing_address_collection: checkoutConfig.billingAddressCollection,
      phone_number_collection: { enabled: Boolean(checkoutConfig.phoneNumberCollection) },
      tax_id_collection: { enabled: Boolean(checkoutConfig.taxIdCollection) },
      automatic_tax: { enabled: Boolean(checkoutConfig.automaticTax) },
      invoice_creation: { enabled: Boolean(checkoutConfig.invoiceCreation) },
      shipping_address_collection: checkoutConfig.shippingCountries?.length
        ? { allowed_countries: checkoutConfig.shippingCountries }
        : undefined,
      consent_collection: checkoutConfig.consentCollection || undefined,
      custom_fields: Array.isArray(checkoutConfig.customFields) && checkoutConfig.customFields.length
        ? checkoutConfig.customFields
        : undefined,
      custom_text: isPlainObject(checkoutConfig.customText) && Object.keys(checkoutConfig.customText).length
        ? checkoutConfig.customText
        : undefined,
      success_url: checkoutConfig.successUrl,
      cancel_url: checkoutConfig.cancelUrl,
      metadata,
      payment_intent_data: {
        metadata
      },
      line_items: [
        {
          price_data: {
            currency: checkoutConfig.currency,
            product_data: stripUndefined({
              name: checkoutConfig.productName,
              description: checkoutConfig.productDescription || undefined
            }),
            unit_amount: checkoutConfig.amount
          },
          quantity: 1
        }
      ]
    });

    const session = await stripeClient.checkout.sessions.create(sessionPayload);

    return res.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      stage: paymentStage,
      amountDisplay: formatMoney(checkoutConfig.amount, checkoutConfig.currency),
      buttonLabel: checkoutConfig.buttonLabel
    });
  } catch (error) {
    console.error('create-checkout-session error:', error && error.message);
    return res.status(500).json({ success: false, error: 'Unable to create checkout session.' });
  }
});

app.get('/api/verify-payment', async (req, res) => {
  try {
    const session = await retrievePaidSession(req.query.session_id);
    const paymentStage = normalizePaymentStage(session?.metadata?.payment_stage);
    let fulfillment = null;
    let fulfillmentError = '';
    let leadSubmission = null;

    try {
      fulfillment = await fulfillMomencePurchaseFromSession(session);
    } catch (error) {
      fulfillmentError = error.message || 'Unable to complete Momence fulfillment.';
      console.error('verify-payment fulfillment error:', fulfillmentError);
    }

    try {
      leadSubmission = await finalizeLeadSubmissionFromSession(session, req);
    } catch (error) {
      console.error('verify-payment lead submission error:', error.message || error);
      leadSubmission = {
        success: false,
        error: error.message || 'Unable to finalise the paid submission.'
      };
    }

    return res.json({
      success: true,
      paid: true,
      fulfilled: Boolean(fulfillment?.success),
      fulfillmentError,
      stage: paymentStage,
      paymentSessionId: session.id,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency
      },
      fulfillment,
      leadSubmission
    });
  } catch (error) {
    console.error('verify-payment error:', error && error.message);
    const statusCode = error && error.code === 'checkout_session_missing' ? 404 : 500;
    return res.status(statusCode).json({ success: false, error: error.message || 'Unable to verify payment session.' });
  }
});

app.get('/api/public-config', (req, res) => {
  return res.json(getPublicClientConfig());
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get(['/app', '/app/*'], (req, res) => {
  const targetPath = req.path.replace(/^\/app/, '') || '/';
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  return res.redirect(301, `${targetPath}${query}`);
});

app.get(['/barre', '/barre/*'], (req, res) => {
  if (!fs.existsSync(CLIENT_APP_INDEX_PATH)) {
    return res.status(404).send('App not found');
  }
  return sendAppIndex(res);
});

app.get(['/influencers', '/influencers/*'], (req, res) => {
  if (!fs.existsSync(CLIENT_APP_INDEX_PATH)) {
    return res.status(404).send('App not found');
  }
  return sendAppIndex(res);
});

app.get(['/schedule-mum', '/schedule-mum/*'], (req, res) => {
  if (!fs.existsSync(CLIENT_APP_INDEX_PATH)) {
    return res.status(404).send('App not found');
  }
  return sendAppIndex(res);
});

app.get(['/schedule-mum-begin', '/schedule-mum-begin/*'], (req, res) => {
  if (!fs.existsSync(CLIENT_APP_INDEX_PATH)) {
    return res.status(404).send('App not found');
  }
  return sendAppIndex(res);
});

app.get(['/schedule-blr', '/schedule-blr/*'], (req, res) => {
  if (!fs.existsSync(CLIENT_APP_INDEX_PATH)) {
    return res.status(404).send('App not found');
  }
  return sendAppIndex(res);
});

app.get(['/test', '/test/*'], (req, res) => {
  if (!fs.existsSync(CLIENT_APP_INDEX_PATH)) {
    return res.status(404).send('App not found');
  }
  return sendAppIndex(res);
});

app.get(['/thank-you', '/thank-you/*'], (req, res) => {
  if (!fs.existsSync(CLIENT_APP_INDEX_PATH)) {
    return res.status(404).send('App not found');
  }
  return sendAppIndex(res);
});

app.get(['/', '/index.html'], (req, res, next) => {
  if (!fs.existsSync(CLIENT_APP_INDEX_PATH)) {
    return next();
  }

  return sendAppIndex(res);
});

app.post('/api/partial-lead', async (req, res) => {
  try {
    const partialLead = sanitizePartialLeadPayload(req.body);

    if (!partialLead) {
      return res.status(202).json({
        success: true,
        skipped: true,
        message: 'No meaningful draft data to persist.'
      });
    }

    const supabaseResult = await supabaseLeadStore.savePartialLead(
      {
        ...partialLead,
        session_id: partialLead.session_id || getClientIp(req)
      },
      {
        ip_address: getClientIp(req),
        user_agent: req.get('user-agent') || ''
      }
    );

    return res.json({
      success: true,
      saved: Boolean(supabaseResult.success),
      draftId: partialLead.draft_id
    });
  } catch (error) {
    console.error('Error saving partial lead:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unable to save partial lead.'
    });
  }
});

app.get('/api/schedule/sessions', async (req, res) => {
  try {
    const sessionsPayload = await scheduleService.getSessions({
      startDate: sanitizeText(req.query.startDate, 20),
      endDate: sanitizeText(req.query.endDate, 20),
      center: sanitizeText(req.query.center, 120),
      locationId: sanitizeText(req.query.locationId, 40),
      type: sanitizeText(req.query.type, 80)
    });

    return res.json({
      success: true,
      ...sessionsPayload,
      fallbackUrl: getPublicClientConfig().scheduleUrl
    });
  } catch (error) {
    console.error('Error loading schedule sessions:', error);
    return res.status(503).json({
      success: false,
      error: error.message || 'Unable to load the schedule right now.',
      fallbackUrl: getPublicClientConfig().scheduleUrl
    });
  }
});

app.post('/api/submit-lead', applySubmissionRateLimit, async (req, res) => {
  try {
    const validation = validateLeadPayload(req.body);
    const bypassPayment = parseBoolean(req.body?.bypassPayment || req.body?.bypass_payment, false);

    if (validation.isBot) {
      return res.status(202).json({
        success: true,
        id: 'filtered',
        redirectUrl: getPublicClientConfig().redirectUrl
      });
    }

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed.',
        fieldErrors: validation.fieldErrors
      });
    }

    if (!bypassPayment && !validation.data.payment_session_id) {
      return res.status(400).json({
        success: false,
        error: 'Payment is required before submitting.',
        fieldErrors: {
          payment: 'Complete payment before submitting your request.'
        }
      });
    }

    if (!bypassPayment) {
      try {
        await retrievePaidSession(validation.data.payment_session_id);
      } catch (paymentError) {
        return res.status(400).json({
          success: false,
          error: paymentError.message || 'Payment could not be verified.',
          fieldErrors: {
            payment: paymentError.message || 'Payment could not be verified.'
          }
        });
      }
    }

    const leadData = buildLeadRecord({
      ...validation.data,
      source_form: bypassPayment ? 'physique57-test-bypass' : 'paid-trial-form',
      payment_bypass: bypassPayment ? 'true' : ''
    });
    const submissionResult = await processLeadSubmission(leadData, req);

    return res.status(200).json(submissionResult);
  } catch (error) {
    console.error('Error submitting lead:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An unexpected error occurred.'
    });
  }
});

app.post('/api/submit-barre-lead', applySubmissionRateLimit, async (req, res) => {
  try {
    const validation = validateLeadPayload(req.body);

    if (validation.isBot) {
      return res.status(202).json({
        success: true,
        id: 'filtered',
        redirectUrl: getPublicClientConfig().redirectUrl
      });
    }

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed.',
        fieldErrors: validation.fieldErrors
      });
    }

    // Barre submissions don't require payment - remove that check
    const leadData = buildLeadRecord({
      ...validation.data,
      source_form: 'barre-trial-form',
      class_format: 'Barre 57'
    });

    let momenceSyncResult = { success: true, error: '' };
    
    // Store Barre lead data
    const storeResult = await supabaseLeadStore.saveBarreLeadData(leadData, {
      ip_address: getClientIp(req),
      user_agent: req.get('user-agent') || ''
    });

    if (!storeResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Unable to save your trial request. Please try again.'
      });
    }

    // Standard Barre submissions only create the Momence lead for team follow-up.
    try {
      await submitToMomence(leadData);
    } catch (error) {
      momenceSyncResult = {
        success: false,
        error: error.message || 'Unable to submit to Momence.'
      };
      console.error('Momence sync failed for Barre:', momenceSyncResult.error);
    }

    if (!momenceSyncResult.success) {
      return res.status(200).json({
        success: true,
        stored: true,
        momenceSynced: false,
        event_id: leadData.event_id,
        warning: 'Your trial request was saved, but we had an issue notifying the studio. Please contact us to confirm.',
        error: 'Your trial request was saved, but we had an issue notifying the studio. Please contact us to confirm.',
        detail: momenceSyncResult.error,
        redirectUrl: getPublicClientConfig().redirectUrl
      });
    }

    try {
      const metaResult = await sendMetaLeadEvent(leadData, req);
      if (metaResult.sent) {
        console.log(`Meta Conversions API event sent for Barre: ${metaResult.eventId}`);
      }
    } catch (error) {
      console.error('Meta Conversions API send failed for Barre:', error.message);
    }

    return res.json({
      success: true,
      id: leadData.id,
      event_id: leadData.event_id,
      momenceSynced: true,
      redirectUrl: getPublicClientConfig().redirectUrl
    });
  } catch (error) {
    console.error('Error submitting Barre lead:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An unexpected error occurred.'
    });
  }
});

app.post('/api/submit-influencer-lead', applySubmissionRateLimit, async (req, res) => {
  try {
    const validation = validateLeadPayload(req.body);

    if (validation.isBot) {
      return res.status(202).json({
        success: true,
        id: 'filtered',
        redirectUrl: getPublicClientConfig().scheduleUrl
      });
    }

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed.',
        fieldErrors: validation.fieldErrors
      });
    }

    const leadData = buildLeadRecord({
      ...validation.data,
      source_form: 'influencer-barre-form',
      class_format: 'Barre 57'
    });

    const storeResult = await supabaseLeadStore.saveBarreLeadData(leadData, {
      ip_address: getClientIp(req),
      user_agent: req.get('user-agent') || ''
    });

    if (!storeResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Unable to save your trial request. Please try again.'
      });
    }

    try {
      await submitToMomence(leadData, {
        sourceId: process.env.MOMENCE_INFLUENCER_SOURCE_ID || '201918'
      });
    } catch (error) {
      console.error('Momence lead webhook failed for influencer Barre:', error.message);
      return res.status(502).json({
        success: false,
        stored: true,
        momenceSynced: false,
        event_id: leadData.event_id,
        error: 'Your details were saved, but we could not notify the studio team. Please try again or contact the studio directly.',
        detail: error.message || 'Unable to submit to Momence.'
      });
    }

    try {
      const metaResult = await sendMetaLeadEvent(leadData, req);
      if (metaResult.sent) {
        console.log(`Meta Conversions API event sent for influencer Barre: ${metaResult.eventId}`);
      }
    } catch (error) {
      console.error('Meta Conversions API send failed for influencer Barre:', error.message);
    }

    let momenceSyncResult = { success: false, error: '' };
    try {
      momenceSyncResult = await provisionInfluencerMembership(leadData);
    } catch (error) {
      console.error('Studio Complimentary Class provisioning failed for influencer Barre:', error.message);
      momenceSyncResult = {
        success: false,
        error: error.message || 'Unable to add Studio Complimentary Class in Momence.'
      };
    }

    const schedule = await getScheduleForLead(leadData, req);

    return res.json(buildInfluencerSubmissionSuccessPayload({
      leadData,
      momenceSyncResult,
      schedule,
      fallbackRedirectUrl: getPublicClientConfig().scheduleUrl
    }));
  } catch (error) {
    console.error('Error submitting influencer Barre lead:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An unexpected error occurred.'
    });
  }
});

app.post('/api/sheets/setup', requireAdmin, async (req, res) => {
  try {
    await googleSheets.setupHeaders();
    res.json({ success: true, message: 'Headers setup successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/sheets/test', requireAdmin, async (req, res) => {
  try {
    const connected = await googleSheets.testConnection();
    res.json({ success: connected, message: connected ? 'Connected' : 'Failed to connect' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

if (require.main === module) {
  portfinder.basePort = process.env.PORT || 3000;
  portfinder.getPort((err, availablePort) => {
    if (err) {
      console.error('Error finding available port:', err);
      process.exit(1);
    }

    app.listen(availablePort, async () => {
      console.log(`Server is running on port ${availablePort}`);
      console.log(`App: http://localhost:${availablePort}/`);
      console.log(`Health: http://localhost:${availablePort}/health`);

      if (supabaseLeadStore.isConfigured) {
        console.log(`Supabase lead storage enabled (${supabaseLeadStore.config.schema}.${supabaseLeadStore.config.submissionsTable})`);
      } else {
        console.log(`Supabase lead storage disabled: ${supabaseLeadStore.status.reason}`);
      }

      if (googleSheets.isConfigured) {
        console.log('Testing Google Sheets connection...');
        const connected = await googleSheets.testConnection();
        console.log(connected ? 'Google Sheets ready for automatic sync' : 'Google Sheets connection failed');
      } else {
        console.log('Google Sheets integration disabled. Set environment variables to enable.');
      }
    });
  });
}

module.exports = app;
module.exports.app = app;
module.exports.validateLeadPayload = validateLeadPayload;
module.exports.MomencePublicApiClient = MomencePublicApiClient;
module.exports.buildOpenBarreMembershipConfig = buildOpenBarreMembershipConfig;
module.exports.buildStudioComplimentaryClassMembershipConfig = buildStudioComplimentaryClassMembershipConfig;
module.exports.buildMomenceLeadRequestPayload = buildMomenceLeadRequestPayload;
module.exports.buildInfluencerSubmissionSuccessPayload = buildInfluencerSubmissionSuccessPayload;
module.exports.normalizePhoneDigits = normalizePhoneDigits;
module.exports.processLeadSubmission = processLeadSubmission;
module.exports.provisionOpenBarreMembership = provisionOpenBarreMembership;
module.exports.provisionInfluencerMembership = provisionInfluencerMembership;
module.exports.provisionOpenBarreViaSupabase = provisionOpenBarreViaSupabase;
module.exports.resolveScheduleLocationIds = resolveScheduleLocationIds;
module.exports.buildStudioSchedulePageUrl = buildStudioSchedulePageUrl;
module.exports.getScheduleForLead = getScheduleForLead;
