export interface PublicClientConfig {
  gaMeasurementId: string
  googleAdsId: string
  googleAdsConversionLabel: string
  googleAdsConversionValue: string | number
  googleAdsConversionCurrency: string
  metaPixelId: string
  snapPixelId: string
  gtmId: string
  apiBaseUrl: string
  scheduleUrl: string
  redirectUrl: string
  defaultPaymentStage?: "production" | "testing"
  paymentButtonLabel?: string
  paymentAmountDisplay?: string
  paymentCurrency?: string
  paymentStages?: Record<
    string,
    {
      label?: string
      amountDisplay?: string
      buttonLabel?: string
      description?: string
      membershipName?: string
      membershipId?: number | string
    }
  >
}

const STORAGE_KEY = "trial_form_tracking_v3"
const STORAGE_TIMESTAMP_KEY = "trial_form_tracking_v3_timestamp"

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
    _fbq?: (...args: unknown[]) => void
    snaptr?: (...args: unknown[]) => void
  }
}

function loadExternalScript(src: string) {
  if (!src || typeof document === "undefined") {
    return
  }

  const existingScript = document.querySelector(`script[src="${src}"]`)
  if (existingScript) {
    return
  }

  const script = document.createElement("script")
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

function getCookieValue(name: string) {
  const escapedName = name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&")
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : ""
}

function buildFbcValue(fbclid: string) {
  if (!fbclid) {
    return ""
  }

  return `fb.1.${Date.now()}.${fbclid}`
}

function sameOriginApiUrl(path: string) {
  if (typeof window === "undefined") {
    return path
  }

  return new URL(path, window.location.origin).toString()
}

export async function loadPublicClientConfig(): Promise<PublicClientConfig> {
  const response = await fetch(sameOriginApiUrl("/api/public-config"))
  if (!response.ok) {
    throw new Error("Unable to load public tracking config.")
  }

  return response.json() as Promise<PublicClientConfig>
}

export function initializeTracking(config: PublicClientConfig) {
  if (typeof window === "undefined") {
    return
  }

  if (config.gtmId) {
    const existingGtmScript = document.querySelector(`script[src="https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(config.gtmId)}"]`)

    if (!existingGtmScript) {
      window.dataLayer = window.dataLayer || []
      window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" })
      loadExternalScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(config.gtmId)}`)
    }
  }

  if (config.gaMeasurementId || config.googleAdsId) {
    loadExternalScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.gaMeasurementId || config.googleAdsId)}`)
    window.dataLayer = window.dataLayer || []
    window.gtag = window.gtag || function gtagProxy(...args: unknown[]) {
      window.dataLayer?.push(args)
    }
    window.gtag("js", new Date())

    if (config.gaMeasurementId) {
      window.gtag("config", config.gaMeasurementId)
    }

    if (config.googleAdsId) {
      window.gtag("config", config.googleAdsId)
    }
  }

  if (config.metaPixelId && !window.fbq) {
    ;((windowObject, documentObject, tagName, scriptSource) => {
      type FbqShim = ((...args: unknown[]) => void) & {
        callMethod?: (...innerArgs: unknown[]) => void
        queue?: unknown[][]
        push?: (...args: unknown[]) => void
        loaded?: boolean
        version?: string
      }

      const fbqProxy: FbqShim = function (...args: unknown[]) {
        if (typeof fbqProxy.callMethod === "function") {
          fbqProxy.callMethod(...args)
          return
        }

        fbqProxy.queue = fbqProxy.queue || []
        fbqProxy.queue.push(args)
      }

      windowObject.fbq = fbqProxy
      if (!windowObject._fbq) {
        windowObject._fbq = fbqProxy
      }

      fbqProxy.push = fbqProxy
      fbqProxy.loaded = true
      fbqProxy.version = "2.0"
      fbqProxy.queue = []

      const script = documentObject.createElement(tagName) as HTMLScriptElement
      script.async = true
      script.src = scriptSource
      const firstScript = documentObject.getElementsByTagName(tagName)[0]
      firstScript.parentNode?.insertBefore(script, firstScript)
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js")

    const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq
    fbq?.("init", config.metaPixelId)
    fbq?.("track", "PageView")
  }

  if (config.snapPixelId && !window.snaptr) {
    ;((windowObject, documentObject, tagName, scriptSource) => {
      const snapProxy = function (...args: unknown[]) {
        snapProxy.queue.push(args)
      } as ((...args: unknown[]) => void) & { queue: unknown[][] }

      snapProxy.queue = []
      windowObject.snaptr = snapProxy

      const script = documentObject.createElement(tagName) as HTMLScriptElement
      script.async = true
      script.src = scriptSource
      const firstScript = documentObject.getElementsByTagName(tagName)[0]
      firstScript.parentNode?.insertBefore(script, firstScript)
    })(window, document, "script", "https://sc-static.net/scevent.min.js")

    const snaptr = (window as Window & { snaptr?: (...args: unknown[]) => void }).snaptr
    snaptr?.("init", config.snapPixelId)
    snaptr?.("track", "PAGE_VIEW")
  }
}

export function getSubmissionTrackingPayload() {
  if (typeof window === "undefined") {
    return {}
  }

  const params = new URLSearchParams(window.location.search)
  const currentParams = {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_content: params.get("utm_content") || "",
    utm_id: params.get("utm_id") || "",
    utm_term: params.get("utm_term") || "",
    gclid: params.get("gclid") || "",
    fbclid: params.get("fbclid") || "",
    msclkid: params.get("msclkid") || "",
    ttclid: params.get("ttclid") || "",
    gbraid: params.get("gbraid") || "",
    wbraid: params.get("wbraid") || "",
    fbp: getCookieValue("_fbp") || "",
    fbc: getCookieValue("_fbc") || buildFbcValue(params.get("fbclid") || ""),
  }

  const hasFreshParams = Object.values(currentParams).some(Boolean)
  if (hasFreshParams) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentParams))
      window.localStorage.setItem(STORAGE_TIMESTAMP_KEY, new Date().toISOString())
    } catch {
      // Ignore storage failures.
    }
  }

  let resolvedParams = currentParams
  if (!hasFreshParams) {
    try {
      const storedParams = window.localStorage.getItem(STORAGE_KEY)
      const storedTimestamp = window.localStorage.getItem(STORAGE_TIMESTAMP_KEY)
      if (storedParams && storedTimestamp) {
        const daysSinceStored = (Date.now() - new Date(storedTimestamp).getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceStored <= 30) {
          resolvedParams = JSON.parse(storedParams) as typeof currentParams
        }
      }
    } catch {
      // Ignore storage failures.
    }
  }

  return {
    ...resolvedParams,
    landing_page: window.location.href,
    referrer: document.referrer || "",
  }
}

export function trackLeadSubmission(config: PublicClientConfig | null, leadPayload: { event_id?: string; utm_campaign?: string; utm_source?: string }) {
  if (!config || typeof window === "undefined") {
    return
  }

  if (typeof window.fbq === "function" && config.metaPixelId) {
    window.fbq("track", "Lead", {
      content_name: leadPayload.utm_campaign || "trial_signup",
      content_category: leadPayload.utm_source || "direct",
    }, {
      eventID: leadPayload.event_id,
    })
  }

  if (typeof window.gtag === "function" && config.googleAdsId && config.googleAdsConversionLabel) {
    window.gtag("event", "conversion", {
      send_to: `${config.googleAdsId}/${config.googleAdsConversionLabel}`,
      value: Number(config.googleAdsConversionValue || 0) || 0,
      currency: config.googleAdsConversionCurrency || "INR",
      transaction_id: leadPayload.event_id,
    })
  }

  if (typeof window.snaptr === "function" && config.snapPixelId) {
    window.snaptr("track", "SIGN_UP", {
      description: leadPayload.utm_campaign || "trial_signup",
      sign_up_method: leadPayload.utm_source || "direct",
      client_dedup_id: leadPayload.event_id,
    })
  }
}
