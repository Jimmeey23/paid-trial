import { useEffect, useMemo, useRef, useState } from "react"
import { parsePhoneNumberFromString } from "libphonenumber-js/min"
import {
  Accessibility,
  Activity,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Dumbbell,
  Footprints,
  Heart,
  Loader2,
  PersonStanding,
  Shield,
  Smile,
  Sparkles,
  Table2,
  Target,
  Users,
  Zap,
} from "lucide-react"

import { countryCodes, studios } from "@/data/physique57"
import { cn } from "@/lib/utils"
import { getSubmissionTrackingPayload } from "@/lib/tracking"
import { getThankYouUrl, saveTrialSuccessPayload } from "@/lib/submission-success"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const JUNIORS_HERO_IMAGES = [
  "/p57-assets/p57-juniors-hero-2026-1.png",
  "/p57-assets/p57-juniors-hero-2026-2.png",
  "/p57-assets/p57-juniors-hero-2026-3.png",
  "/p57-assets/p57-juniors-hero-2026-4.png",
]

const JUNIORS_PROGRAM_NAME = "Physique 57 - Juniors"

const JUNIORS_USPS = [
  {
    title: "Signature Method DNA",
    description:
      "Built from the Physique 57 barre-based Interval Overload method, adapted into a precise, age-aware practice for young movers.",
    icon: Sparkles,
    accent: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
  },
  {
    title: "Low-Impact, High-Control Movement",
    description:
      "Sessions focus on posture, coordination, flexibility, balance, and body control without the stress of high-impact training.",
    icon: Shield,
    accent: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
  },
  {
    title: "Instructor-Led Alignment",
    description:
      "P57 instructors guide form, rhythm, and confidence with the same premium coaching standards used across the adult studio experience.",
    icon: Award,
    accent: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  },
  {
    title: "Confidence Through Practice",
    description:
      "A polished studio journey that helps juniors build strength, focus, musicality, and comfort inside a boutique fitness environment.",
    icon: Heart,
    accent: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  },
]

const JUNIORS_BATCH_DETAILS: Record<string, Array<{
  value: string
  days: string
  time: string
  instructors: string
  studio: string
  note: string
  accent: string
  metaAccent: string
}>> = {
  "Supreme Headquarters, Bandra": [
    {
      value: "Tuesday & Friday - 4:30 PM - Simonelle & Cauveri",
      days: "Tuesday & Friday",
      time: "4:30 PM",
      instructors: "Simonelle & Cauveri",
      studio: "Bandra",
      note: "A twice-weekly class for posture, alignment, and confidence.",
      accent: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
      metaAccent: "text-rose-700",
    },
  ],
  "Kwality House, Kemps Corner": [
    {
      value: "Batch 1 - Monday & Wednesday - 4:30 PM - Cauveri & Karan",
      days: "Monday & Wednesday",
      time: "4:30 PM",
      instructors: "Cauveri & Karan",
      studio: "Kemps Corner",
      note: "An after-school class with guided technique and balance work.",
      accent: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
      metaAccent: "text-sky-700",
    },
    {
      value: "Batch 2 - Tuesday & Thursday - 11:30 AM - Karan & Cauveri",
      days: "Tuesday & Thursday",
      time: "11:30 AM",
      instructors: "Karan & Cauveri",
      studio: "Kemps Corner",
      note: "A late-morning class for young movers who prefer an easy start.",
      accent: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
      metaAccent: "text-emerald-700",
    },
  ],
}

const JUNIORS_BUILD_AREAS = [
  {
    title: "Postural Intelligence",
    description: "Clean alignment cues help juniors understand how strength, balance, and control connect.",
    icon: Target,
    accent: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
  },
  {
    title: "Rhythm & Focus",
    description: "Music-led sequencing builds coordination, timing, attention, and comfort with structured movement.",
    icon: Sparkles,
    accent: "bg-pink-50 text-pink-700 ring-1 ring-pink-100",
  },
  {
    title: "Confident Strength",
    description: "Low-impact resistance work supports steady progress without overwhelming growing bodies.",
    icon: Shield,
    accent: "bg-teal-50 text-teal-700 ring-1 ring-teal-100",
  },
]

