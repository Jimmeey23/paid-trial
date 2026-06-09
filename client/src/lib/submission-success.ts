export const SUCCESS_STORAGE_KEY = "p57_trial_success_payload_v1"
export const SUCCESS_EVENT_FIRED_PREFIX = "p57_trial_success_pixel_fired_"

export interface SuccessScheduleSession {
  id: string
  title: string
  description?: string
  classFormat?: string
  instructorName?: string
  locationId?: string
  locationName?: string
  startsAt: string
  endsAt?: string
  durationMinutes?: number | null
  spotsRemaining?: number | null
  capacity?: number | null
  bookingCount?: number | null
  bookingUrl?: string
  tags?: string[]
}

export interface SuccessScheduleGroup {
  date: string
  items: SuccessScheduleSession[]
}

export interface SuccessSchedule {
  success?: boolean
  schedulePageUrl?: string
  fallbackUrl?: string
  groupedSessions?: SuccessScheduleGroup[]
}

export interface TrialSuccessPayload {
  eventId?: string
  firstName?: string
  studioName?: string
  studioBackendName?: string
  studioLocationId?: string
  formatName?: string
  classType?: string
  childName?: string
  batch?: string
  sourceForm?: string
  statusMessage?: string
  redirectUrl?: string
  schedulePageUrl?: string
  schedule?: SuccessSchedule | null
  leadTracking?: {
    event_id?: string
    utm_campaign?: string
    utm_source?: string
  }
  createdAt: string
}

export function saveTrialSuccessPayload(payload: TrialSuccessPayload) {
  if (typeof window === "undefined") {
    return
  }

  window.sessionStorage.setItem(SUCCESS_STORAGE_KEY, JSON.stringify(payload))
}

export function readTrialSuccessPayload(): TrialSuccessPayload | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const rawPayload = window.sessionStorage.getItem(SUCCESS_STORAGE_KEY)
    return rawPayload ? JSON.parse(rawPayload) as TrialSuccessPayload : null
  } catch {
    return null
  }
}

export function getThankYouUrl() {
  return "/thank-you"
}

export function getSuccessEventFiredKey(eventId: string) {
  return `${SUCCESS_EVENT_FIRED_PREFIX}${eventId}`
}
