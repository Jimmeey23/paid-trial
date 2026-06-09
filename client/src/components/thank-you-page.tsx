import { useEffect, useMemo, useState } from "react"
import {
  CalendarCheck2,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Phone,
  Shield,
  Sparkles,
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
const KIDS_THANK_YOU_HERO_IMAGES = [
  {
    src: "/p57-assets/p57-juniors-hero-2026-1.png",
    alt: "Physique 57 Juniors class moment",
  },
  {
    src: "/p57-assets/p57-juniors-hero-2026-2.png",
    alt: "Young movers practicing at Physique 57 Juniors",
  },
  {
    src: "/p57-assets/p57-juniors-hero-2026-3.png",
    alt: "Physique 57 Juniors studio practice",
  },
  {
    src: "/p57-assets/p57-juniors-hero-2026-4.png",
    alt: "Physique 57 Juniors movement session",
  },
]
const KIDS_THANK_YOU_GALLERY_IMAGES = KIDS_THANK_YOU_HERO_IMAGES.slice(1)
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

function KidsHeroImage() {
  const [primaryImage] = KIDS_THANK_YOU_HERO_IMAGES

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-[8px] bg-slate-900 shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:min-h-[560px] lg:min-h-[calc(100vh-4rem)]">
      <img src={primaryImage.src} alt={primaryImage.alt} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/72 to-transparent p-5 text-white">
        <p className="max-w-xs text-sm font-semibold leading-6">A confident first step into the Physique 57 Juniors practice.</p>
      </div>
    </div>
  )
}

function KidsThankYouPage({
  successPayload,
  selectedStudio,
  scheduleUrl,
  studioName,
}: {
  successPayload: TrialSuccessPayload | null
  selectedStudio: typeof studios[number] | undefined
  scheduleUrl: string
  studioName: string
}) {
  const childName = successPayload?.childName?.trim()
  const batch = successPayload?.batch?.trim()
  const nextSteps = [
    {
      title: "Studio team follow-up",
      text: "We will confirm the selected Juniors batch and help with any first-session details.",
      icon: Phone,
    },
    {
      title: "Consent recorded",
      text: "The parent/guardian signature is submitted against the Juniors waiver on the member profile.",
      icon: Shield,
    },
    {
      title: "First session prep",
      text: "Arrive a little early so your child can settle in and meet the instructor before class.",
      icon: CalendarCheck2,
    },
  ]

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="overflow-hidden bg-white">
        <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-8">
          <div className="flex flex-col justify-between gap-10 py-2 lg:py-4">
            <img src={BRAND_LOGO_URL} alt="Physique 57 India" className="h-auto w-24 object-contain sm:w-32" />

            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Your Juniors request is in
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
                Thank you{successPayload?.firstName ? `, ${successPayload.firstName}` : ""}. We are preparing your child's first Juniors session.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Our team will contact you shortly to confirm the best class timing and make the first studio visit feel clear, calm, and confident.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Studio</p>
                  <p className="mt-2 text-base font-bold leading-6 text-slate-950">{studioName}</p>
                  {selectedStudio?.neighborhood ? (
                    <p className="mt-1 text-sm text-slate-600">{selectedStudio.neighborhood}</p>
                  ) : null}
                </div>
                <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Juniors class</p>
                  <p className="mt-2 text-base font-bold leading-6 text-slate-950">{batch || successPayload?.classType || "Physique 57 - Juniors"}</p>
                  {childName ? <p className="mt-1 text-sm text-slate-600">For {childName}</p> : null}
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-12 rounded-[8px] bg-slate-950 px-5 text-white hover:bg-slate-800">
                  <a href={scheduleUrl}>
                    View schedule <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" className="h-12 rounded-[8px] border-slate-300 px-5 text-slate-950 hover:bg-slate-100">
                  <a href="/kids">
                    Back to Juniors
                  </a>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 border-t border-slate-200 pt-5 text-sm text-slate-600 sm:grid-cols-3">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Sparkles className="h-4 w-4 text-rose-600" />
                Ages 9-13
              </div>
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Shield className="h-4 w-4 text-emerald-600" />
                Low impact
              </div>
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <CalendarCheck2 className="h-4 w-4 text-sky-600" />
                Instructor led
              </div>
            </div>
          </div>

          <KidsHeroImage />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">What happens next for your child</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-950">A simple path from request to first class.</h2>
        </div>
        <div className="grid gap-3">
          {nextSteps.map((step, index) => {
            const Icon = step.icon

            return (
              <div key={step.title} className="grid gap-4 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[auto_1fr] sm:p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Step {index + 1}</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-950">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-3">
          {KIDS_THANK_YOU_GALLERY_IMAGES.map((image) => (
            <div key={image.src} className="overflow-hidden rounded-[8px] bg-slate-900">
              <img src={image.src} alt={image.alt} className="h-64 w-full object-cover sm:h-72" />
            </div>
          ))}
        </div>
      </section>
    </main>
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
  const isKidsSubmission = successPayload?.sourceForm === "kids-trial-form"

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

  if (isKidsSubmission) {
    return (
      <KidsThankYouPage
        successPayload={successPayload}
        selectedStudio={selectedStudio}
        scheduleUrl={scheduleUrl}
        studioName={studioName}
      />
    )
  }

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
