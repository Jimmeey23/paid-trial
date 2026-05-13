import { useEffect, useState } from "react"
import { Analytics } from "@vercel/analytics/react"
import { Physique57SignUpForm } from "@/components/physique57-sign-up-form"
import { Barre57TrialForm } from "@/components/barre57-trial-form"
import { ScheduleEmbed } from "@/components/schedule-embed"

const BRAND_LOGO_URL = "https://i.postimg.cc/6Qt8YppB/Photoroom_20251014_101748.png"
const BRAND_SITE_URL = "https://www.physique57.in"

const routeMeta = {
  default: {
    title: "Physique 57 India | Book Your Trial Class Today",
    description:
      "Book your Physique 57 India trial class and explore premium boutique fitness experiences across Barre, Strength Lab, and powerCycle.",
    name: "Physique 57 Trial Form",
  },
  test: {
    title: "Physique 57 India | Test Trial Submission",
    description:
      "Internal testing route for Physique 57 India trial submissions with ₹1 checkout for powerCycle and Strength Lab.",
    name: "Physique 57 Trial Test Form",
  },
  barre: {
    title: "Barre 57 — Book Your Complimentary Trial",
    description:
      "Book your complimentary Barre 57 trial and discover Physique 57 India's signature boutique fitness experience.",
    name: "Barre 57 Trial Form",
  },
  influencers: {
    title: "Physique 57 India | Influencer Barre Experience",
    description:
      "Claim your Open Barre pass and view the latest Barre 57 schedule at your preferred Physique 57 India studio.",
    name: "Physique 57 Influencer Barre Form",
  },
  scheduleMum: {
    title: "Physique 57 India | Schedule Mum",
    description: "View the Physique 57 India Momence schedule for Mum.",
    name: "Physique 57 Schedule Mum",
  },
  scheduleBlr: {
    title: "Physique 57 India | Schedule Bengaluru",
    description: "View the Physique 57 India Momence schedule for Bengaluru.",
    name: "Physique 57 Schedule Bengaluru",
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

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const isBarreRoute = currentPath === "/barre" || currentPath.startsWith("/barre/")
  const isInfluencersRoute = currentPath === "/influencers" || currentPath.startsWith("/influencers/")
  const isTestRoute = currentPath === "/test" || currentPath.startsWith("/test/")
  const isScheduleMumRoute = currentPath === "/schedule-mum" || currentPath.startsWith("/schedule-mum/")
  const isScheduleBlrRoute = currentPath === "/schedule-blr" || currentPath.startsWith("/schedule-blr/")
  const scheduleLocationId = new URLSearchParams(window.location.search).get("locationId")

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    const meta = isBarreRoute
      ? routeMeta.barre
      : isInfluencersRoute
        ? routeMeta.influencers
        : isTestRoute
          ? routeMeta.test
          : isScheduleMumRoute
            ? routeMeta.scheduleMum
            : isScheduleBlrRoute
              ? routeMeta.scheduleBlr
              : routeMeta.default
    const pageUrl = typeof window !== "undefined" ? window.location.href : BRAND_SITE_URL

    document.title = meta.title

    upsertMeta("meta[name='description']", { name: "description", content: meta.description })
    upsertMeta("meta[property='og:title']", { property: "og:title", content: meta.title })
    upsertMeta("meta[property='og:description']", { property: "og:description", content: meta.description })
    upsertMeta("meta[property='og:image']", { property: "og:image", content: BRAND_LOGO_URL })
    upsertMeta("meta[property='og:image:alt']", { property: "og:image:alt", content: "Physique 57 India logo" })
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
  }, [currentPath, isBarreRoute, isInfluencersRoute, isTestRoute, isScheduleMumRoute, isScheduleBlrRoute])

  const pageContent = isBarreRoute
    ? <Barre57TrialForm />
    : isInfluencersRoute
      ? <Barre57TrialForm variant="influencer" />
      : isTestRoute
        ? <Physique57SignUpForm testMode />
        : isScheduleMumRoute
          ? <ScheduleEmbed hostId="13752" locationIds={scheduleLocationId ? [scheduleLocationId] : []} />
          : isScheduleBlrRoute
            ? <ScheduleEmbed hostId="33905" locationIds={["22116"]} />
            : <Physique57SignUpForm />

  return (
    <>
      {pageContent}
      <Analytics />
    </>
  )
}
