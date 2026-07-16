import { useEffect, useRef, useState } from "react"
import confetti from "canvas-confetti"
import { AnimatePresence, motion } from "framer-motion"
import { parsePhoneNumberFromString } from "libphonenumber-js/min"
import {
  Award,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  Heart,
  Loader2,
  MapPin,
  Phone,
  Shield,
  Sparkles,
  Trophy,
  Target,
  Users,
  Zap,
  X,
  type LucideIcon,
} from "lucide-react"

import { countryCodes, faqs, keyBenefits, studios, waiverSections, clientReviews } from "@/data/physique57"
import { cn } from "@/lib/utils"
import { getSubmissionTrackingPayload, loadPublicClientConfig, type PublicClientConfig } from "@/lib/tracking"
import { getThankYouUrl, saveTrialSuccessPayload } from "@/lib/submission-success"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const DEFAULT_REDIRECT_URL = "https://momence.com/u/physique-57-india-fffoSp"

function createEventId() {
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function sameOriginApiUrl(path: string) {
  if (typeof window === "undefined") {
    return path
  }
  return new URL(path, window.location.origin).toString()
}

const HERO_IMAGES = [
  "https://i.postimg.cc/526bSnvX/2L2A8104.jpg",
  "https://i.postimg.cc/Rh4nWjWY/Whats-App-Image-2025-04-03-at-11-03-13-AM-(1).jpg",
  "https://i.postimg.cc/VvZTF5Sj/hp-Img-1770172692.png",
]

interface FormatCard {
  value: string
  label: string
  tag: string
  description: string
  image: string
  imageAlt: string
  intensity: string
  duration: string
  bestFor: string
  highlights: string[]
}

const FORMAT_CARDS: FormatCard[] = [
  {
    value: "Barre 57",
    label: "Barre 57",
    tag: "Signature sculpt",
    description: "Isometric barre work for lean strength and posture.",
    image: "/p57-assets/p57-barre-studio.jpg",
    imageAlt: "Barre 57 class at the barre, Physique 57 India",
    intensity: "Moderate",
    duration: "57 mins",
    bestFor: "Lean muscle, posture, flexibility",
    highlights: [
      "Small isometric movements at the barre for deep muscle fatigue",
      "Low-impact, joint-friendly — accessible at any fitness level",
      "Our original signature format, refined over 15+ years",
    ],
  },
  {
    value: "powerCycle",
    label: "powerCycle",
    tag: "Rhythm cardio",
    description: "Indoor cycling built for stamina and a steady sweat.",
    image: "/p57-assets/p57-cycle-close.jpg",
    imageAlt: "powerCycle indoor cycling class, Physique 57 India",
    intensity: "Moderate to high",
    duration: "30 or 45 mins",
    bestFor: "Cardio conditioning, toned legs, endorphin boost",
    highlights: [
      "Rhythm-based choreography set to a curated playlist",
      "Real riding metrics so you can track progress class to class",
      "Great cross-training pair with Barre or Strength Lab",
    ],
  },
  {
    value: "Strength Lab",
    label: "Strength Lab",
    tag: "Full-body power",
    description: "Weighted circuits for muscle, mobility, and power.",
    image: "/p57-assets/p57-strength-color.jpg",
    imageAlt: "Strength Lab class, Physique 57 India",
    intensity: "High",
    duration: "57 mins",
    bestFor: "Functional strength, muscular power, conditioning",
    highlights: [
      "Dumbbells, kettlebells, plyo boxes, bands, and a pull-up bar",
      "Progressive overload for lean muscle and a faster metabolism",
      "Intermediate level — some strength training experience helps",
    ],
  },
]

const STUDIO_FORMAT_AVAILABILITY: Record<string, string[]> = {
  "Supreme Headquarters, Bandra": ["Barre 57", "powerCycle"],
  "Kwality House, Kemps Corner": ["Barre 57", "powerCycle", "Strength Lab"],
}

const REVIEW_CARD_WIDTH = 320
const REVIEW_CARD_GAP = 16
const REVIEW_CARD_STRIDE = REVIEW_CARD_WIDTH + REVIEW_CARD_GAP
const REVIEW_CARD_CENTER_OFFSET = REVIEW_CARD_WIDTH / 2

const benefitIcons: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  trophy: Trophy,
  shield: Shield,
  heart: Heart,
  award: Award,
  users: Users,
  target: Target,
  zap: Zap,
}

