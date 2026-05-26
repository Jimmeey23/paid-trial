import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  ExternalLink,
  MapPin,
  Phone,
} from "lucide-react"

import { studios } from "@/data/physique57"
import {
  getSuccessEventFiredKey,
  readTrialSuccessPayload,
  type TrialSuccessPayload,
} from "@/lib/submission-success"
import {
  initializeTracking,
  loadPublicClientConfig,
  trackLeadSubmission,
} from "@/lib/tracking"
import { Button } from "@/components/ui/button"

const BRAND_LOGO_URL = new URL("../assets/physique57-logo.jpg", import.meta.url).href
const FALLBACK_SCHEDULE_URL = "https://momence.com/u/physique-57-india-fffoSp"
const THANK_YOU_HERO_IMAGE = "/p57-assets/p57-barre-group.jpg"
const THANK_YOU_GALLERY_IMAGES = [
  {
    src: "/p57-assets/p57-cycle-close.jpg",
    alt: "Physique 57 powerCycle studio session",
  },
  {
    src: "/p57-assets/p57-strength-color.jpg",
    alt: "Physique 57 Strength Lab studio practice",
  },
  {
    src: "/p57-assets/p57-barre-studio.jpg",
    alt: "Physique 57 barre studio practice",
  },
]

function getScheduleUrl(payload: TrialSuccessPayload | null) {
  if (payload?.schedulePageUrl) {
    return payload.schedulePageUrl
  }

  if (payload?.schedule?.schedulePageUrl) {
    return payload.schedule.schedulePageUrl
  }

  if (payload?.redirectUrl) {
    return payload.redirectUrl
  }

  if (payload?.studioLocationId) {
    return `/schedule-mum?locationId=${encodeURIComponent(payload.studioLocationId)}`
  }

  return FALLBACK_SCHEDULE_URL
}

