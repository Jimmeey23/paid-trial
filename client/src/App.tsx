import { useEffect, useState } from "react"
import { Analytics } from "@vercel/analytics/react"
import { Physique57SignUpForm } from "@/components/physique57-sign-up-form"
import { Barre57TrialForm } from "@/components/barre57-trial-form"
import { CombinedTrialForm } from "@/components/combined-trial-form"
import { KidsConsentPage } from "@/components/kids-consent-page"
import { KidsTrialForm } from "@/components/kids-trial-form"
import { ScheduleEmbed } from "@/components/schedule-embed"
import { ThankYouPage } from "@/components/thank-you-page"
import { readTrialSuccessPayload } from "@/lib/submission-success"

const BRAND_LOGO_URL = "/p57-assets/physique57-logo.jpg"
const BRAND_SITE_URL = "https://www.physique57.in"
const EMPTY_SCHEDULE_FILTER_IDS: string[] = []
const BEGINNER_SCHEDULE_TAG_IDS = ["284832"]
const RESPOND_IO_WIDGET_ID = "respondio__widget"
const RESPOND_IO_WIDGET_SRC = "https://cdn.respond.io/webchat/widget/widget.js?cId=5a66956c79c60cad45c3cae8d3895e1"

declare global {
  interface Window {
    __respond_settings?: {
      identifier: string
      firstName?: string
      lastName?: string
      phone?: string
      email?: string
      countryCode?: string
      custom_fields?: Record<string, string>
    }
  }
}