export function CombinedTrialForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "IN",
    phone: "",
    studio: "",
    classFormat: "",
    acceptedTerms: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null)
  const [showWaiverModal, setShowWaiverModal] = useState(false)
  const [showAllFaqsModal, setShowAllFaqsModal] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [hoveredFormat, setHoveredFormat] = useState<string | null>(null)
  const [currentReview, setCurrentReview] = useState<number>(0)
  const [isReviewPaused, setIsReviewPaused] = useState(false)
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const confettiInstanceRef = useRef<ReturnType<typeof confetti.create> | null>(null)
  const redirectTimeoutRef = useRef<number | null>(null)
  const eventIdRef = useRef<string>(createEventId())
  const publicConfigRef = useRef<PublicClientConfig | null>(null)
  const [currentHeroImage, setCurrentHeroImage] = useState(0)
  const [loadedHeroImages, setLoadedHeroImages] = useState<Set<number>>(new Set())
  const [publicConfig, setPublicConfig] = useState<PublicClientConfig | null>(null)
  const [resolvedRedirectUrl, setResolvedRedirectUrl] = useState(DEFAULT_REDIRECT_URL)

  const selectedStudio = studios.find((studio) => studio.name === formData.studio)
  const availableFormats = selectedStudio ? STUDIO_FORMAT_AVAILABILITY[selectedStudio.backendName] ?? [] : []
  const redirectUrl = resolvedRedirectUrl || publicConfig?.redirectUrl || DEFAULT_REDIRECT_URL

  useEffect(() => {
    const imageNodes = HERO_IMAGES.map((src, index) => {
      const image = new window.Image()
      image.onload = () => {
        setLoadedHeroImages((prev) => (prev.has(index) ? prev : new Set(prev).add(index)))
      }
      image.src = src
      return image
    })

    return () => {
      imageNodes.forEach((image) => {
        image.onload = null
      })
    }
  }, [])

  useEffect(() => {
    if (!loadedHeroImages.has(currentHeroImage)) {
      return
    }

    const heroInterval = window.setInterval(() => {
      setCurrentHeroImage((prev) => {
        const next = (prev + 1) % HERO_IMAGES.length
        return loadedHeroImages.has(next) ? next : prev
      })
    }, 6500)

    return () => window.clearInterval(heroInterval)
  }, [currentHeroImage, loadedHeroImages])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const config = await loadPublicClientConfig()
        if (!cancelled) {
          publicConfigRef.current = config
          setPublicConfig(config)
          setResolvedRedirectUrl(config.redirectUrl || DEFAULT_REDIRECT_URL)
        }
      } catch {
        // Tracking config is optional for the booking flow itself.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!confettiCanvasRef.current) {
      return
    }
    confettiInstanceRef.current = confetti.create(confettiCanvasRef.current, { resize: true, useWorker: true })
    return () => {
      confettiInstanceRef.current?.reset()
      confettiInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current && typeof window !== "undefined") {
        window.clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isReviewPaused) {
      return
    }

    const reviewTimeout = window.setTimeout(() => {
      setCurrentReview((prev) => (prev + 1) % clientReviews.length)
    }, 3800)

    return () => window.clearTimeout(reviewTimeout)
  }, [currentReview, isReviewPaused])

  function scheduleRedirectToMomence(url = redirectUrl, delay = 1400) {
    if (typeof window === "undefined") {
      return
    }
    if (redirectTimeoutRef.current) {
      window.clearTimeout(redirectTimeoutRef.current)
    }
    redirectTimeoutRef.current = window.setTimeout(() => {
      window.location.assign(url)
    }, delay)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      if (field === "studio") {
        const nextAvailable = studios.find((studio) => studio.name === value)
        const nextAvailableFormats = nextAvailable ? STUDIO_FORMAT_AVAILABILITY[nextAvailable.backendName] ?? [] : []
        if (!nextAvailableFormats.includes(prev.classFormat)) {
          next.classFormat = ""
        }
      }
      return next
    })
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required"
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required"
    if (!formData.studio) newErrors.studio = "Please select a studio"
    if (!formData.classFormat) newErrors.classFormat = "Please choose a class format"
    if (!formData.acceptedTerms) newErrors.acceptedTerms = "You must accept the waiver and terms"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const getCountryOption = (code: string) => countryCodes.find((item) => item.country === code)

  const getPhoneNumber = () => {
    const countryCode = getCountryOption(formData.countryCode)?.code || "+91"
    return countryCode + formData.phone.replace(/\s+/g, "")
  }

  const celebrateSuccess = () => {
    const shoot = confettiInstanceRef.current ?? confetti
    const bursts = [0, 180, 420, 720, 1080]

    for (const delay of bursts) {
      window.setTimeout(() => {
        shoot({ particleCount: 90, startVelocity: 48, spread: 82, ticks: 250, gravity: 0.9, scalar: 1.05, origin: { x: 0, y: 0.78 }, angle: 42, colors: ["#0f172a", "#334155", "#64748b", "#ffffff"] })
        shoot({ particleCount: 90, startVelocity: 48, spread: 82, ticks: 250, gravity: 0.9, scalar: 1.05, origin: { x: 1, y: 0.78 }, angle: 138, colors: ["#0f172a", "#334155", "#64748b", "#ffffff"] })
      }, delay)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const phoneNumber = getPhoneNumber()
      const parsedPhone = parsePhoneNumberFromString(phoneNumber)

      if (!parsedPhone?.isValid()) {
        setErrors({ phone: "Invalid phone number" })
        setIsSubmitting(false)
        return
      }

      const trackingPayload = getSubmissionTrackingPayload()

      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: parsedPhone.formatInternational(),
        phoneCountry: getCountryOption(formData.countryCode)?.country || "IN",
        center: selectedStudio?.backendName ?? formData.studio,
        type: formData.classFormat,
        waiverAccepted: formData.acceptedTerms ? "accepted" : "",
        event_id: eventIdRef.current,
        source_form: "combined-trial-form",
        ...trackingPayload,
      } as Record<string, string>

      const response = await fetch(sameOriginApiUrl("/api/submit-barre-lead"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        setStatusMessage({ text: result.error || "Submission failed. Please try again.", tone: "error" })
        setIsSubmitting(false)
        return
      }

      celebrateSuccess()

      const nextRedirectUrl = result.redirectUrl || publicConfigRef.current?.redirectUrl || DEFAULT_REDIRECT_URL
      setResolvedRedirectUrl(nextRedirectUrl)
      setShowSuccessModal(true)

      const submittedFormat = formData.classFormat
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        countryCode: "+91",
        phone: "",
        studio: "",
        classFormat: "",
        acceptedTerms: false,
      })
      eventIdRef.current = createEventId()

      saveTrialSuccessPayload({
        eventId: typeof result.event_id === "string" ? result.event_id : payload.event_id,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
        phoneCountry: payload.phoneCountry,
        studioName: selectedStudio?.name ?? payload.center,
        studioBackendName: selectedStudio?.backendName ?? payload.center,
        studioLocationId: selectedStudio?.scheduleLocationId,
        formatName: submittedFormat,
        classType: submittedFormat,
        sourceForm: "combined-trial-form",
        statusMessage: result.error || result.warning || "Your details have been received.",
        redirectUrl: nextRedirectUrl,
        createdAt: new Date().toISOString(),
      })
      scheduleRedirectToMomence(getThankYouUrl(), 450)
    } catch (error) {
      console.error("Submission error:", error)
      setStatusMessage({ text: "An error occurred. Please try again.", tone: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid =
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.email.trim() &&
    formData.phone.trim() &&
    formData.studio &&
    formData.classFormat &&
    formData.acceptedTerms

  return (
    <div className="relative min-h-screen w-full overflow-x-auto bg-white">
      <canvas ref={confettiCanvasRef} className="pointer-events-none fixed inset-0 z-[70] h-full w-full" />

      <div className="relative grid min-h-screen w-full min-w-0 lg:grid-cols-[40%_60%]">
        <div className="relative hidden h-screen overflow-hidden bg-slate-950 lg:block">
          <AnimatePresence>
            <motion.div
              key={currentHeroImage}
              className="absolute inset-0 overflow-hidden bg-slate-950"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
            >
              <img
                src={HERO_IMAGES[currentHeroImage]}
                alt="Physique 57 India studio class"
                className="h-full w-full object-cover object-top"
              />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-slate-950/45" />
          <div className="absolute inset-x-0 bottom-0 p-12 text-white">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Choose your format</span>
            <h1 className="mb-4 mt-3 max-w-md text-5xl font-semibold leading-[1.05]">One trial. Three ways to move.</h1>
            <p className="max-w-lg text-base text-white/80">
              Barre 57, powerCycle, or Strength Lab — pick the format that fits, at either Physique 57 India studio.
            </p>
          </div>
        </div>

        <div className="relative min-h-screen min-w-0 bg-white lg:h-screen lg:overflow-y-auto">
          <div className="mx-auto w-full min-w-0 max-w-[1040px] px-4 pb-16 pt-10 sm:px-6 lg:px-10">
            {showSuccessModal ? (
              <div className="flex min-h-[78vh] items-center justify-center">
                <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white px-8 py-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-950">
                    <CheckCircle2 className="h-7 w-7 text-white" />
                  </div>
                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Request received</p>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-950">Thanks — your trial is booked in</h2>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
                    A member of our Customer Excellence team will be in touch shortly to confirm your studio session.
                  </p>
                  <Button className="mt-8 w-full bg-slate-950 py-6 text-base text-white hover:bg-slate-800" onClick={() => window.location.assign(redirectUrl)}>
                    Continue
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">All formats trial</span>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">Book your free class</h2>
                  <p className="mt-2 text-sm text-slate-600">Pick a studio, pick a format, and we'll take it from there.</p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-10">
                  <div className="space-y-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Your details</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="font-medium text-slate-800">
                          First name <span className="text-red-600">*</span>
                        </Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(event) => handleInputChange("firstName", event.target.value)}
                          className={cn("h-11 border-slate-300 focus:border-slate-900 focus:ring-slate-900/10", errors.firstName && "border-red-500")}
                        />
                        {errors.firstName && <p className="text-sm text-red-600">{errors.firstName}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="font-medium text-slate-800">
                          Last name <span className="text-red-600">*</span>
                        </Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(event) => handleInputChange("lastName", event.target.value)}
                          className={cn("h-11 border-slate-300 focus:border-slate-900 focus:ring-slate-900/10", errors.lastName && "border-red-500")}
                        />
                        {errors.lastName && <p className="text-sm text-red-600">{errors.lastName}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="font-medium text-slate-800">
                          Email <span className="text-red-600">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(event) => handleInputChange("email", event.target.value)}
                          className={cn("h-11 border-slate-300 focus:border-slate-900 focus:ring-slate-900/10", errors.email && "border-red-500")}
                        />
                        {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="font-medium text-slate-800">
                          Phone number <span className="text-red-600">*</span>
                        </Label>
                        <div className="grid grid-cols-[56px_minmax(0,1fr)] items-stretch gap-2">
                          <Select value={formData.countryCode} onValueChange={(value) => handleInputChange("countryCode", value)}>
                            <SelectTrigger size="lg" className="h-11 w-[56px] min-w-[56px] shrink-0 justify-center border-slate-300 px-2">
                              <SelectValue placeholder="Code">
                                <span className="text-base leading-none">{getCountryOption(formData.countryCode)?.flag}</span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="border-slate-300 bg-white">
                              {countryCodes.map((item, index) => (
                                <SelectItem key={`${item.code}-${item.country}-${index}`} value={item.country}>
                                  <div className="flex items-center gap-2">
                                    <span>{item.flag}</span>
                                    <span className="font-medium">{item.code}</span>
                                    <span className="text-xs text-slate-500">{item.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            id="phone"
                            placeholder="98765 43210"
                            value={formData.phone}
                            onChange={(event) => handleInputChange("phone", event.target.value)}
                            className={cn("h-11 flex-1 border-slate-300 focus:border-slate-900 focus:ring-slate-900/10", errors.phone && "border-red-500")}
                          />
                        </div>
                        {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Studio</p>
                    <div className="space-y-2">
                      <Label htmlFor="studio" className="font-medium text-slate-800">
                        Preferred studio <span className="text-red-600">*</span>
                      </Label>
                      <Select value={formData.studio} onValueChange={(value) => handleInputChange("studio", value)}>
                        <SelectTrigger size="lg" className={cn("w-full border-slate-300 focus:border-slate-900 focus:ring-slate-900/10", errors.studio && "border-red-500")}>
                          <SelectValue placeholder="Select a studio" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-300 bg-white">
                          {studios.map((studio) => (
                            <SelectItem key={studio.name} value={studio.name}>
                              <div>
                                <div className="font-medium">{studio.name}</div>
                                <div className="text-xs text-slate-500">{studio.location}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.studio && <p className="text-sm text-red-600">{errors.studio}</p>}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Class format</p>
                    {!formData.studio ? (
                      <p className="text-sm text-slate-500">Select a studio to see available formats.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {FORMAT_CARDS.filter((format) => availableFormats.includes(format.value)).map((format) => {
                          const isSelected = formData.classFormat === format.value
                          const isHovered = hoveredFormat === format.value
                          return (
                            <div
                              key={format.value}
                              className="relative"
                              onMouseEnter={() => setHoveredFormat(format.value)}
                              onMouseLeave={() => setHoveredFormat((prev) => (prev === format.value ? null : prev))}
                            >
                              <AnimatePresence>
                                {isHovered ? (
                                  <motion.div
                                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute bottom-full left-0 right-0 z-20 mb-2 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xl"
                                  >
                                    <p className="text-sm font-semibold text-slate-950">{format.label}</p>
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-slate-500">
                                      <span>Intensity: {format.intensity}</span>
                                      <span>Duration: {format.duration}</span>
                                    </div>
                                    <p className="mt-2 text-xs font-medium text-slate-700">Best for: {format.bestFor}</p>
                                    <ul className="mt-2 space-y-1">
                                      {format.highlights.map((highlight) => (
                                        <li key={highlight} className="flex gap-1.5 text-xs leading-snug text-slate-600">
                                          <span className="text-slate-400">•</span>
                                          <span>{highlight}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </motion.div>
                                ) : null}
                              </AnimatePresence>
                              <button
                                type="button"
                                onClick={() => handleInputChange("classFormat", format.value)}
                                className={cn(
                                  "group w-full overflow-hidden rounded-xl border text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
                                  isSelected ? "border-slate-950 ring-1 ring-slate-950" : "border-slate-200 hover:border-slate-400"
                                )}
                              >
                                <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-100">
                                  <img
                                    src={format.image}
                                    alt={format.imageAlt}
                                    className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                                  />
                                  <span className="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                                    {format.tag}
                                  </span>
                                </div>
                                <div className="p-3">
                                  <p className="text-sm font-semibold text-slate-950">{format.label}</p>
                                  <p className="mt-1 text-xs leading-snug text-slate-600">{format.description}</p>
                                </div>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {errors.classFormat && <p className="text-sm text-red-600">{errors.classFormat}</p>}
                  </div>

                  <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={formData.acceptedTerms}
                        onCheckedChange={(checked) => handleInputChange("acceptedTerms", Boolean(checked))}
                        className={cn("mt-0.5 h-5 w-5 rounded-md border-slate-400 data-[state=checked]:border-slate-950 data-[state=checked]:bg-slate-950", errors.acceptedTerms && "border-red-500")}
                      />
                      <div className="flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <label htmlFor="terms" className="cursor-pointer text-sm font-medium text-slate-800">
                            I have read and accept the waiver. <span className="text-red-600">*</span>
                          </label>
                          <button type="button" className="text-left text-xs font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-950" onClick={() => setShowWaiverModal(true)}>
                            View waiver
                          </button>
                        </div>
                      </div>
                    </div>
                    {errors.acceptedTerms && <p className="text-sm text-red-600">{errors.acceptedTerms}</p>}
                  </div>

                  {statusMessage && (
                    <div className={cn("rounded-xl border px-4 py-3 text-sm", statusMessage.tone === "error" ? "border-red-300 bg-red-50 text-red-800" : "border-emerald-300 bg-emerald-50 text-emerald-800")}>
                      {statusMessage.text}
                    </div>
                  )}

                  <Button
                    id="combined-submit-button"
                    type="submit"
                    size="lg"
                    className="h-13 w-full bg-slate-950 text-base text-white hover:bg-slate-800"
                    disabled={isSubmitting || !isFormValid}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Booking your trial...
                      </>
                    ) : (
                      "Book my free trial"
                    )}
                  </Button>
                </form>

                <section className="mt-20 space-y-8">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Why Physique 57</span>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">Key benefits</h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {keyBenefits.map((benefit) => {
                      const Icon = benefitIcons[benefit.icon]
                      return (
                        <div key={benefit.title} className="rounded-xl border border-slate-200 p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                          <div className="flex items-start gap-4">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-950">
                              <Icon className="h-4.5 w-4.5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-slate-950">{benefit.title}</h3>
                              <p className="mt-1 text-sm leading-relaxed text-slate-600">{benefit.description}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>

                <section className="mt-20 space-y-8">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Studios</span>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">Choose your studio</h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {studios.map((studio) => (
                      <div key={studio.name} className="rounded-xl border border-slate-200 p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                        <div className="flex items-start gap-4">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <Building2 className="h-5 w-5 text-slate-700" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-slate-950">{studio.name}</h3>
                            <p className="mt-1 text-xs text-slate-500">{studio.description}</p>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2 text-xs text-slate-600">
                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                            <span>{studio.address}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Phone className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                            <span>{studio.phone}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Clock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                            <span>{studio.hours}</span>
                          </div>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${studio.lat},${studio.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 underline underline-offset-2"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          Get directions
                        </a>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mt-20 space-y-8 overflow-hidden">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Member stories</span>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">What members say</h2>
                  </div>
                  <div
                    className="relative overflow-hidden"
                    onMouseEnter={() => setIsReviewPaused(true)}
                    onMouseLeave={() => setIsReviewPaused(false)}
                  >
                    <motion.div
                      animate={{ x: `calc(50% - ${currentReview * REVIEW_CARD_STRIDE + REVIEW_CARD_CENTER_OFFSET}px)` }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                      className="flex gap-4"
                    >
                      {clientReviews.map((review, index) => {
                        const isActive = index === currentReview
                        return (
                          <motion.div
                            key={`${review.name}-${index}`}
                            animate={{
                              scale: isActive ? 1 : 0.94,
                              opacity: Math.abs(index - currentReview) <= 2 ? (isActive ? 1 : 0.55) : 0.2,
                            }}
                            transition={{ duration: 0.4 }}
                            style={{ width: REVIEW_CARD_WIDTH }}
                            className={cn(
                              "flex-shrink-0 rounded-xl border p-5 transition-shadow duration-200 hover:shadow-lg",
                              isActive ? "border-slate-950 shadow-md" : "border-slate-200"
                            )}
                          >
                            <p className="text-sm leading-relaxed text-slate-700">"{review.review}"</p>
                            <div className="mt-4 flex items-center gap-3">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                                {review.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-950">{review.name}</p>
                                <p className="text-xs text-slate-500">{review.class} • {review.date}</p>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </motion.div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {clientReviews.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentReview(index)}
                        className={cn(
                          "h-2 rounded-full transition-all duration-300",
                          currentReview === index ? "w-6 bg-slate-950" : "w-2 bg-slate-300 hover:bg-slate-500"
                        )}
                        aria-label={`View review ${index + 1}`}
                      />
                    ))}
                  </div>
                </section>

                <section className="mt-20 space-y-8 pb-2">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Questions</span>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">Before you book</h2>
                  </div>
                  <div className="space-y-2">
                    {faqs.slice(0, 6).map((faq, index) => (
                      <div key={faq.question} className="overflow-hidden rounded-xl border border-slate-200">
                        <button
                          onClick={() => setOpenFaq(openFaq === index ? null : index)}
                          className="flex w-full items-center justify-between px-5 py-4 text-left"
                        >
                          <span className="pr-4 text-sm font-medium text-slate-900">{faq.question}</span>
                          <ChevronDown className={cn("h-4 w-4 flex-shrink-0 text-slate-500 transition-transform", openFaq === index && "rotate-180")} />
                        </button>
                        <AnimatePresence>
                          {openFaq === index ? (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                              <div className="space-y-2 border-t border-slate-200 px-5 pb-4 pt-4 text-sm leading-relaxed text-slate-600">
                                {faq.answer.map((paragraph, paragraphIndex) => (
                                  <p key={paragraphIndex}>{paragraph}</p>
                                ))}
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setShowAllFaqsModal(true)} className="text-sm font-semibold text-slate-900 underline underline-offset-2">
                    View all FAQs
                  </button>
                </section>
              </>
            )}
          </div>
        </div>
      </div>

      <ModalShell open={showAllFaqsModal} onClose={() => setShowAllFaqsModal(false)} className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-950">All FAQs</h3>
          <button onClick={() => setShowAllFaqsModal(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div key={faq.question} className="overflow-hidden rounded-xl border border-slate-200">
              <button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                <span className="pr-4 text-sm font-medium text-slate-900">{faq.question}</span>
                <ChevronDown className={cn("h-4 w-4 flex-shrink-0 text-slate-500 transition-transform", openFaq === index && "rotate-180")} />
              </button>
              {openFaq === index && (
                <div className="space-y-2 border-t border-slate-200 px-4 pb-3 pt-3 text-sm leading-relaxed text-slate-600">
                  {faq.answer.map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex}>{paragraph}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <Button onClick={() => setShowAllFaqsModal(false)} className="mt-6 w-full bg-slate-950 hover:bg-slate-800">
          Close
        </Button>
      </ModalShell>

      <ModalShell open={showWaiverModal} onClose={() => setShowWaiverModal(false)} className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-950">Waiver & terms</h3>
          <button onClick={() => setShowWaiverModal(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-slate-600">
          {waiverSections.map((section, sectionIndex) => (
            <div key={section.title ?? `section-${sectionIndex}`} className="space-y-3 rounded-xl border border-slate-200 p-4">
              {section.title && <h4 className="text-sm font-semibold text-slate-950">{section.title}</h4>}
              {section.paragraphs?.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex}>{paragraph}</p>
              ))}
            </div>
          ))}
        </div>
        <Button onClick={() => setShowWaiverModal(false)} className="mt-6 w-full bg-slate-950 hover:bg-slate-800">
          I understand
        </Button>
      </ModalShell>
    </div>
  )
}

interface ModalShellProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

function ModalShell({ open, onClose, children, className }: ModalShellProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
      <div className={cn("max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-8", className)} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
