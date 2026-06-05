const { createClient } = require('@supabase/supabase-js');

const DEFAULT_SUBMISSIONS_TABLE = 'physique57_trial_form_submissions';
const DEFAULT_PARTIALS_TABLE = 'physique57_trial_form_partials';
const DEFAULT_SCHEMA = 'public';

function isPlaceholderSecret(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  return !normalized || normalized.includes('your_') || normalized.includes('placeholder') || normalized === 'changeme';
}

function sanitizeIdentifier(value, fallback) {
  const sanitized = String(value || '').trim();
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(sanitized) ? sanitized : fallback;
}

function safeIpAddress(value = '') {
  const candidate = String(value || '').trim();

  if (!candidate) {
    return null;
  }

  const normalized = candidate.startsWith('::ffff:') ? candidate.slice(7) : candidate;

  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(normalized) || /^[0-9a-f:]+$/i.test(normalized)) {
    return normalized;
  }

  return null;
}

function asBoolean(value) {
  return value === true || value === 'accepted' || value === 'true' || value === '1';
}

function calculateCompletionPercent(partialData) {
  const checkpoints = [
    partialData.firstName,
    partialData.lastName,
    partialData.email,
    partialData.phoneNumber,
    partialData.center,
    partialData.type,
    partialData.time,
    partialData.waiverAccepted
  ];
  const completed = checkpoints.filter((value) => Boolean(String(value || '').trim())).length;
  return Number(((completed / checkpoints.length) * 100).toFixed(2));
}