const routeMeta = {
  default: {
    title: "Physique 57 India | Book Your Studio Session",
    description:
      "Book your Physique 57 India studio session and explore premium boutique fitness experiences across Barre, Strength Lab, and powerCycle.",
    name: "Physique 57 Studio Session Form",
  },
  test: {
    title: "Physique 57 India | Test Submission",
    description:
      "Internal testing route for Physique 57 India submissions with ₹1 checkout for powerCycle and Strength Lab.",
    name: "Physique 57 Test Form",
  },
  barre: {
    title: "Barre 57 | Book Your Complimentary Class",
    description:
      "Book your complimentary Barre 57 class and discover Physique 57 India's signature boutique fitness experience.",
    name: "Barre 57 Complimentary Class Form",
  },
  maiaBarre: {
    title: "Maia Sethna x Physique 57",
    description: "Transform your body with our signature method. Experience the Physique 57 difference.",
    name: "Maia Sethna x Physique 57 Barre Form",
  },
  influencers: {
    title: "Physique 57 India | Influencer Barre Experience",
    description:
      "Claim your Studio Complimentary Class and view the latest Barre 57 schedule at your preferred Physique 57 India studio.",
    name: "Physique 57 Influencer Barre Form",
  },
  kids: {
    title: "Physique 57 Juniors | Kids Strength & Agility Program",
    description:
      "Register for Physique 57 Juniors at Physique 57 India and choose your preferred Bandra or Kemps Corner batch.",
    name: "Physique 57 Juniors Registration Form",
  },
  kidsMumTribe: {
    title: "Physique 57 X The Mum Tribe",
    description:
      "Tuesday, 14 July, 2026 at 4:30pm. Taught by Simonelle De Vitre. Venue: Physique 57, Bandra.",
    name: "Physique 57 X The Mum Tribe",
  },
  kidsConsent: {
    title: "Physique 57 Juniors | Consent Form",
    description:
      "Review the Physique 57 Juniors release, indemnity, privacy consent, and class policy terms before signing.",
    name: "Physique 57 Juniors Consent Form",
  },
  scheduleMum: {
    title: "Physique 57 India | Schedule Mum",
    description: "View the Physique 57 India Momence schedule for Mum.",
    name: "Physique 57 Schedule Mum",
  },
  scheduleMumBegin: {
    title: "Physique 57 India | Beginner Schedule Mum",
    description: "View beginner-friendly Physique 57 India Momence classes for Mum.",
    name: "Physique 57 Beginner Schedule Mum",
  },
  scheduleBlr: {
    title: "Physique 57 India | Schedule Bengaluru",
    description: "View the Physique 57 India Momence schedule for Bengaluru.",
    name: "Physique 57 Schedule Bengaluru",
  },
  combined: {
    title: "Physique 57 India | All Formats Trial",
    description:
      "Book a free trial class at Physique 57 India and choose from Barre 57, powerCycle, or Strength Lab at your preferred studio.",
    name: "Physique 57 All Formats Trial Form",
  },
  thankYou: {
    title: "Thank You | Physique 57 India Request",
    description:
      "Your Physique 57 India request has been received. Explore upcoming Signature Experiences for the week ahead.",
    name: "Physique 57 Thank You",
  },
} as const

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null

  if (!element) {
    element = document.createElement("meta")
    const [attrName, attrValue] = selector
      .replace("meta[", "")
      .replace("]", "")
      .split("=")
      .map((part) => part.replace(/['\"]/g, ""))

    if (attrName && attrValue) {
      element.setAttribute(attrName, attrValue)
    }
    document.head.appendChild(element)
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element?.setAttribute(key, value)
  })
}

function upsertLink(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector(selector) as HTMLLinkElement | null

  if (!element) {
    element = document.createElement("link")
    const [attrName, attrValue] = selector
      .replace("link[", "")
      .replace("]", "")
      .split("=")
      .map((part) => part.replace(/['\"]/g, ""))

    if (attrName && attrValue) {
      element.setAttribute(attrName, attrValue)
    }
    document.head.appendChild(element)
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element?.setAttribute(key, value)
  })
}

function upsertJsonLdScript(scriptId: string, payload: Record<string, unknown>) {
  let element = document.head.querySelector(`script[data-schema-id='${scriptId}']`) as HTMLScriptElement | null

  if (!element) {
    element = document.createElement("script")
    element.type = "application/ld+json"
    element.setAttribute("data-schema-id", scriptId)
    document.head.appendChild(element)
  }

  element.textContent = JSON.stringify(payload)
}

function normalizeRespondCenter(center = "") {
  const normalizedCenter = center.trim().toLowerCase()
  if (!normalizedCenter) return ""
  if (normalizedCenter.includes("supreme") || normalizedCenter.includes("bandra")) return "Bandra(W), Mumbai"
  if (normalizedCenter.includes("kwality") || normalizedCenter.includes("kemps")) return "Kemps Corner, Mumbai"
  if (normalizedCenter.includes("lavelle")) return "Lavelle Rd, B'luru"
  if (normalizedCenter.includes("indiranagar")) return "Indiranagar, B'luru"
  return center
}

function normalizeRespondClassType(classType = "") {
  const normalizedClassType = classType.trim().toLowerCase()
  if (!normalizedClassType) return ""
  if (normalizedClassType.includes("barre")) return "Barre"
  if (normalizedClassType.includes("powercycle")) return "powerCycle"
  if (normalizedClassType.includes("strength")) return "Strength Lab!"
  return classType
}

function resolveRespondLeadSource(sourceForm = "") {
  const normalizedSourceForm = sourceForm.trim().toLowerCase()
  if (normalizedSourceForm.includes("influencer")) return "Influencer Marketing"
  if (normalizedSourceForm.includes("barre")) return "Website Barre"
  if (normalizedSourceForm.includes("kids")) return "Website Kids"
  return "Website Paid"
}

function installRespondIoWidget() {
  if (typeof window === "undefined" || document.getElementById(RESPOND_IO_WIDGET_ID)) {
    return
  }

  const successPayload = readTrialSuccessPayload()
  const email = successPayload?.email?.trim()
  const phone = successPayload?.phoneNumber?.trim()
  const identifier = email || phone

  if (identifier) {
    const customFields = Object.fromEntries(
      Object.entries({
        event_id: successPayload?.eventId || successPayload?.leadTracking?.event_id,
        source_form: successPayload?.sourceForm,
        lead_source: resolveRespondLeadSource(successPayload?.sourceForm || ""),
        center: normalizeRespondCenter(successPayload?.studioBackendName || successPayload?.studioName || ""),
        class_type: normalizeRespondClassType(successPayload?.classType || successPayload?.formatName || ""),
        utm_source: successPayload?.leadTracking?.utm_source,
        utm_campaign: successPayload?.leadTracking?.utm_campaign,
      }).filter(([, value]) => typeof value === "string" && value.trim())
    ) as Record<string, string>

    window.__respond_settings = {
      identifier,
      firstName: successPayload?.firstName || undefined,
      lastName: successPayload?.lastName || undefined,
      phone: phone || undefined,
      email: email || undefined,
      countryCode: successPayload?.phoneCountry || "IN",
      ...(Object.keys(customFields).length ? { custom_fields: customFields } : {}),
    }
  }

  const script = document.createElement("script")
  script.id = RESPOND_IO_WIDGET_ID
  script.src = RESPOND_IO_WIDGET_SRC
  script.async = true
  document.body.appendChild(script)
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const isBarreRoute = currentPath === "/barre" || currentPath.startsWith("/barre/")
  const isInfluencersRoute = currentPath === "/influencers" || currentPath.startsWith("/influencers/")
  const isKidsRoute = currentPath === "/kids" || currentPath.startsWith("/kids/")
  const isKidsMumTribeRoute = currentPath === "/kids-themumtribe" || currentPath.startsWith("/kids-themumtribe/")
  const isKidsConsentRoute = currentPath === "/kids-consent" || currentPath.startsWith("/kids-consent/")
  const isTestRoute = currentPath === "/test" || currentPath.startsWith("/test/")
  const isScheduleMumRoute = currentPath === "/schedule-mum" || currentPath.startsWith("/schedule-mum/")
  const isScheduleMumBeginRoute = currentPath === "/schedule-mum-begin" || currentPath.startsWith("/schedule-mum-begin/")
  const isScheduleBlrRoute = currentPath === "/schedule-blr" || currentPath.startsWith("/schedule-blr/")
  const isCombinedRoute = currentPath === "/new" || currentPath.startsWith("/new/")
  const isThankYouRoute = currentPath === "/thank-you" || currentPath.startsWith("/thank-you/")
  const searchParams = new URLSearchParams(window.location.search)
  const scheduleLocationId = searchParams.get("locationId")
  const isMaiaBarreCampaign =
    isBarreRoute &&
    searchParams.get("utm_source")?.trim().toLowerCase() === "influencer" &&
    searchParams.get("utm_campaign")?.trim().toLowerCase() === "maia"
  const shouldRenderAnalytics = !["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)

  useEffect(() => {
    installRespondIoWidget()
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    const meta = isMaiaBarreCampaign
      ? routeMeta.maiaBarre
      : isBarreRoute
      ? routeMeta.barre
      : isInfluencersRoute
        ? routeMeta.influencers
        : isKidsRoute
          ? routeMeta.kids
          : isKidsMumTribeRoute
            ? routeMeta.kidsMumTribe
            : isKidsConsentRoute
              ? routeMeta.kidsConsent
              : isTestRoute
                ? routeMeta.test
                : isScheduleMumRoute
                  ? routeMeta.scheduleMum
                  : isScheduleMumBeginRoute
                    ? routeMeta.scheduleMumBegin
                    : isScheduleBlrRoute
                      ? routeMeta.scheduleBlr
                      : isCombinedRoute
                        ? routeMeta.combined
                        : isThankYouRoute
                          ? routeMeta.thankYou
                          : routeMeta.default
    const pageUrl = typeof window !== "undefined" ? window.location.href : BRAND_SITE_URL

    document.title = meta.title

    upsertMeta("meta[name='description']", { name: "description", content: meta.description })
    upsertMeta("meta[property='og:title']", { property: "og:title", content: meta.title })
    upsertMeta("meta[property='og:description']", { property: "og:description", content: meta.description })
    upsertMeta("meta[property='og:image']", { property: "og:image", content: BRAND_LOGO_URL })
    upsertMeta("meta[property='og:image:alt']", { property: "og:image:alt", content: "Physique 57 India logo" })
    upsertMeta("meta[property='og:image:type']", { property: "og:image:type", content: "image/jpeg" })
    upsertMeta("meta[property='og:image:width']", { property: "og:image:width", content: "800" })
    upsertMeta("meta[property='og:image:height']", { property: "og:image:height", content: "600" })
    upsertMeta("meta[property='og:logo']", { property: "og:logo", content: BRAND_LOGO_URL })
    upsertMeta("meta[name='logo']", { name: "logo", content: BRAND_LOGO_URL })
    upsertMeta("meta[name='twitter:title']", { name: "twitter:title", content: meta.title })
    upsertMeta("meta[name='twitter:description']", { name: "twitter:description", content: meta.description })
    upsertMeta("meta[name='twitter:image']", { name: "twitter:image", content: BRAND_LOGO_URL })
    upsertMeta("meta[name='twitter:image:alt']", { name: "twitter:image:alt", content: "Physique 57 India logo" })
    upsertLink("link[rel='icon']", { rel: "icon", type: "image/png", href: BRAND_LOGO_URL })
    upsertLink("link[rel='shortcut icon']", { rel: "shortcut icon", href: BRAND_LOGO_URL })
    upsertLink("link[rel='apple-touch-icon']", { rel: "apple-touch-icon", href: BRAND_LOGO_URL })
    upsertJsonLdScript("route-webpage", {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: meta.name,
      headline: meta.title,
      description: meta.description,
      url: pageUrl,
      isPartOf: {
        "@type": "WebSite",
        name: "Physique 57 India",
        url: BRAND_SITE_URL,
      },
      about: {
        "@type": "Organization",
        name: "Physique 57 India",
        url: BRAND_SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: BRAND_LOGO_URL,
        },
      },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: BRAND_LOGO_URL,
      },
    })
  }, [currentPath, isMaiaBarreCampaign, isBarreRoute, isInfluencersRoute, isKidsRoute, isKidsMumTribeRoute, isKidsConsentRoute, isTestRoute, isScheduleMumRoute, isScheduleMumBeginRoute, isScheduleBlrRoute, isCombinedRoute, isThankYouRoute])

  const pageContent = isBarreRoute
    ? <Barre57TrialForm />
    : isInfluencersRoute
      ? <Barre57TrialForm variant="influencer" />
      : isKidsRoute
        ? <KidsTrialForm />
        : isKidsMumTribeRoute
          ? (
            <KidsTrialForm
              submitEndpoint="/api/submit-kids-mum-tribe-lead"
              hideBatchSelection
              lockedStudioName="Supreme HQ, Bandra"
              lockedStudioDisplayName="Physique 57, Bandra"
              formTitle="Physique 57 X The Mum Tribe"
              formDescription="Tuesday, 14 July, 2026 at 4:30pm. Taught by Simonelle De Vitre."
              formBadge="The Mum Tribe"
              heroEyebrow="Tuesday, 14 July, 2026"
              heroTitle="Physique 57 X The Mum Tribe"
              heroDescription="Join The Mum Tribe for a Physique 57 Juniors session at 4:30pm, taught by Simonelle De Vitre at Physique 57, Bandra."
              heroHighlights={["4:30pm", "Simonelle", "Bandra"]}
              mobileHeroDescription="4:30pm. Taught by Simonelle De Vitre. Venue: Physique 57, Bandra."
              successSourceForm="kids-mum-tribe-form"
              eventTitle="Physique 57 X The Mum Tribe"
              eventDescription="Tuesday, 14 July, 2026 at 4:30pm. Taught by Simonelle De Vitre."
              eventDateTime="Tuesday, 14 July, 2026 at 4:30pm"
              eventInstructor="Simonelle De Vitre"
              eventVenue="Physique 57, Bandra"
            />
          )
          : isKidsConsentRoute
            ? <KidsConsentPage />
            : isTestRoute
              ? <Physique57SignUpForm testMode />
              : isScheduleMumRoute
                ? <ScheduleEmbed hostId="13752" locationIds={scheduleLocationId ? [scheduleLocationId] : []} />
                : isScheduleMumBeginRoute
                  ? (
                    <ScheduleEmbed
                      hostId="13752"
                      locationIds={scheduleLocationId ? [scheduleLocationId] : []}
                      teacherIds={EMPTY_SCHEDULE_FILTER_IDS}
                      tagIds={BEGINNER_SCHEDULE_TAG_IDS}
                      sessionType="class"
                      hideTags
                      defaultFilter="show-all"
                      locale="en"
                      lockTimezone="Asia/Kolkata"
                    />
                  )
                  : isScheduleBlrRoute
                    ? <ScheduleEmbed hostId="33905" locationIds={["22116"]} />
                    : isCombinedRoute
                      ? <CombinedTrialForm />
                      : isThankYouRoute
                        ? <ThankYouPage />
                        : <Physique57SignUpForm />

  return (
    <>
      {pageContent}
      {shouldRenderAnalytics ? <Analytics /> : null}
    </>
  )
}