const PROGRAM_FEATURES = [
  {
    title: "Functional Movement",
    icon: Accessibility,
    accent: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
  },
  {
    title: "Agility Drills",
    icon: Footprints,
    accent: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  },
  {
    title: "Barre-Based Work",
    icon: Table2,
    accent: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
  },
  {
    title: "Designed for Growing Bodies",
    icon: PersonStanding,
    accent: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  },
]

const PROGRAM_OUTCOMES = [
  { title: "Build Strength", icon: Dumbbell },
  { title: "Improve Balance", icon: PersonStanding },
  { title: "Boost Agility", icon: Activity },
  { title: "Build Confidence", icon: Zap },
  { title: "Have Fun", icon: Smile },
]

const STUDIO_JOURNEY_STEPS = [
  "A warm welcome at your selected studio",
  "Instructor-led movement with age-aware cues",
  "Friendly guidance on the class that suits your child best",
]

const PARENT_NOTES = [
  "Designed for young movers aged 9 to 13.",
  "We will confirm availability and help you choose the most suitable class.",
  "Your contact details help us coordinate your child's trial session.",
]

const FIELD_GROUP_CLASS =
  "group/field space-y-2.5"
const FIELD_LABEL_CLASS = "inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-600 transition-colors group-focus-within/field:text-slate-950"
const FIELD_CONTROL_CLASS =
  "h-12 rounded-[15px] border-slate-300/90 bg-white text-[15px] font-semibold text-slate-950 shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-all placeholder:text-slate-400 hover:border-slate-400 hover:bg-white focus-visible:border-slate-950 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-slate-950/10"
const FIELD_ERROR_CLASS = "text-sm font-semibold text-destructive"
const FIELD_INVALID_CLASS = "border-destructive bg-red-50/40 focus-visible:ring-destructive/15"
const SECTION_PANEL_CLASS =
  "rounded-[22px] border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-sm ring-1 ring-white/80 sm:p-5"
const SECTION_ICON_CLASS =
  "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[18px] shadow-sm ring-1"
const SECTION_KICKER_CLASS =
  "text-[11px] font-extrabold uppercase tracking-[0.18em]"
const SECTION_TITLE_CLASS =
  "mt-1 text-lg font-extrabold tracking-normal text-slate-950"

const KIDS_BATCH_OPTIONS: Record<string, string[]> = {
  "Supreme Headquarters, Bandra": [
    "Tuesday & Friday - 4:30 PM - Simonelle & Cauveri",
  ],
  "Kwality House, Kemps Corner": [
    "Batch 1 - Monday & Wednesday - 4:30 PM - Cauveri & Karan",
    "Batch 2 - Tuesday & Thursday - 11:30 AM - Karan & Cauveri",
  ],
}