class SupabaseLeadStore {
  constructor() {
    this.config = {
      url: String(process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || '').trim(),
      serviceRoleKey: String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim(),
      schema: sanitizeIdentifier(process.env.SUPABASE_DB_SCHEMA, DEFAULT_SCHEMA),
      submissionsTable: sanitizeIdentifier(process.env.SUPABASE_SUBMISSIONS_TABLE, DEFAULT_SUBMISSIONS_TABLE),
      partialsTable: sanitizeIdentifier(process.env.SUPABASE_PARTIALS_TABLE, DEFAULT_PARTIALS_TABLE)
    };

    this.status = this.getConfigurationStatus();
    this.isConfigured = this.status.ok;
    this.client = this.isConfigured
      ? createClient(this.config.url, this.config.serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        },
        db: {
          schema: this.config.schema
        }
      })
      : null;
  }

  getConfigurationStatus() {
    if (isPlaceholderSecret(this.config.url)) {
      return { ok: false, reason: 'Supabase URL is missing or still set to a placeholder value' };
    }

    if (!/^https:\/\//i.test(this.config.url)) {
      return { ok: false, reason: 'Supabase URL is invalid: expected an https:// project URL' };
    }

    if (isPlaceholderSecret(this.config.serviceRoleKey)) {
      return { ok: false, reason: 'Supabase service role key is missing or still set to a placeholder value' };
    }

    return { ok: true, reason: '' };
  }

  async saveSubmittedLead(leadData, requestMeta = {}) {
    if (!this.isConfigured || !this.client) {
      return { success: false, skipped: true, reason: this.status.reason || 'Supabase not configured' };
    }

    const record = {
      event_id: leadData.event_id || null,
      external_lead_id: leadData.id,
      source_form: leadData.source_form || 'trial-form',
      status: 'submitted',
      first_name: leadData.firstName || '',
      last_name: leadData.lastName || '',
      email: leadData.email || '',
      phone_number: leadData.phoneNumber || '',
      phone_country: leadData.phoneCountry || 'IN',
      preferred_time: leadData.time || '',
      studio_location: leadData.center || '',
      class_format: leadData.type || '',
      waiver_accepted: asBoolean(leadData.waiverAccepted),
      utm_source: leadData.utm_source || null,
      utm_medium: leadData.utm_medium || null,
      utm_campaign: leadData.utm_campaign || null,
      utm_content: leadData.utm_content || null,
      utm_id: leadData.utm_id || null,
      utm_term: leadData.utm_term || null,
      gclid: leadData.gclid || null,
      fbclid: leadData.fbclid || null,
      msclkid: leadData.msclkid || null,
      ttclid: leadData.ttclid || null,
      gbraid: leadData.gbraid || null,
      wbraid: leadData.wbraid || null,
      fbp: leadData.fbp || null,
      fbc: leadData.fbc || null,
      landing_page: leadData.landing_page || null,
      referrer: leadData.referrer || null,
      ip_address: safeIpAddress(requestMeta.ip_address),
      user_agent: requestMeta.user_agent || null,
      submitted_at: leadData.timestamp || new Date().toISOString(),
      raw_payload: leadData,
      metadata: {
        draft_id: leadData.draft_id || null,
        session_id: leadData.session_id || null,
        child_name: leadData.childName || null,
        child_age: leadData.childAge ?? null,
        batch: leadData.batch || leadData.batchPreference || null
      }
    };

    const { data, error } = await this.client
      .from(this.config.submissionsTable)
      .upsert(record, { onConflict: 'event_id' })
      .select('id,event_id');

    if (error) {
      throw new Error(`Supabase submitted lead sync failed: ${error.message}`);
    }

    return { success: true, data: data || [], rowCount: Array.isArray(data) ? data.length : 0 };
  }

  async savePartialLead(partialData, requestMeta = {}) {
    if (!this.isConfigured || !this.client) {
      return { success: false, skipped: true, reason: this.status.reason || 'Supabase not configured' };
    }

    const draftId = String(partialData.draft_id || partialData.draftId || '').trim();

    if (!draftId) {
      throw new Error('Partial lead payload is missing draft_id');
    }

    const record = {
      form_session_id: draftId,
      event_id: partialData.event_id || null,
      status: partialData.status || 'in_progress',
      completion_percent: calculateCompletionPercent(partialData),
      last_completed_step: partialData.last_completed_step || null,
      first_name: partialData.firstName || null,
      last_name: partialData.lastName || null,
      email: partialData.email || null,
      phone_number: partialData.phoneNumber || null,
      phone_country: partialData.phoneCountry || 'IN',
      preferred_time: partialData.time || null,
      studio_location: partialData.center || null,
      class_format: partialData.type || null,
      waiver_accepted: asBoolean(partialData.waiverAccepted),
      utm_source: partialData.utm_source || null,
      utm_medium: partialData.utm_medium || null,
      utm_campaign: partialData.utm_campaign || null,
      utm_content: partialData.utm_content || null,
      utm_id: partialData.utm_id || null,
      utm_term: partialData.utm_term || null,
      gclid: partialData.gclid || null,
      fbclid: partialData.fbclid || null,
      msclkid: partialData.msclkid || null,
      ttclid: partialData.ttclid || null,
      gbraid: partialData.gbraid || null,
      wbraid: partialData.wbraid || null,
      fbp: partialData.fbp || null,
      fbc: partialData.fbc || null,
      landing_page: partialData.landing_page || null,
      referrer: partialData.referrer || null,
      ip_address: safeIpAddress(requestMeta.ip_address),
      user_agent: requestMeta.user_agent || null,
      last_seen_at: new Date().toISOString(),
      raw_payload: partialData,
      metadata: {
        session_id: partialData.session_id || null
      }
    };

    const { data, error } = await this.client
      .from(this.config.partialsTable)
      .upsert(record, { onConflict: 'form_session_id' })
      .select('id,form_session_id');

    if (error) {
      throw new Error(`Supabase partial lead sync failed: ${error.message}`);
    }

    return { success: true, data: data || [], rowCount: Array.isArray(data) ? data.length : 0 };
  }

  async markPartialSubmitted(draftId, leadData, submissionRowId = null) {
    if (!draftId) {
      return { success: false, skipped: true, reason: 'No draft_id provided' };
    }

    if (!this.isConfigured || !this.client) {
      return { success: false, skipped: true, reason: this.status.reason || 'Supabase not configured' };
    }

    const { data: existingRow, error: fetchError } = await this.client
      .from(this.config.partialsTable)
      .select('metadata')
      .eq('form_session_id', draftId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Supabase partial lookup failed: ${fetchError.message}`);
    }

    const nextMetadata = {
      ...(existingRow?.metadata || {}),
      submitted_external_lead_id: leadData.id
    };

    const { data, error } = await this.client
      .from(this.config.partialsTable)
      .update({
        status: 'submitted',
        submitted_submission_id: submissionRowId,
        last_seen_at: new Date().toISOString(),
        raw_payload: leadData,
        metadata: nextMetadata
      })
      .eq('form_session_id', draftId)
      .select('id,form_session_id');

    if (error) {
      throw new Error(`Supabase partial lead update failed: ${error.message}`);
    }

    return { success: true, data: data || [], rowCount: Array.isArray(data) ? data.length : 0 };
  }

  async saveBarreLeadData(leadData, requestMeta = {}) {
    if (!this.isConfigured || !this.client) {
      return { success: false, skipped: true, reason: this.status.reason || 'Supabase not configured' };
    }

    const record = {
      event_id: leadData.event_id || null,
      external_lead_id: leadData.id,
      source_form: 'barre-trial-form',
      status: 'submitted',
      first_name: leadData.firstName || '',
      last_name: leadData.lastName || '',
      email: leadData.email || '',
      phone_number: leadData.phoneNumber || '',
      phone_country: leadData.phoneCountry || 'IN',
      studio_location: leadData.center || leadData.studio_location || '',
      class_format: 'Barre 57',
      waiver_accepted: asBoolean(leadData.waiverAccepted),
      utm_source: leadData.utm_source || null,
      utm_medium: leadData.utm_medium || null,
      utm_campaign: leadData.utm_campaign || null,
      utm_content: leadData.utm_content || null,
      utm_id: leadData.utm_id || null,
      utm_term: leadData.utm_term || null,
      gclid: leadData.gclid || null,
      fbclid: leadData.fbclid || null,
      msclkid: leadData.msclkid || null,
      ttclid: leadData.ttclid || null,
      gbraid: leadData.gbraid || null,
      wbraid: leadData.wbraid || null,
      fbp: leadData.fbp || null,
      fbc: leadData.fbc || null,
      landing_page: leadData.landing_page || null,
      referrer: leadData.referrer || null,
      ip_address: safeIpAddress(requestMeta.ip_address),
      user_agent: requestMeta.user_agent || null,
      submitted_at: leadData.timestamp || new Date().toISOString(),
      raw_payload: leadData,
      metadata: {
        draft_id: leadData.draft_id || null,
        session_id: leadData.session_id || null,
        child_name: leadData.childName || null,
        child_age: leadData.childAge ?? null,
        batch: leadData.batch || leadData.batchPreference || null
      }
    };

    const { data, error } = await this.client
      .from('barre57_trial_form_submissions')
      .upsert(record, { onConflict: 'event_id' })
      .select('id,event_id');

    if (error) {
      throw new Error(`Supabase Barre lead sync failed: ${error.message}`);
    }

    return { success: true, data: data || [], rowCount: Array.isArray(data) ? data.length : 0 };
  }
}

module.exports = SupabaseLeadStore;