function getMapEmbedUrl(studio: typeof studios[number] | undefined) {
  if (!studio) {
    return "https://www.google.com/maps?q=Physique%2057%20India%20Mumbai&z=12&output=embed"
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(`${studio.lat},${studio.lng}`)}&z=16&output=embed`
}

function getDirectionsUrl(studio: typeof studios[number] | undefined) {
  if (!studio) {
    return "https://www.google.com/maps/search/?api=1&query=Physique%2057%20India%20Mumbai"
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${studio.lat},${studio.lng}`)}`
}

function StudioMap({
  selectedStudio,
  studioName,
}: {
  selectedStudio: typeof studios[number] | undefined
  studioName: string
}) {
  const mapUrl = getMapEmbedUrl(selectedStudio)
  const directionsUrl = getDirectionsUrl(selectedStudio)

  return (
    <section>
      <div className="mb-8 flex flex-col gap-3 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">Studio location</p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight text-zinc-950">Find your Studio Space</h2>
        </div>
        <Button asChild variant="outline" className="w-fit rounded-none border-zinc-950 px-4 text-zinc-950 hover:bg-zinc-950 hover:text-white">
          <a href={directionsUrl} target="_blank" rel="noreferrer">
            Directions <ExternalLink className="ml-2 h-3.5 w-3.5" />
          </a>
        </Button>
      </div>

      <div className="overflow-hidden border border-zinc-200 bg-zinc-100">
        <iframe
          title={`${studioName} map`}
          src={mapUrl}
          className="h-[460px] w-full border-0 grayscale"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="mt-5 grid gap-4 border-b border-zinc-200 pb-6 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Selected studio</p>
          <h3 className="mt-2 text-xl font-semibold text-zinc-950">{studioName}</h3>
          {selectedStudio?.address ? (
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">{selectedStudio.address}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
          <MapPin className="h-4 w-4 text-zinc-400" />
          {selectedStudio?.neighborhood || "Mumbai"}
        </div>
      </div>
    </section>
  )
}

export function ThankYouPage() {
  const [successPayload] = useState<TrialSuccessPayload | null>(() => readTrialSuccessPayload())

  const selectedStudio = useMemo(() => {
    return studios.find((studio) => (
      studio.name === successPayload?.studioName ||
      studio.backendName === successPayload?.studioBackendName ||
      studio.scheduleLocationId === successPayload?.studioLocationId
    ))
  }, [successPayload])

  const scheduleUrl = getScheduleUrl(successPayload)
  const classType = successPayload?.classType || successPayload?.formatName || "Signature Experience"
  const studioName = successPayload?.studioName || selectedStudio?.name || "Physique 57 India"

  useEffect(() => {
    if (!successPayload?.leadTracking?.event_id && !successPayload?.eventId) {
      return
    }

    const eventId = successPayload.leadTracking?.event_id || successPayload.eventId || ""
    const firedKey = getSuccessEventFiredKey(eventId)

    if (window.sessionStorage.getItem(firedKey) === "true") {
      return
    }

    void (async () => {
      try {
        const config = await loadPublicClientConfig()
        initializeTracking(config)
        trackLeadSubmission(config, {
          event_id: eventId,
          utm_campaign: successPayload.leadTracking?.utm_campaign,
          utm_source: successPayload.leadTracking?.utm_source,
        })
        window.sessionStorage.setItem(firedKey, "true")
      } catch {
        // Tracking should never block the thank-you experience.
      }
    })()
  }, [successPayload])

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <section className="relative overflow-hidden bg-zinc-950 text-white">
        <div className="absolute inset-0 opacity-55">
          <img
            src={THANK_YOU_HERO_IMAGE}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/78 to-zinc-950/20" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent" />
        <div className="relative mx-auto flex min-h-[68vh] max-w-6xl flex-col justify-between px-5 py-8 sm:px-8 lg:px-10">
          <img src={BRAND_LOGO_URL} alt="Physique 57 India" className="block h-auto w-24 max-w-[48vw] bg-white object-contain p-2 shadow-2xl sm:w-32" />
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
              <CheckCircle2 className="h-4 w-4 text-white" />
              Trial request received
            </div>
            <h1 className="mt-7 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Thank you{successPayload?.firstName ? `, ${successPayload.firstName}` : ""}. Your Studio Journey starts here.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-200 sm:text-lg">
              We have received your details. Our Customer Excellence team will help you choose and confirm the right upcoming Signature Experience.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:px-10 lg:py-16">
        <aside className="space-y-6">
          <div className="border-y border-zinc-200 py-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-5 w-5 text-zinc-950" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Confirmed interest</p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight text-zinc-950">{classType}</h2>
              </div>
            </div>
            <dl className="mt-7 divide-y divide-zinc-200 text-sm">
              <div className="py-4 first:pt-0">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Preferred Studio Space</dt>
                <dd className="mt-2 font-semibold leading-6 text-zinc-950">{studioName}</dd>
              </div>
              {selectedStudio ? (
                <>
                  <div className="py-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Address</dt>
                    <dd className="mt-2 leading-6 text-zinc-700">{selectedStudio.address}</dd>
                  </div>
                  <div className="py-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Studio support</dt>
                    <dd className="mt-2 flex items-center gap-2 font-semibold text-zinc-950">
                      <Phone className="h-4 w-4 text-zinc-400" />
                      {selectedStudio.phone}
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>
            <Button asChild className="mt-6 w-full rounded-none bg-zinc-950 py-6 text-white hover:bg-zinc-800">
              <a href={scheduleUrl}>
                View full live schedule <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="bg-zinc-50 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">What happens next</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-700">
              <li>Please arrive 10 minutes before your first Studio Session. Wear comfortable fitted activewear and bring grip socks if you have them.</li>
              <li>Entry to class will not be permitted after 5 minutes from the class start time. Please plan your arrival accordingly.</li>
            </ul>
          </div>
        </aside>

        <StudioMap selectedStudio={selectedStudio} studioName={studioName} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-14 sm:px-8 lg:px-10">
        <div className="grid gap-4 border-t border-zinc-200 pt-8 sm:grid-cols-3">
          {THANK_YOU_GALLERY_IMAGES.map((image) => (
            <div key={image.src} className="overflow-hidden bg-zinc-950">
              <img src={image.src} alt={image.alt} className="h-64 w-full object-cover grayscale-[15%] transition duration-500 hover:scale-[1.03] hover:grayscale-0 sm:h-72" />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