function createEventId() {
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function sameOriginApiUrl(path: string) {
  if (typeof window === "undefined") {
    return path
  }

  return new URL(path, window.location.origin).toString()
}

function getCountryOption(countrySelection: string) {
  return (
    countryCodes.find((item) => item.country === countrySelection)
    ?? countryCodes.find((item) => item.country === "IN")
    ?? countryCodes[0]
  )
}

export function KidsTrialForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "IN",
    phone: "",
    studio: "",
    childName: "",
    childAge: "",
    batch: "",
    acceptedTerms: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [statusMessage, setStatusMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [currentHeroImage, setCurrentHeroImage] = useState(0)
  const eventIdRef = useRef(createEventId())
  const redirectTimeoutRef = useRef<number | null>(null)

  const selectedStudio = useMemo(
    () => studios.find((studio) => studio.name === formData.studio),
    [formData.studio]
  )
  const selectedStudioBackendName = selectedStudio?.backendName || ""
  const batchOptions = selectedStudioBackendName ? KIDS_BATCH_OPTIONS[selectedStudioBackendName] || [] : []
  const batchDetails = selectedStudioBackendName ? JUNIORS_BATCH_DETAILS[selectedStudioBackendName] || [] : []
  const selectedCountry = getCountryOption(formData.countryCode)

  useEffect(() => {
    const imageInterval = window.setInterval(() => {
      setCurrentHeroImage((current) => (current + 1) % JUNIORS_HERO_IMAGES.length)
    }, 6500)

    return () => window.clearInterval(imageInterval)
  }, [])

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  function handleInputChange(field: keyof typeof formData, value: string | boolean) {
    setFormData((current) => ({
      ...current,
      [field]: value,
      ...(field === "studio" ? { batch: "" } : {}),
    }))

    setErrors((current) => ({
      ...current,
      [field]: "",
      ...(field === "studio" ? { batch: "" } : {}),
    }))
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {}
    const parsedAge = Number.parseInt(formData.childAge, 10)

    if (!formData.firstName.trim()) {
      nextErrors.firstName = "First name is required"
    }
    if (!formData.lastName.trim()) {
      nextErrors.lastName = "Last name is required"
    }
    if (!formData.email.trim()) {
      nextErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      nextErrors.email = "Enter a valid email"
    }
    if (!formData.phone.trim()) {
      nextErrors.phone = "Phone number is required"
    }
    if (!formData.studio) {
      nextErrors.studio = "Select a center"
    }
    if (!formData.childName.trim()) {
      nextErrors.childName = "Child name is required"
    }
    if (!formData.childAge.trim()) {
      nextErrors.childAge = "Child age is required"
    } else if (!/^\d+$/.test(formData.childAge.trim())) {
      nextErrors.childAge = "Enter age as a whole number"
    } else if (parsedAge < 9 || parsedAge > 13) {
      nextErrors.childAge = "Child age must be between 9 and 13"
    }
    if (!formData.batch) {
      nextErrors.batch = selectedStudio ? "Select a batch preference" : "Select a center first"
    }
    if (!formData.acceptedTerms) {
      nextErrors.acceptedTerms = "Accept the waiver and terms"
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    const phoneWithCountry = `${selectedCountry.code}${formData.phone.replace(/\s+/g, "")}`
    const parsedPhone = parsePhoneNumberFromString(phoneWithCountry)

    if (!parsedPhone?.isValid()) {
      setErrors((current) => ({ ...current, phone: "Enter a valid phone number" }))
      return
    }

    setIsSubmitting(true)
    setStatusMessage(null)

    const trackingPayload = getSubmissionTrackingPayload() as Record<string, string>
    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phoneNumber: parsedPhone.formatInternational(),
      phoneCountry: selectedCountry.country || "IN",
      center: selectedStudioBackendName,
      type: JUNIORS_PROGRAM_NAME,
      childName: formData.childName.trim(),
      childAge: formData.childAge.trim(),
      batch: formData.batch,
      waiverAccepted: formData.acceptedTerms ? "accepted" : "",
      event_id: eventIdRef.current,
      source_form: "kids-trial-form",
      ...trackingPayload,
    }

    try {
      const response = await fetch(sameOriginApiUrl("/api/submit-kids-lead"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const result = await response.json()

      if (!response.ok) {
        const fieldErrors = result.fieldErrors || {}
        setErrors((current) => ({
          ...current,
          ...fieldErrors,
          phone: fieldErrors.phoneNumber || current.phone,
          batch: fieldErrors.batch || fieldErrors.batchPreference || current.batch,
        }))
        setStatusMessage({
          text: result.error || "Submission failed. Please try again.",
          tone: "error",
        })
        return
      }

      saveTrialSuccessPayload({
        eventId: typeof result.event_id === "string" ? result.event_id : payload.event_id,
        firstName: payload.firstName,
        studioName: selectedStudio?.name || formData.studio,
        studioBackendName: selectedStudioBackendName,
        studioLocationId: selectedStudio?.scheduleLocationId,
        formatName: JUNIORS_PROGRAM_NAME,
        classType: JUNIORS_PROGRAM_NAME,
        sourceForm: "kids-trial-form",
        statusMessage: result.warning || `Your ${JUNIORS_PROGRAM_NAME} request has been received.`,
        redirectUrl: getThankYouUrl(),
        leadTracking: {
          event_id: typeof result.event_id === "string" ? result.event_id : payload.event_id,
          utm_campaign: typeof trackingPayload.utm_campaign === "string" ? trackingPayload.utm_campaign : undefined,
          utm_source: typeof trackingPayload.utm_source === "string" ? trackingPayload.utm_source : undefined,
        },
        createdAt: new Date().toISOString(),
      })

      setShowSuccess(true)
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        countryCode: "IN",
        phone: "",
        studio: "",
        childName: "",
        childAge: "",
        batch: "",
        acceptedTerms: false,
      })
      eventIdRef.current = createEventId()
      redirectTimeoutRef.current = window.setTimeout(() => {
        window.location.assign(getThankYouUrl())
      }, 650)
    } catch (error) {
      console.error("Juniors trial submission error:", error)
      setStatusMessage({
        text: "An error occurred. Please try again.",
        tone: "error",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = Boolean(
    formData.firstName.trim()
    && formData.lastName.trim()
    && formData.email.trim()
    && formData.phone.trim()
    && formData.studio
    && formData.childName.trim()
    && formData.childAge.trim()
    && formData.batch
    && formData.acceptedTerms
  )

  if (showSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-slate-50 px-4 py-10">
        <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 text-white">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-slate-950">Request received</h1>
          <p className="mx-auto mt-3 max-w-md text-base leading-7 text-slate-600">
            Our team will contact you shortly to confirm the {JUNIORS_PROGRAM_NAME} batch details.
          </p>
          <Button className="mt-7 h-12 w-full bg-slate-950 text-white hover:bg-slate-800" onClick={() => window.location.assign(getThankYouUrl())}>
            Continue
          </Button>
        </section>
      </main>
    )
  }

  return (
    <main
      data-layout="juniors-page-shell"
      className="min-h-screen overflow-x-hidden bg-slate-50 lg:fixed lg:inset-0 lg:h-[100dvh] lg:overflow-hidden"
    >
      <div className="min-h-screen lg:min-h-0">
        <aside
          data-layout="juniors-fixed-hero"
          className="relative hidden overflow-hidden bg-slate-950 lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:h-[100dvh] lg:w-[42vw]"
        >
          {JUNIORS_HERO_IMAGES.map((image, index) => (
            <img
              key={image}
              src={image}
              alt="Young movers at a Physique 57 Juniors barre session"
              className={cn(
                "absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000",
                index === currentHeroImage ? "opacity-100" : "opacity-0"
              )}
            />
          ))}
          <div className="absolute inset-0 z-20 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/10" />
          <div className="absolute inset-x-0 bottom-0 z-30 p-10 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-950 shadow-lg">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">For ages 9-13</p>
            <h1 className="mt-2 max-w-md text-5xl font-bold leading-tight">Strong Foundations Start Here</h1>
            <p className="mt-4 max-w-md text-base leading-7 text-white/84">
              Led by experts, the Physique 57 Kids Strength & Agility Program builds strength, balance, mobility, coordination, and athletic power.
            </p>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-3 text-xs font-semibold uppercase tracking-wide text-white/82">
              <div className="border-l border-white/30 pl-3">Posture</div>
              <div className="border-l border-white/30 pl-3">Strength</div>
              <div className="border-l border-white/30 pl-3">Confidence</div>
            </div>
          </div>
        </aside>

        <section
          data-layout="juniors-form-scroll-panel"
          className="min-h-screen min-w-0 overflow-x-hidden bg-slate-50 px-3 py-6 sm:px-6 lg:ml-[42vw] lg:h-[100dvh] lg:min-h-0 lg:w-[58vw] lg:overflow-y-auto lg:overscroll-contain lg:px-10 lg:py-10"
        >
          <div className="mx-auto w-full max-w-4xl space-y-7 overflow-x-hidden">
            <div className="relative overflow-hidden rounded-2xl bg-slate-950 lg:hidden">
              <img
                src={JUNIORS_HERO_IMAGES[currentHeroImage]}
                alt="Young movers at a Physique 57 Juniors barre session"
                className="h-80 w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/88 via-slate-950/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">For ages 9-13</p>
                <h1 className="mt-2 max-w-full text-3xl font-bold leading-tight [overflow-wrap:anywhere]">Strong Foundations Start Here</h1>
                <p className="mt-2 max-w-full break-words text-sm leading-6 text-white/82 [overflow-wrap:anywhere]">
                  Build strength. Improve balance. Boost confidence.
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-b from-white via-white to-slate-50/90 shadow-[0_34px_90px_rgba(15,23,42,0.13)] ring-1 ring-white/70">
              <div className="bg-slate-950 text-white">
                <div className="flex flex-col gap-4 px-5 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-7 lg:px-8">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">Juniors Trial</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-normal text-white sm:text-3xl">Plan your child's first session</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                      Tell us where you would like to visit and which Juniors class works best for your child.
                    </p>
                  </div>
                  <div className="w-fit rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-sm">
                    P57 Juniors
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-px bg-slate-800 sm:grid-cols-5">
                  {PROGRAM_OUTCOMES.map((outcome) => {
                    const Icon = outcome.icon

                    return (
                      <div key={outcome.title} className="flex min-h-[112px] flex-col items-center justify-center bg-slate-950 px-3 py-4 text-center">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300 ring-1 ring-sky-300/20">
                          <Icon className="h-6 w-6" />
                        </div>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] leading-5 text-white/88">{outcome.title}</p>
                      </div>
                    )
                  })}
                </div>
                <div className="border-t border-slate-800 bg-slate-950 px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.22em] text-white/88 sm:text-sm">
                  Build strength. <span className="mx-2 text-sky-400">/</span> Improve balance. <span className="mx-2 text-sky-400">/</span> Boost confidence.
                </div>
              </div>

              <form onSubmit={handleSubmit} className="relative space-y-5 p-3 sm:p-4 lg:p-5">
                <div className="rounded-[24px] border border-slate-200/90 bg-white/95 p-3 shadow-[0_18px_52px_rgba(15,23,42,0.07)] ring-1 ring-white/80 sm:p-4">
                <div className={SECTION_PANEL_CLASS}>
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn(SECTION_ICON_CLASS, "bg-sky-50 text-sky-700 ring-sky-100")}>
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className={cn(SECTION_KICKER_CLASS, "text-sky-700")}>Parent Details</p>
                        <h3 className={SECTION_TITLE_CLASS}>Contact for confirmation</h3>
                      </div>
                    </div>
                    <p className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shadow-sm">Required *</p>
                  </div>
                  <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div className={FIELD_GROUP_CLASS}>
                    <Label htmlFor="firstName" className={FIELD_LABEL_CLASS}>Parent/guardian first name <span className="text-destructive">*</span></Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(event) => handleInputChange("firstName", event.target.value)}
                      placeholder="Asha"
                      className={cn(FIELD_CONTROL_CLASS, errors.firstName && FIELD_INVALID_CLASS)}
                    />
                    {errors.firstName ? <p className={FIELD_ERROR_CLASS}>{errors.firstName}</p> : null}
                  </div>

                  <div className={FIELD_GROUP_CLASS}>
                    <Label htmlFor="lastName" className={FIELD_LABEL_CLASS}>Parent/guardian last name <span className="text-destructive">*</span></Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(event) => handleInputChange("lastName", event.target.value)}
                      placeholder="Shah"
                      className={cn(FIELD_CONTROL_CLASS, errors.lastName && FIELD_INVALID_CLASS)}
                    />
                    {errors.lastName ? <p className={FIELD_ERROR_CLASS}>{errors.lastName}</p> : null}
                  </div>

                  <div className={FIELD_GROUP_CLASS}>
                    <Label htmlFor="email" className={FIELD_LABEL_CLASS}>Email <span className="text-destructive">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => handleInputChange("email", event.target.value)}
                      placeholder="asha@example.com"
                      className={cn(FIELD_CONTROL_CLASS, errors.email && FIELD_INVALID_CLASS)}
                    />
                    {errors.email ? <p className={FIELD_ERROR_CLASS}>{errors.email}</p> : null}
                  </div>

                  <div className={FIELD_GROUP_CLASS}>
                    <Label htmlFor="phone" className={FIELD_LABEL_CLASS}>Parent/guardian phone <span className="text-destructive">*</span></Label>
                    <div className="grid grid-cols-[86px_minmax(0,1fr)] gap-2">
                      <Select value={formData.countryCode} onValueChange={(value) => handleInputChange("countryCode", value)}>
                        <SelectTrigger size="lg" className={FIELD_CONTROL_CLASS}>
                          <SelectValue placeholder="+91">
                            <span>{selectedCountry.code}</span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {countryCodes.map((country) => (
                            <SelectItem key={`${country.country}-${country.code}`} value={country.country}>
                              {country.flag} {country.code} {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(event) => handleInputChange("phone", event.target.value)}
                        placeholder="98765 43210"
                        className={cn(FIELD_CONTROL_CLASS, errors.phone && FIELD_INVALID_CLASS)}
                      />
                    </div>
                    {errors.phone ? <p className={FIELD_ERROR_CLASS}>{errors.phone}</p> : null}
                  </div>
                  </div>
                </div>

                <div className={cn(SECTION_PANEL_CLASS, "mt-4")}>
                  <div className="mb-4 flex items-start gap-3">
                    <div className={cn(SECTION_ICON_CLASS, "bg-violet-50 text-violet-700 ring-violet-100")}>
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={cn(SECTION_KICKER_CLASS, "text-violet-700")}>Child & Session</p>
                      <h3 className={SECTION_TITLE_CLASS}>Choose the right starting point</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-3">
                  <div className={FIELD_GROUP_CLASS}>
                    <Label htmlFor="studio" className={FIELD_LABEL_CLASS}>Center <span className="text-destructive">*</span></Label>
                    <Select value={formData.studio} onValueChange={(value) => handleInputChange("studio", value)}>
                      <SelectTrigger id="studio" size="lg" className={cn(FIELD_CONTROL_CLASS, errors.studio && FIELD_INVALID_CLASS)}>
                        <SelectValue placeholder="Select center" />
                      </SelectTrigger>
                      <SelectContent>
                        {studios.map((studio) => (
                          <SelectItem key={studio.name} value={studio.name}>
                            <div>
                              <div className="font-medium">{studio.name}</div>
                              <div className="text-xs text-muted-foreground">{studio.location}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.studio ? <p className={FIELD_ERROR_CLASS}>{errors.studio}</p> : null}
                  </div>

                  <div className={FIELD_GROUP_CLASS}>
                    <Label htmlFor="childName" className={FIELD_LABEL_CLASS}>Child name <span className="text-destructive">*</span></Label>
                    <Input
                      id="childName"
                      name="childName"
                      value={formData.childName}
                      onChange={(event) => handleInputChange("childName", event.target.value)}
                      placeholder="Riya"
                      className={cn(FIELD_CONTROL_CLASS, errors.childName && FIELD_INVALID_CLASS)}
                    />
                    {errors.childName ? <p className={FIELD_ERROR_CLASS}>{errors.childName}</p> : null}
                  </div>

                  <div className={FIELD_GROUP_CLASS}>
                    <Label htmlFor="childAge" className={FIELD_LABEL_CLASS}>Child age <span className="text-destructive">*</span></Label>
                    <Input
                      id="childAge"
                      type="number"
                      min={9}
                      max={13}
                      inputMode="numeric"
                      value={formData.childAge}
                      onChange={(event) => handleInputChange("childAge", event.target.value)}
                      placeholder="10"
                      className={cn(FIELD_CONTROL_CLASS, errors.childAge && FIELD_INVALID_CLASS)}
                    />
                    {errors.childAge ? <p className={FIELD_ERROR_CLASS}>{errors.childAge}</p> : null}
                  </div>
                  </div>
                </div>

                <div className={cn(SECTION_PANEL_CLASS, "mt-4")}>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn(SECTION_ICON_CLASS, "bg-emerald-50 text-emerald-700 ring-emerald-100")}>
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className={cn(SECTION_KICKER_CLASS, "text-emerald-700")}>Batch Preference</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">Choose a center to see the available Juniors classes.</p>
                      </div>
                    </div>
                    <div className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
                      {batchDetails.length ? `${batchDetails.length} option${batchDetails.length > 1 ? "s" : ""}` : "Select center"}
                    </div>
                  </div>
                  <Select
                    value={formData.batch}
                    onValueChange={(value) => handleInputChange("batch", value)}
                    disabled={!selectedStudio}
                  >
                    <Label htmlFor="batch" className="sr-only">Batch preference <span className="text-destructive">*</span></Label>
                    <SelectTrigger id="batch" size="lg" className={cn(FIELD_CONTROL_CLASS, "mt-3 min-h-12", errors.batch && FIELD_INVALID_CLASS)}>
                      <SelectValue placeholder={selectedStudio ? "Select batch" : "Select center first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {batchOptions.map((batch) => (
                        <SelectItem key={batch} value={batch}>
                          {batch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.batch ? <p className={FIELD_ERROR_CLASS}>{errors.batch}</p> : null}

                  <div data-section="batch-card-grid" className="grid gap-2 pt-1">
                    {batchDetails.length ? (
                      batchDetails.map((batch) => {
                        const isSelected = formData.batch === batch.value

                        return (
                          <button
                            key={batch.value}
                            type="button"
                            data-batch-card
                            aria-pressed={isSelected}
                            onClick={() => handleInputChange("batch", batch.value)}
                            className={cn(
                              "group min-w-0 rounded-[16px] border bg-white px-3.5 py-3 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50/80 sm:px-4",
                              isSelected
                                ? "border-slate-950 bg-slate-50/70 ring-2 ring-slate-950/10"
                                : "border-slate-200/90"
                            )}
                          >
                            <div className="flex min-w-0 items-start gap-3">
                              <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl shadow-sm", batch.accent)}>
                                <Calendar className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700">{batch.studio}</span>
                                  {isSelected ? (
                                    <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">Selected</span>
                                  ) : null}
                                </div>
                                <div className="mt-2 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                  <h3 className="break-words text-sm font-bold leading-snug text-slate-950 [overflow-wrap:anywhere] sm:text-base">{batch.days}</h3>
                                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                                    <Clock className={cn("h-3.5 w-3.5", batch.metaAccent)} />
                                    {batch.time}
                                  </span>
                                </div>
                                <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-600 sm:text-sm">
                                  <span className="inline-flex min-w-0 items-center gap-1.5">
                                    <Users className={cn("h-3.5 w-3.5 flex-shrink-0", batch.metaAccent)} />
                                    {batch.instructors}
                                  </span>
                                  <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
                                  <span className="min-w-0 text-slate-500">{batch.note}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })
                    ) : (
                      <div className="rounded-[18px] border border-dashed border-slate-300 bg-white/70 p-4 text-sm leading-6 text-slate-600 md:col-span-2">
                        Select a center and we will show the available Juniors classes.
                      </div>
                    )}
                  </div>
                </div>

                  <div className="mt-6 border-t border-slate-200/80 pt-6">
                    <div className="space-y-2">
                      <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-6 text-slate-800 transition-all hover:border-slate-300 hover:bg-white">
                        <Checkbox
                          checked={formData.acceptedTerms}
                          onCheckedChange={(checked) => handleInputChange("acceptedTerms", Boolean(checked))}
                          className={cn("mt-0.5", errors.acceptedTerms && "border-destructive")}
                        />
                        <span>I accept the waiver and consent to be contacted about {JUNIORS_PROGRAM_NAME}. <span className="text-destructive">*</span></span>
                      </label>
                      {errors.acceptedTerms ? <p className={FIELD_ERROR_CLASS}>{errors.acceptedTerms}</p> : null}
                    </div>

                    {statusMessage ? (
                      <div
                        className={cn(
                          "rounded-xl border px-4 py-3 text-sm",
                          statusMessage.tone === "error"
                            ? "border-red-300 bg-red-50 text-red-800"
                            : "border-slate-300 bg-slate-50 text-slate-800"
                        )}
                      >
                        {statusMessage.text}
                      </div>
                    ) : null}

                    <Button
                      id="kids-submit-button"
                      type="submit"
                      disabled={isSubmitting || !isFormValid}
                      className="h-14 w-full rounded-[16px] bg-slate-950 text-base font-bold text-white shadow-[0_20px_42px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_26px_54px_rgba(15,23,42,0.32)] disabled:translate-y-0 disabled:shadow-none"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Juniors Trial Request"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-3 py-4 sm:px-4">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PROGRAM_FEATURES.map((feature) => {
                      const Icon = feature.icon

                      return (
                        <div key={feature.title} className="flex min-w-0 items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                          <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", feature.accent)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <p className="min-w-0 text-sm font-semibold leading-snug text-slate-800 [overflow-wrap:anywhere]">{feature.title}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </form>
            </div>

            <section className="space-y-6 pb-10">
              <div className="px-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                  <Sparkles className="h-4 w-4 text-slate-800" />
                  <span className="text-sm font-semibold text-slate-950">Signature Movement Intelligence</span>
                </div>
                <h2 className="mt-5 text-3xl font-bold text-slate-950">Inside The Juniors Method</h2>
                <p className="mt-3 max-w-3xl break-words text-base leading-7 text-slate-600">
                  The Juniors experience carries the same Physique 57 promise: precise movement, premium instruction, low-impact intensity, and a community-led studio journey.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {JUNIORS_USPS.map((item) => {
                  const Icon = item.icon

                  return (
                    <div key={item.title} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.13)]">
                      <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl shadow-md", item.accent)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-lg font-bold text-slate-950">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">{item.description}</p>
                    </div>
                  )
                })}
              </div>

              <section className="rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.10)] ring-1 ring-white/70 sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">What Young Movers Build</p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-950">Strength that feels composed, not rushed</h3>
                  </div>
                  <div className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                    Low impact
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {JUNIORS_BUILD_AREAS.map((item) => {
                    const Icon = item.icon

                    return (
                      <div key={item.title} className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 p-4">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", item.accent)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <h4 className="mt-4 text-base font-bold text-slate-950">{item.title}</h4>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                <div className="rounded-[26px] border border-white/80 bg-slate-950 p-5 text-white shadow-[0_26px_80px_rgba(15,23,42,0.22)] sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">First Session Flow</p>
                  <h3 className="mt-2 text-2xl font-bold">A warm, confident start at the barre</h3>
                  <div className="mt-5 space-y-3">
                    {STUDIO_JOURNEY_STEPS.map((step, index) => (
                      <div key={step} className="flex gap-3 rounded-[18px] border border-white/10 bg-white/10 p-4">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950">{index + 1}</span>
                        <p className="text-sm leading-6 text-white/82">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_22px_70px_rgba(15,23,42,0.09)] sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">Good To Know</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950">Helpful notes before you book</h3>
                  <div className="mt-5 space-y-3">
                    {PARENT_NOTES.map((note) => (
                      <div key={note} className="flex gap-3 rounded-[16px] bg-slate-50 p-3 shadow-sm">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-700" />
                        <p className="text-sm leading-6 text-slate-700">{note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}
