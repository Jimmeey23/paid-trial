import { useEffect, useMemo, useRef, useState } from "react"
import confetti from "canvas-confetti"
import { AnimatePresence, motion } from "framer-motion"
import { parsePhoneNumberFromString, type CountryCode as PhoneCountryCode } from "libphonenumber-js/min"
import {
  Award,
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Dumbbell,
  Heart,
  Info,
  Loader2,
  MapPin,
  Minus,
  Phone,
  Plus,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  type LucideIcon,
  Users,
  X,
  Zap,
} from "lucide-react"

import {
  clientReviews,
  countryCodes,
  faqs,
  formats,
  heroImages,
  journeySteps,
  keyBenefits,
  studios,
  type Benefit,
  waiverSections,
} from "@/data/physique57"
import { cn } from "@/lib/utils"
import {
  getSubmissionTrackingPayload,
  initializeTracking,
  loadPublicClientConfig,
  trackLeadSubmission,
  type PublicClientConfig,
} from "@/lib/tracking"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export interface Physique57FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  countryCode: string
  studio: string
  format: string
  acceptedTerms: boolean
}

interface Physique57SignUpFormProps {
  onSubmit?: (data: Physique57FormData) => Promise<void> | void
  testMode?: boolean
}

type FormErrorKey = keyof Physique57FormData | "payment" | "form"

const STORAGE_KEYS = {
  formState: "physique57-react-checkout-state-v1",
  submitPayload: "physique57-react-submit-payload-v1",
  paymentSession: "physique57-react-payment-session-v1",
  checkoutPending: "physique57-react-checkout-pending-v1",
  draftId: "physique57-react-draft-id-v1",
}

const DEFAULT_REDIRECT_URL = "https://momence.com/u/physique-57-india-fffoSp"

function getInitialFormDataFromParams(): Partial<Physique57FormData> {
  if (typeof window === "undefined") {
    return {}
  }

  const params = new URLSearchParams(window.location.search)

  const get = (key: string) => params.get(key)?.trim() || ""

  const prefilled: Partial<Physique57FormData> = {}

  if (get("firstName")) prefilled.firstName = get("firstName")
  if (get("lastName")) prefilled.lastName = get("lastName")
  if (get("email")) prefilled.email = get("email")
  if (get("phone")) prefilled.phone = get("phone")
  if (get("countryCode")) prefilled.countryCode = get("countryCode").toUpperCase()

  const studioParam = get("studio").toLowerCase()
  if (studioParam) {
    const matched = studios.find(
      (s) => s.name.toLowerCase().includes(studioParam) || s.backendName.toLowerCase().includes(studioParam)
    )
    if (matched) {
      prefilled.studio = matched.name
    }
  }

  const formatParam = get("format").toLowerCase()
  if (formatParam) {
    const matched = formats.find(
      (f) => f.id.toLowerCase() === formatParam || f.subtitle.toLowerCase().replace(/\s+/g, "") === formatParam.replace(/\s+/g, "")
    )
    if (matched) {
      prefilled.format = matched.id
    }
  }

  return prefilled
}

function createEventId() {
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function buildWhatsAppMessage(formData: Physique57FormData, selectedFormat?: { backendValue?: string; subtitle: string } | null) {
  const lines = ["Hi! I'd like to book a trial class at Physique 57.", ""]

  const fullName = [formData.firstName, formData.lastName].filter(Boolean).join(" ").trim()

  if (fullName) {
    lines.push(`Name: ${fullName}`)
  }
  if (formData.email) {
    lines.push(`Email: ${formData.email}`)
  }
  if (formData.phone) {
    lines.push(`Phone: ${normalizePhoneNumber(formData.countryCode, formData.phone) || formData.phone}`)
  }
  if (formData.studio) {
    lines.push(`Preferred Studio: ${formData.studio}`)
  }
  if (selectedFormat) {
    lines.push(`Preferred Format: ${selectedFormat.backendValue ?? selectedFormat.subtitle}`)
  }

  lines.push("", "Please help me complete my booking. Thank you!")
  return lines.join("\n")
}

function getCountryOption(countrySelection: string) {
  return (
    countryCodes.find((item) => item.country === countrySelection)
    ?? countryCodes.find((item) => item.code === countrySelection)
    ?? countryCodes.find((item) => item.country === "IN")
    ?? countryCodes[0]
  )
}

function normalizePhoneNumber(countrySelection: string, phone: string) {
  const normalizedPhone = phone.trim()
  if (!normalizedPhone) {
    return ""
  }

  const country = getCountryOption(countrySelection)
  const parsed = parsePhoneNumberFromString(normalizedPhone, country.country as PhoneCountryCode)
  return parsed?.isValid() ? parsed.number : ""
}

function getCountryIsoFromCode(countrySelection: string) {
  return getCountryOption(countrySelection)?.country || "IN"
}

function getPhoneValidationMessage(countrySelection: string, phone: string) {
  if (!phone.trim()) {
    return "Phone number is required"
  }

  const country = getCountryOption(countrySelection)
  const parsed = parsePhoneNumberFromString(phone.trim(), country.country as PhoneCountryCode)

  if (!parsed || !parsed.isValid()) {
    return `Enter a valid phone number for ${country.name}`
  }

  return null
}

const benefitIcons: Record<Benefit["icon"], LucideIcon> = {
  sparkles: Sparkles,
  trophy: Trophy,
  shield: Shield,
  heart: Heart,
  award: Award,
  users: Users,
  target: Target,
  zap: Zap,
}

const colorClasses = {
  blue: {
    border: "border-l-blue-600",
    iconBg: "from-blue-500 to-blue-700",
    hoverText: "group-hover:text-blue-600",
  },
  amber: {
    border: "border-l-amber-500",
    iconBg: "from-amber-400 to-amber-600",
    hoverText: "group-hover:text-amber-600",
  },
  emerald: {
    border: "border-l-emerald-500",
    iconBg: "from-emerald-400 to-emerald-600",
    hoverText: "group-hover:text-emerald-600",
  },
  rose: {
    border: "border-l-rose-500",
    iconBg: "from-rose-400 to-rose-600",
    hoverText: "group-hover:text-rose-600",
  },
  violet: {
    border: "border-l-violet-500",
    iconBg: "from-violet-400 to-violet-600",
    hoverText: "group-hover:text-violet-600",
  },
  cyan: {
    border: "border-l-cyan-500",
    iconBg: "from-cyan-400 to-cyan-600",
    hoverText: "group-hover:text-cyan-600",
  },
  orange: {
    border: "border-l-orange-500",
    iconBg: "from-orange-400 to-orange-600",
    hoverText: "group-hover:text-orange-600",
  },
  indigo: {
    border: "border-l-indigo-500",
    iconBg: "from-indigo-400 to-indigo-600",
    hoverText: "group-hover:text-indigo-600",
  },
} as const

const REVIEW_CARD_WIDTH = 352
const REVIEW_CARD_GAP = 24
const REVIEW_CARD_STRIDE = REVIEW_CARD_WIDTH + REVIEW_CARD_GAP
const REVIEW_CARD_CENTER_OFFSET = REVIEW_CARD_WIDTH / 2

const floatingDecor = [
  { top: "8%", left: "8%", icon: Dumbbell },
  { top: "18%", left: "82%", icon: Heart },
  { top: "32%", left: "14%", icon: Sparkles },
  { top: "44%", left: "88%", icon: Award },
  { top: "58%", left: "10%", icon: Dumbbell },
  { top: "68%", left: "78%", icon: Heart },
  { top: "82%", left: "18%", icon: Sparkles },
  { top: "88%", left: "86%", icon: Award },
]

const featuredFaqs = faqs.slice(0, 8)

const studioThemes = {
  "Supreme HQ, Bandra": {
    accentText: "text-rose-950",
    accentMuted: "text-rose-900/80",
    pillBorder: "border-rose-900/30",
    pillBg: "from-rose-950/10 to-rose-800/10",
    cardBorder: "border-rose-950/20 hover:border-rose-900/50",
    cardBg: "from-white/95 to-rose-50/55",
    iconBg: "from-rose-900 via-rose-800 to-red-700",
    itemIconBg: "from-rose-100 to-rose-200",
    itemIconText: "text-rose-900",
    buttonBg: "from-rose-900 to-red-700 hover:from-rose-950 hover:to-red-800",
    hoverTitle: "group-hover:text-rose-900",
    mapRing: "border-rose-200",
  },
  "Kwality House, Kemps Corner": {
    accentText: "text-emerald-950",
    accentMuted: "text-emerald-900/80",
    pillBorder: "border-emerald-900/30",
    pillBg: "from-emerald-950/10 to-emerald-800/10",
    cardBorder: "border-emerald-950/20 hover:border-emerald-900/50",
    cardBg: "from-white/95 to-emerald-50/55",
    iconBg: "from-emerald-950 via-emerald-800 to-green-700",
    itemIconBg: "from-emerald-100 to-emerald-200",
    itemIconText: "text-emerald-900",
    buttonBg: "from-emerald-900 to-green-700 hover:from-emerald-950 hover:to-green-800",
    hoverTitle: "group-hover:text-emerald-900",
    mapRing: "border-emerald-200",
  },
} as const

function ModalShell({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 20 }}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "w-full rounded-3xl border border-white/10 bg-card p-6 shadow-2xl",
              className
            )}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function Physique57SignUpForm({ onSubmit, testMode = false }: Physique57SignUpFormProps) {
  const scheduleHostRef = useRef<HTMLDivElement | null>(null)
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const confettiInstanceRef = useRef<ReturnType<typeof confetti.create> | null>(null)
  const redirectTimeoutRef = useRef<number | null>(null)
  const partialSaveTimeoutRef = useRef<number | null>(null)
  const draftIdRef = useRef<string>(createEventId())
  const lastPartialPayloadRef = useRef("")
  const eventIdRef = useRef<string>(createEventId())
  const publicConfigRef = useRef<PublicClientConfig | null>(null)
  const hasRestoredStateRef = useRef(false)
  const hasProcessedCheckoutReturnRef = useRef(false)
  const isAutoSubmittingRef = useRef(false)
  const [formData, setFormData] = useState<Physique57FormData>(() => ({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    countryCode: "IN",
    studio: "",
    format: "powercycle",
    acceptedTerms: false,
    ...getInitialFormDataFromParams(),
  }))
  const [errors, setErrors] = useState<Partial<Record<FormErrorKey, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false)
  const [paymentSessionId, setPaymentSessionId] = useState("")
  const [paymentVerified, setPaymentVerified] = useState(false)
  const [isPostPaymentProcessing, setIsPostPaymentProcessing] = useState(() => {
    if (typeof window === "undefined") {
      return false
    }

    const params = new URLSearchParams(window.location.search)
    return params.get("payment") === "success" && Boolean(params.get("session_id"))
  })
  const [statusMessage, setStatusMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showFormatInfo, setShowFormatInfo] = useState<string | null>(null)
  const [showWaiverModal, setShowWaiverModal] = useState(false)
  const [showAllFaqsModal, setShowAllFaqsModal] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [currentHeroImage, setCurrentHeroImage] = useState(0)
  const [loadedHeroImages, setLoadedHeroImages] = useState<Set<number>>(new Set())
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [currentReview, setCurrentReview] = useState(Math.floor(clientReviews.length / 2))
  const [publicConfig, setPublicConfig] = useState<PublicClientConfig | null>(null)

  const isTestRoute = testMode

  const selectedStudio = useMemo(
    () => studios.find((studio) => studio.name === formData.studio),
    [formData.studio]
  )

  const selectedFormat = useMemo(
    () => formats.find((format) => format.id === formData.format),
    [formData.format]
  )

  const activeFormat = showFormatInfo ? formats.find((item) => item.id === showFormatInfo) ?? null : null

  const availableFormats = useMemo(() => {
    const allowedFormatIds = isTestRoute
      ? new Set(["powercycle", "strength-lab"])
      : null

    if (!selectedStudio) {
      return allowedFormatIds ? formats.filter((format) => allowedFormatIds.has(format.id)) : formats
    }

    return formats.filter((format) => {
      if (!selectedStudio.formats.includes(format.id)) {
        return false
      }

      return allowedFormatIds ? allowedFormatIds.has(format.id) : true
    })
  }, [isTestRoute, selectedStudio])

  const isFormValid =
    formData.firstName.trim() !== "" &&
    formData.lastName.trim() !== "" &&
    formData.email.trim() !== "" &&
    /\S+@\S+\.\S+/.test(formData.email) &&
    getPhoneValidationMessage(formData.countryCode, formData.phone) === null &&
    formData.studio !== "" &&
    formData.acceptedTerms

  const activePaymentStage = publicConfig?.defaultPaymentStage ?? "production"
  const effectivePaymentStage = isTestRoute ? "testing" : activePaymentStage
  const primaryButtonLabel = "Submit"

  const shouldHideFormForProcessing = isPostPaymentProcessing && !showSuccessModal
  const scheduleRedirectUrl = selectedStudio?.scheduleLocationId
    ? `/schedule-mum?locationId=${encodeURIComponent(selectedStudio.scheduleLocationId)}`
    : "/schedule-mum"

  function redirectToSelectedStudioSchedule() {
    if (typeof window === "undefined") {
      return
    }

    window.location.assign(scheduleRedirectUrl)
  }

  function scheduleRedirectToStudioSchedule(delay = 2600) {
    if (typeof window === "undefined") {
      return
    }

    if (redirectTimeoutRef.current) {
      window.clearTimeout(redirectTimeoutRef.current)
    }

    redirectTimeoutRef.current = window.setTimeout(() => {
      redirectToSelectedStudioSchedule()
    }, delay)
  }

  async function ensureTrackingReady() {
    let config = publicConfigRef.current

    if (!config) {
      try {
        config = await loadPublicClientConfig()
        publicConfigRef.current = config
        setPublicConfig((current) => current ?? config)
        initializeTracking(config)
      } catch {
        return null
      }
    }

    return config
  }

  async function trackSuccessfulSubmission(leadPayload: { event_id?: string; utm_campaign?: string; utm_source?: string }) {
    const config = await ensureTrackingReady()
    trackLeadSubmission(config, leadPayload)
  }

  function buildPartialLeadPayload(): Record<string, string> {
    const trackingPayload = getSubmissionTrackingPayload() as Record<string, string>

    return {
      draft_id: draftIdRef.current,
      event_id: eventIdRef.current,
      session_id: paymentSessionId,
      status: paymentVerified && paymentSessionId ? "payment_verified" : "in_progress",
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phoneNumber: formData.phone.trim(),
      phoneCountry: getCountryIsoFromCode(formData.countryCode),
      center: selectedStudio?.backendName ?? formData.studio,
      time: "Flexible / Needs Recommendation",
      type: selectedFormat?.backendValue ?? formData.format,
      waiverAccepted: formData.acceptedTerms ? "accepted" : "",
      ...trackingPayload,
    }
  }

  useEffect(() => {
    const imageNodes = heroImages.map((src, index) => {
      const image = new window.Image()

      image.onload = () => {
        setLoadedHeroImages((prev) => {
          if (prev.has(index)) {
            return prev
          }

          const next = new Set(prev)
          next.add(index)
          return next
        })
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
    return () => {
      if (redirectTimeoutRef.current && typeof window !== "undefined") {
        window.clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!loadedHeroImages.has(currentHeroImage)) {
      return
    }

    const heroInterval = window.setInterval(() => {
      setCurrentHeroImage((prev) => {
        const next = (prev + 1) % heroImages.length
        return loadedHeroImages.has(next) ? next : prev
      })
    }, 6500)

    return () => {
      window.clearInterval(heroInterval)
    }
  }, [currentHeroImage, loadedHeroImages])

  useEffect(() => {
    const reviewTimeout = window.setTimeout(() => {
      setCurrentReview((prev) => (prev + 1) % clientReviews.length)
    }, 3000)

    return () => {
      window.clearTimeout(reviewTimeout)
    }
  }, [currentReview])

  useEffect(() => {
    const style = document.createElement("style")
    style.innerHTML = `
      :root {
        --momenceColorBackground: #FBFBFB;
        --momenceColorPrimary: 0, 100, 250;
        --momenceColorBlack: 3, 1, 13;
      }
    `
    document.head.appendChild(style)

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const config = await loadPublicClientConfig()
        if (!cancelled) {
          publicConfigRef.current = config
          setPublicConfig(config)
          initializeTracking(config)
        }
      } catch {
        // Tracking config is optional for the booking flow itself.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])


            const cachedPayloadRaw = window.sessionStorage.getItem(STORAGE_KEYS.submitPayload)
            const cachedPayload = cachedPayloadRaw ? JSON.parse(cachedPayloadRaw) : null
            const fallbackPayload = cachedPayload ?? buildLeadPayload()
  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    try {
      const storedState = window.sessionStorage.getItem(STORAGE_KEYS.formState)
      const storedSessionId = window.sessionStorage.getItem(STORAGE_KEYS.paymentSession)
      const storedDraftId = window.sessionStorage.getItem(STORAGE_KEYS.draftId)

      if (storedState) {
        const parsed = JSON.parse(storedState) as {
          formData?: Partial<Physique57FormData>
          eventId?: string
        }

        if (parsed.formData) {
          const restoredCountry = typeof parsed.formData.countryCode === "string"
            ? getCountryIsoFromCode(parsed.formData.countryCode)
            : undefined

          setFormData((prev) => ({
            ...prev,
            ...parsed.formData,
            ...(restoredCountry ? { countryCode: restoredCountry } : {}),
          }))
        }

        if (parsed.eventId) {
          eventIdRef.current = parsed.eventId
        }
      }

      if (storedSessionId) {
        setPaymentSessionId(storedSessionId)
      }

      if (storedDraftId) {
        draftIdRef.current = storedDraftId
      }
    } catch {
      // Ignore storage restoration failures.
    } finally {
      hasRestoredStateRef.current = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !hasRestoredStateRef.current) {
      return
    }

    try {
      window.sessionStorage.setItem(
        STORAGE_KEYS.formState,
        JSON.stringify({ formData, eventId: eventIdRef.current })
      )
      window.sessionStorage.setItem(STORAGE_KEYS.draftId, draftIdRef.current)

      if (paymentSessionId) {
        window.sessionStorage.setItem(STORAGE_KEYS.paymentSession, paymentSessionId)
      } else {
        window.sessionStorage.removeItem(STORAGE_KEYS.paymentSession)
      }
    } catch {
      // Ignore persistence failures.
    }
  }, [formData, paymentSessionId])

  useEffect(() => {
    if (typeof window === "undefined" || !hasRestoredStateRef.current || showSuccessModal) {
      return
    }

    const partialPayload = buildPartialLeadPayload()
    const hasMeaningfulDraftData = Boolean(
      partialPayload.firstName ||
      partialPayload.lastName ||
      partialPayload.email ||
      partialPayload.phoneNumber ||
      partialPayload.center ||
      partialPayload.type ||
      partialPayload.waiverAccepted ||
      partialPayload.utm_source ||
      partialPayload.utm_medium ||
      partialPayload.utm_campaign ||
      partialPayload.gclid ||
      partialPayload.fbclid
    )

    if (!hasMeaningfulDraftData) {
      return
    }

    const payloadSignature = JSON.stringify(partialPayload)
    if (lastPartialPayloadRef.current === payloadSignature) {
      return
    }

    if (partialSaveTimeoutRef.current) {
      window.clearTimeout(partialSaveTimeoutRef.current)
    }

    partialSaveTimeoutRef.current = window.setTimeout(() => {
      void fetch("/api/partial-lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payloadSignature,
      }).then((response) => {
        if (response.ok) {
          lastPartialPayloadRef.current = payloadSignature
        }
      }).catch(() => {
        // Ignore draft persistence issues; they should never block conversion.
      })
    }, 700)

    return () => {
      if (partialSaveTimeoutRef.current) {
        window.clearTimeout(partialSaveTimeoutRef.current)
      }
    }
  }, [formData, paymentSessionId, paymentVerified, selectedFormat, selectedStudio, showSuccessModal])

  useEffect(() => {
    if (!confettiCanvasRef.current) {
      return
    }

    confettiInstanceRef.current = confetti.create(confettiCanvasRef.current, {
      resize: true,
      useWorker: true,
    })

    return () => {
      confettiInstanceRef.current?.reset()
      confettiInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!showSchedule || !scheduleHostRef.current) {
      return
    }

    const host = scheduleHostRef.current
    host.innerHTML = ""

    const ribbonContainer = document.createElement("div")
    ribbonContainer.id = "ribbon-schedule"
    host.appendChild(ribbonContainer)

    const script = document.createElement("script")
    script.async = true
    script.type = "module"
    script.setAttribute("host_id", "13752")
    script.setAttribute("teacher_ids", "[]")
    script.setAttribute("location_ids", `[${selectedStudio?.scheduleLocationId ?? "9030"}]`)
    script.setAttribute("tag_ids", "[284832]")
    script.setAttribute("session_type", "class")
    script.setAttribute("hide_tags", "true")
    script.setAttribute("default_filter", "show-all")
    script.setAttribute("locale", "en")
    script.setAttribute("lock_timezone", "Asia/Kolkata")
    script.src = "https://momence.com/plugin/host-schedule/host-schedule.js"
    host.appendChild(script)

    return () => {
      host.innerHTML = ""
    }
  }, [selectedStudio, showSchedule])

  useEffect(() => {
    if (formData.format && !availableFormats.some((format) => format.id === formData.format)) {
      setFormData((prev) => ({ ...prev, format: availableFormats[0]?.id ?? "powercycle" }))
    }
  }, [availableFormats, formData.format])

  useEffect(() => {
    if (typeof window === "undefined" || !hasRestoredStateRef.current || hasProcessedCheckoutReturnRef.current) {
      return
    }

    const params = new URLSearchParams(window.location.search)
    const paymentStatus = params.get("payment")
    const returnedSessionId = params.get("session_id")
    const hasPendingCheckout = window.sessionStorage.getItem(STORAGE_KEYS.checkoutPending) === "true"

    if (paymentStatus === "cancelled") {
      setIsPostPaymentProcessing(false)
      try {
        window.sessionStorage.removeItem(STORAGE_KEYS.paymentSession)
        window.sessionStorage.removeItem(STORAGE_KEYS.checkoutPending)
      } catch {
        // Ignore storage cleanup failures.
      }

      setPaymentVerified(false)
      setPaymentSessionId("")
      setStatusMessage({ tone: "error", text: "Checkout was cancelled. You can try again whenever you're ready." })
      hasProcessedCheckoutReturnRef.current = true

      try {
        window.history.replaceState({}, document.title, window.location.pathname)
      } catch {
        // Ignore history replacement failures.
      }

      return
    }

    if (!returnedSessionId || paymentStatus !== "success") {
      setIsPostPaymentProcessing(false)
      return
    }

    setIsPostPaymentProcessing(true)
    hasProcessedCheckoutReturnRef.current = true

    void (async () => {
      try {
        setStatusMessage({ tone: "success", text: "Verifying your payment and finishing the booking..." })
        const response = await fetch(`/api/verify-payment?session_id=${encodeURIComponent(returnedSessionId)}`)
        const result = await response.json().catch(() => ({}))

        if (!response.ok || !result.paid) {
          setPaymentVerified(false)
          setPaymentSessionId("")
          setIsPostPaymentProcessing(false)
          if (response.status === 404) {
            try {
              window.sessionStorage.removeItem(STORAGE_KEYS.paymentSession)
              window.sessionStorage.removeItem(STORAGE_KEYS.submitPayload)
              window.sessionStorage.removeItem(STORAGE_KEYS.checkoutPending)
            } catch {
              // Ignore storage cleanup failures.
            }
          }
          setStatusMessage({ tone: "error", text: result.error || "Payment could not be verified yet." })
          return
        }

        setPaymentVerified(true)
        setPaymentSessionId(result.paymentSessionId || returnedSessionId)
        try {
          window.sessionStorage.removeItem(STORAGE_KEYS.checkoutPending)
        } catch {
          // Ignore storage cleanup failures.
        }
        setStatusMessage({
          tone: result.fulfilled === false ? "success" : "success",
          text: result.fulfilled === false
            ? (result.fulfillmentError || "Payment confirmed. We’re completing your booking details now.")
            : "Payment confirmed. Finalising your booking now...",
        })

        if (result.leadSubmission?.success) {
          try {
            window.sessionStorage.removeItem(STORAGE_KEYS.formState)
            window.sessionStorage.removeItem(STORAGE_KEYS.submitPayload)
            window.sessionStorage.removeItem(STORAGE_KEYS.paymentSession)
            window.sessionStorage.removeItem(STORAGE_KEYS.checkoutPending)
            window.sessionStorage.removeItem(STORAGE_KEYS.draftId)
          } catch {
            // Ignore storage cleanup failures.
          }

          eventIdRef.current = createEventId()
          draftIdRef.current = createEventId()
          lastPartialPayloadRef.current = ""
          setPaymentVerified(false)
          setPaymentSessionId("")
          await trackSuccessfulSubmission({
            event_id: result.paymentSessionId || returnedSessionId,
            utm_campaign: typeof fallbackPayload?.utm_campaign === "string" ? fallbackPayload.utm_campaign : undefined,
            utm_source: typeof fallbackPayload?.utm_source === "string" ? fallbackPayload.utm_source : undefined,
          })
          await celebrateSuccess()
          setStatusMessage({
            tone: "success",
            text: result.leadSubmission.error || result.leadSubmission.warning || "Your details have been received. A member of our team will get in touch shortly.",
          })
          setShowSuccessModal(true)
          setIsPostPaymentProcessing(false)
          scheduleRedirectToStudioSchedule()
          return
        }

        if ((cachedPayload || hasPendingCheckout || isFormValid) && !isAutoSubmittingRef.current) {
          isAutoSubmittingRef.current = true
          await submitLeadToApi({
            ...fallbackPayload,
            payment_session_id: result.paymentSessionId || returnedSessionId,
          })
        } else {
          setIsPostPaymentProcessing(false)
          setStatusMessage({ tone: "success", text: "Payment confirmed. You can complete your booking now." })
        }
      } catch {
        setPaymentVerified(false)
        setPaymentSessionId("")
        setIsPostPaymentProcessing(false)
        setStatusMessage({ tone: "error", text: "Unable to verify payment right now. Please try again." })
      } finally {
        try {
          window.history.replaceState({}, document.title, window.location.pathname)
        } catch {
          // Ignore history replacement failures.
        }
      }
    })()
  }, [paymentSessionId])

  function handleInputChange<K extends keyof Physique57FormData>(field: K, value: Physique57FormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
    if (errors.form || errors.payment) {
      setErrors((prev) => ({ ...prev, form: undefined, payment: undefined }))
    }
    if (statusMessage) {
      setStatusMessage(null)
    }
  }

  function validateForm() {
    const nextErrors: Partial<Record<FormErrorKey, string>> = {}

    if (!formData.firstName.trim()) nextErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) nextErrors.lastName = "Last name is required"
    if (!formData.email.trim()) nextErrors.email = "Email is required"
    else if (!/\S+@\S+\.\S+/.test(formData.email)) nextErrors.email = "Enter a valid email"
    const phoneValidationMessage = getPhoneValidationMessage(formData.countryCode, formData.phone)
    if (phoneValidationMessage) nextErrors.phone = phoneValidationMessage
    if (!formData.studio) nextErrors.studio = "Please select a studio"
    if (!selectedFormat) nextErrors.format = "Please choose a valid format"
    if (!formData.acceptedTerms) nextErrors.acceptedTerms = "You must accept the terms"

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function buildLeadPayload() {
    const normalizedPhone = normalizePhoneNumber(formData.countryCode, formData.phone)
    const trackingPayload = getSubmissionTrackingPayload()

    return {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phoneNumber: normalizedPhone,
      phoneCountry: getCountryIsoFromCode(formData.countryCode),
      center: selectedStudio?.backendName ?? formData.studio,
      time: "Flexible / Needs Recommendation",
      type: selectedFormat?.backendValue ?? formData.format,
      waiverAccepted: "accepted",
      stage: effectivePaymentStage,
      returnPath: isTestRoute ? "/test" : "/",
      event_id: eventIdRef.current,
      source_form: isTestRoute ? "physique57-test-free-route" : "free-trial-form",
      bypassPayment: true,
      ...trackingPayload,
    }
  }

  async function submitLeadToApi(payload: Record<string, unknown>) {
    setIsSubmitting(true)
    setIsPostPaymentProcessing(true)
    setStatusMessage({ tone: "success", text: "Submitting your request and syncing the booking workflow..." })

    try {
      const response = await fetch("/api/submit-lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok || !result.success) {
        if (result.stored) {
          try {
            window.sessionStorage.removeItem(STORAGE_KEYS.formState)
            window.sessionStorage.removeItem(STORAGE_KEYS.submitPayload)
            window.sessionStorage.removeItem(STORAGE_KEYS.paymentSession)
            window.sessionStorage.removeItem(STORAGE_KEYS.checkoutPending)
            window.sessionStorage.removeItem(STORAGE_KEYS.draftId)
          } catch {
            // Ignore storage cleanup failures.
          }

          eventIdRef.current = createEventId()
          draftIdRef.current = createEventId()
          lastPartialPayloadRef.current = ""
          setPaymentVerified(false)
          setPaymentSessionId("")
          await trackSuccessfulSubmission(payload as { event_id?: string; utm_campaign?: string; utm_source?: string })
          await celebrateSuccess()

          if (onSubmit) {
            await onSubmit(formData)
          }

          setStatusMessage({
            tone: "success",
            text: result.error || "Your details have been received. A member of our team will get in touch shortly.",
          })
          setShowSuccessModal(true)
          setIsPostPaymentProcessing(false)
          scheduleRedirectToStudioSchedule()
          return
        }

        if (response.status === 400 && result.fieldErrors) {
          const fieldErrors = result.fieldErrors as Record<string, string>
          setErrors({
            firstName: fieldErrors.firstName,
            lastName: fieldErrors.lastName,
            email: fieldErrors.email,
            phone: fieldErrors.phoneNumber,
            studio: fieldErrors.center,
            format: fieldErrors.type,
            acceptedTerms: fieldErrors.waiverAccepted,
            payment: fieldErrors.payment,
            form: fieldErrors.form,
          })
        }

        setStatusMessage({ tone: "error", text: result.error || "The request could not be completed. Please try again." })
        return
      }

      await trackSuccessfulSubmission(payload as { event_id?: string; utm_campaign?: string; utm_source?: string })

      try {
        window.sessionStorage.removeItem(STORAGE_KEYS.formState)
        window.sessionStorage.removeItem(STORAGE_KEYS.submitPayload)
        window.sessionStorage.removeItem(STORAGE_KEYS.paymentSession)
        window.sessionStorage.removeItem(STORAGE_KEYS.checkoutPending)
        window.sessionStorage.removeItem(STORAGE_KEYS.draftId)
      } catch {
        // Ignore storage cleanup failures.
      }

      draftIdRef.current = createEventId()
      lastPartialPayloadRef.current = ""

      await celebrateSuccess()

      if (onSubmit) {
        await onSubmit(formData)
      }

      setStatusMessage({
        tone: "success",
        text: "Your details have been received. A member of our team will get in touch shortly.",
      })
      setShowSuccessModal(true)
      setIsPostPaymentProcessing(false)
      scheduleRedirectToStudioSchedule()
    } catch {
      setIsPostPaymentProcessing(false)
      setStatusMessage({ tone: "error", text: "We could not complete the request right now. Please try again in a moment." })
    } finally {
      setIsSubmitting(false)
      isAutoSubmittingRef.current = false
    }
  }

  async function createCheckoutSession(payload: Record<string, unknown>) {
    setIsCreatingCheckout(true)
    setStatusMessage({ tone: "success", text: "Starting secure checkout..." })

    try {
      window.sessionStorage.setItem(STORAGE_KEYS.submitPayload, JSON.stringify(payload))
      window.sessionStorage.setItem(STORAGE_KEYS.checkoutPending, "true")
      setIsPostPaymentProcessing(true)
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok || !result.url) {
        setIsPostPaymentProcessing(false)
        try {
          window.sessionStorage.removeItem(STORAGE_KEYS.checkoutPending)
        } catch {
          // Ignore storage cleanup failures.
        }

        if (response.status === 400 && result.fieldErrors) {
          const fieldErrors = result.fieldErrors as Record<string, string>
          setErrors({
            firstName: fieldErrors.firstName,
            lastName: fieldErrors.lastName,
            email: fieldErrors.email,
            phone: fieldErrors.phoneNumber,
            studio: fieldErrors.center,
            format: fieldErrors.type,
            acceptedTerms: fieldErrors.waiverAccepted,
            payment: fieldErrors.payment,
            form: fieldErrors.form,
          })
        }

        setStatusMessage({ tone: "error", text: result.error || "Unable to start checkout. Please try again." })
        return
      }

      window.location.assign(result.url)
    } catch {
      setIsPostPaymentProcessing(false)
      try {
        window.sessionStorage.removeItem(STORAGE_KEYS.checkoutPending)
      } catch {
        // Ignore storage cleanup failures.
      }
      setStatusMessage({ tone: "error", text: "Unable to start checkout right now. Please try again." })
    } finally {
      setIsCreatingCheckout(false)
    }
  }

  async function celebrateSuccess() {
    const shoot = confettiInstanceRef.current ?? confetti
    const bursts = [0, 180, 420, 720, 1080]

    for (const delay of bursts) {
      window.setTimeout(() => {
        shoot({
          particleCount: 90,
          startVelocity: 48,
          spread: 82,
          ticks: 250,
          gravity: 0.9,
          scalar: 1.05,
          origin: { x: 0, y: 0.78 },
          angle: 42,
          colors: ["#7f1d1d", "#be123c", "#1d4ed8", "#059669", "#f59e0b", "#ffffff"],
        })
        shoot({
          particleCount: 90,
          startVelocity: 48,
          spread: 82,
          ticks: 250,
          gravity: 0.9,
          scalar: 1.05,
          origin: { x: 1, y: 0.78 },
          angle: 138,
          colors: ["#7f1d1d", "#be123c", "#1d4ed8", "#059669", "#f59e0b", "#ffffff"],
        })
      }, delay)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatusMessage(null)

    if (!validateForm()) {
      return
    }

    const payload = buildLeadPayload()

    await submitLeadToApi(payload)
  }

  function handleOpenWhatsApp() {
    const message = buildWhatsAppMessage(formData, selectedFormat)
    const whatsappUrl = `https://wa.me/919769076411?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-auto bg-background">
      <canvas ref={confettiCanvasRef} className="pointer-events-none fixed inset-0 z-[70] h-full w-full" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {floatingDecor.map(({ top, left, icon: Icon }, index) => (
          <motion.div
            key={index}
            className="absolute text-slate-200/20"
            initial={{ opacity: 0.2, scale: 0.9 }}
            animate={{ opacity: [0.15, 0.3, 0.15], y: [0, -16, 0], rotate: [0, 10, -8, 0] }}
            transition={{ duration: 12 + index, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            style={{ top, left }}
          >
            <Icon className="h-14 w-14" />
          </motion.div>
        ))}
      </div>

        <div className="relative grid min-h-screen w-full min-w-0 lg:grid-cols-[40%_60%]">
        <div
          className="relative hidden h-screen overflow-hidden bg-black lg:block"
        >
          <AnimatePresence mode="sync">
            <motion.div
              key={currentHeroImage}
              className="absolute inset-0 overflow-hidden bg-black"
              initial={{ opacity: 0, scale: 1.04, filter: "blur(6px)", rotate: -0.35 }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)", rotate: 0 }}
              exit={{ opacity: 0, scale: 1.02, filter: "blur(4px)", rotate: 0.25 }}
              transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.img
                src={heroImages[currentHeroImage]}
                alt="Physique 57 studio"
                className="h-full w-full object-cover object-top"
                initial={{ scale: 1.12, x: 18, y: 8 }}
                animate={{ scale: 1.03, x: -8, y: -10 }}
                exit={{ scale: 1.08, x: -18, y: 6 }}
                transition={{ duration: 8.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-black/40" />
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_38%),radial-gradient(circle_at_80%_18%,rgba(59,130,246,0.18),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0.34)_100%)]"
            animate={{ opacity: [0.8, 1, 0.82], scale: [1, 1.03, 1] }}
            transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
          <div className="absolute inset-x-0 bottom-0 p-12 text-white">
            <div className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/15 px-4 py-2 shadow-[0_16px_40px_rgba(15,23,42,0.28)] backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-blue-100" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white">Strong looks good on you</span>
            </div>
            <h1 className="mb-4 max-w-md bg-gradient-to-r from-white to-blue-100 bg-clip-text text-5xl font-bold text-transparent xl:text-6xl">
              Transform Your Body
            </h1>
            <p className="max-w-lg text-lg text-white/88 xl:text-xl">
              Join Physique 57 and experience expert-led workouts in boutique studios designed to make your first class feel polished and exciting.
            </p>
          </div>
        </div>

        <div className="relative min-h-screen min-w-0 bg-background/95 backdrop-blur-sm lg:h-screen lg:overflow-y-auto">
          <div className="mx-auto w-full min-w-0 max-w-[1120px] px-3 pt-0 pb-6 sm:px-4 sm:pt-0 md:px-6 lg:px-10 lg:pt-0 xl:px-14 xl:pt-0">
              {shouldHideFormForProcessing ? (
                <div className="flex min-h-[78vh] items-center justify-center">
                  <div className="w-full max-w-2xl rounded-[32px] border border-slate-200/80 bg-white/85 px-4 py-12 text-center shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:px-12 sm:py-16">
                    <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-gradient-to-br from-blue-900 to-blue-700 text-white shadow-lg">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                    <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-blue-900/70">Booking in progress</p>
                    <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">Finalising your booking request</h2>
                    <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                      Please stay on this page while we submit your details and finish the studio booking workflow.
                    </p>
                    <div className="mx-auto mt-8 flex max-w-md items-center gap-3 rounded-2xl border border-blue-900/10 bg-blue-50/80 px-4 py-3 text-left text-sm text-blue-900 shadow-sm">
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                      <span>{statusMessage?.text || "We’re submitting your form automatically."}</span>
                    </div>
                  </div>
                </div>
              ) : (
              <div className="min-w-0 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_48px_140px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/50 backdrop-blur-xl sm:p-6 lg:p-8">
              {isTestRoute ? (
                <div className="mb-6 rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-orange-50 px-4 py-4 text-sm text-amber-950 shadow-sm sm:px-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                      <Info className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800">
                          Internal test mode
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700/90">
                          Free booking enabled
                        </span>
                      </div>
                      <p className="mt-2 leading-relaxed text-amber-900/90">
                        This route keeps the normal booking workflow intact for <span className="font-semibold">powerCycle</span> and <span className="font-semibold">Strength Lab</span>, but does not collect payment during internal testing at <span className="font-semibold">trial.physique57india.com/test</span>.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Share your details and preferred studio. Our team will help you complete the next step.
                </p>
                <div className="group relative inline-flex w-fit shrink-0 overflow-hidden rounded-lg border border-blue-300/35 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 px-3.5 py-2 shadow-[0_10px_24px_rgba(37,99,235,0.20)]">
                  <span className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-white/18 motion-safe:animate-[trial-badge-shine_3.2s_ease-in-out_infinite]" />
                  <span className="relative z-10 flex items-center gap-2 motion-safe:animate-[trial-badge-float_3.6s_ease-in-out_infinite]">
                    <CalendarCheck className="h-4 w-4 text-blue-100" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white">Book your trial class</span>
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
              <section className="border-b border-slate-200">
                <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3.5 sm:px-5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-950 text-[11px] font-bold text-white">01</div>
                  <div className="min-w-0 leading-tight">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Required details</p>
                    <h3 className="text-sm font-semibold text-slate-950">Personal details</h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3.5 px-4 py-[18px] sm:grid-cols-2 sm:px-5">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-semibold text-slate-800">First name <span className="text-destructive">*</span></Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(event) => handleInputChange("firstName", event.target.value)}
                      className={cn(
                        "h-11 rounded-[10px] border-slate-300 bg-white text-sm shadow-none focus:border-slate-950 focus:ring-slate-950/10",
                        errors.firstName && "border-destructive"
                      )}
                    />
                    {errors.firstName ? <p className="text-sm text-destructive">{errors.firstName}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-semibold text-slate-800">Last name <span className="text-destructive">*</span></Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(event) => handleInputChange("lastName", event.target.value)}
                      className={cn(
                        "h-11 rounded-[10px] border-slate-300 bg-white text-sm shadow-none focus:border-slate-950 focus:ring-slate-950/10",
                        errors.lastName && "border-destructive"
                      )}
                    />
                    {errors.lastName ? <p className="text-sm text-destructive">{errors.lastName}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-slate-800">Email <span className="text-destructive">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => handleInputChange("email", event.target.value)}
                      className={cn(
                        "h-11 rounded-[10px] border-slate-300 bg-white text-sm shadow-none focus:border-slate-950 focus:ring-slate-950/10",
                        errors.email && "border-destructive"
                      )}
                    />
                    {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-semibold text-slate-800">Phone number <span className="text-destructive">*</span></Label>
                    <div className={cn(
                      "grid h-12 grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-[10px] border border-slate-300 bg-white transition-[border-color,box-shadow] focus-within:border-slate-950 focus-within:ring-4 focus-within:ring-slate-950/10",
                      errors.phone && "border-destructive focus-within:border-destructive focus-within:ring-destructive/10"
                    )}>
                      <Select value={formData.countryCode} onValueChange={(value) => handleInputChange("countryCode", value)}>
                        <SelectTrigger size="lg" className="h-full min-h-0 rounded-none border-0 border-r border-slate-200 bg-slate-50/80 px-3 py-0 shadow-none focus:ring-0 focus-visible:ring-0 [&>span]:flex [&>span]:h-full [&>span]:items-center">
                          <SelectValue placeholder="Code">
                            <span className="flex w-full items-center justify-between gap-2">
                              <span className="text-base leading-none">{getCountryOption(formData.countryCode)?.flag}</span>
                              <span className="text-xs font-semibold text-slate-700">{getCountryOption(formData.countryCode)?.code}</span>
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="border-slate-300 bg-white/95">
                          {countryCodes.map((item, index) => (
                            <SelectItem key={`${item.code}-${item.country}-${index}`} value={item.country}>
                              <div className="flex items-center gap-2">
                                <span>{item.flag}</span>
                                <span className="font-medium">{item.code}</span>
                                <span className="text-xs text-muted-foreground">{item.name}</span>
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
                        className="h-full rounded-none border-0 bg-white px-3 py-0 text-sm leading-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                    {errors.phone ? <p className="text-sm text-destructive">{errors.phone}</p> : null}
                  </div>
                </div>
              </section>

              <section className="border-b border-slate-200">
                <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3.5 sm:px-5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-950 text-[11px] font-bold text-white">02</div>
                  <div className="min-w-0 leading-tight">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Preference</p>
                    <h3 className="text-sm font-semibold text-slate-950">Studio and format</h3>
                  </div>
                </div>
                <div className="space-y-6 px-4 py-[18px] sm:px-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-2.5">
                      <Label htmlFor="studio" className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-950">
                        Location <span className="text-destructive">*</span>
                      </Label>
                      <p className="text-xs font-medium text-slate-500">Choose your studio</p>
                    </div>
                    <div className="space-y-2">
                    <div className="grid items-stretch gap-2.5 sm:grid-cols-[minmax(0,1fr)_152px]">
                      <Select value={formData.studio} onValueChange={(value) => handleInputChange("studio", value)}>
                        <SelectTrigger
                          size="lg"
                          className={cn(
                            "h-14 min-h-14 w-full rounded-xl border-slate-300 bg-white px-3 text-left text-sm shadow-[0_8px_20px_rgba(15,23,42,0.04)] focus:border-slate-950 focus:ring-slate-950/10 [&>span]:flex [&>span]:min-w-0 [&>span]:items-center",
                            errors.studio && "border-destructive"
                          )}
                        >
                          <SelectValue placeholder="Select a studio">
                            {selectedStudio ? (
                              <span className="flex min-w-0 flex-col items-start leading-tight">
                                <span className="truncate text-[13px] font-semibold text-slate-950">{selectedStudio.name}</span>
                                <span className="mt-0.5 truncate text-xs font-medium text-slate-500">{selectedStudio.location}</span>
                              </span>
                            ) : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="border-slate-300 bg-white/95 shadow-xl">
                          {studios.map((studio) => (
                            <SelectItem key={studio.name} value={studio.name}>
                              <div className="flex min-w-0 flex-col py-1 leading-tight">
                                <div className="truncate text-sm font-semibold text-slate-950">{studio.name}</div>
                                <div className="mt-1 truncate text-xs font-medium text-muted-foreground">{studio.location}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-14 min-h-14 w-full rounded-xl border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-[0_8px_20px_rgba(15,23,42,0.04)] hover:border-slate-950 hover:bg-slate-50"
                        onClick={() => setShowSchedule(true)}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        View schedule
                      </Button>
                    </div>
                    {errors.studio ? <p className="text-sm text-destructive">{errors.studio}</p> : null}
                  </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-2.5">
                      <Label className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-950">
                        Format <span className="text-destructive">*</span>
                      </Label>
                      <p className="text-xs font-medium text-slate-500">Choose the format that feels right for your first visit</p>
                    </div>
                    <div className="space-y-2.5">
                    <div role="radiogroup" aria-label="Choose your first format" className="grid gap-3 sm:grid-cols-2">
                      {availableFormats.map((format) => {
                        const isSelected = formData.format === format.id

                        return (
                          <div
                            key={format.id}
                            role="radio"
                            aria-checked={isSelected}
                            tabIndex={0}
                            onClick={() => handleInputChange("format", isSelected ? "" : format.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault()
                                handleInputChange("format", isSelected ? "" : format.id)
                              }
                            }}
                            className={cn(
                              "group relative min-h-[126px] cursor-pointer overflow-hidden rounded-xl border p-3 outline-none transition-all duration-300 focus-visible:ring-4 focus-visible:ring-blue-900/15",
                              isSelected
                                ? "border-blue-700/55 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#f8fafc_100%)] shadow-[0_6px_16px_rgba(37,99,235,0.08)]"
                                : "border-slate-200 bg-white shadow-none hover:-translate-y-0.5 hover:border-blue-900/25 hover:shadow-[0_8px_18px_rgba(15,23,42,0.07)]"
                            )}
                          >
                            <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-1 transition-opacity", isSelected ? "bg-gradient-to-r from-blue-700 via-sky-500 to-blue-400 opacity-100" : "bg-slate-200 opacity-0 group-hover:opacity-100")} />
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-2.5">
                                <span className={cn(
                                  "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border bg-white text-lg leading-none shadow-sm transition-transform duration-300 group-hover:scale-105",
                                  isSelected ? "border-blue-200 shadow-blue-900/10" : "border-slate-200"
                                )}>
                                  {format.icon}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-900">{format.subtitle}</div>
                                  <div className="mt-0.5 text-[15px] font-semibold leading-tight text-slate-950">{format.title}</div>
                                </div>
                              </div>
                              <span
                                className={cn(
                                  "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border bg-white shadow-sm transition-colors",
                                  isSelected ? "border-blue-800" : "border-slate-300"
                                )}
                              >
                                <span className={cn("h-2.5 w-2.5 rounded-full bg-blue-800 transition-opacity", isSelected ? "opacity-100" : "opacity-0")} />
                              </span>
                            </div>

                            <p className="mt-2 line-clamp-2 text-xs leading-snug text-slate-600">{format.description}</p>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <span className={cn("text-[10px] font-semibold uppercase tracking-[0.14em]", isSelected ? "text-blue-800" : "text-slate-400")}>
                                {isSelected ? "Selected" : "Tap to select"}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-sm hover:border-blue-900/20 hover:bg-blue-50 hover:text-blue-950"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setShowFormatInfo(format.id)
                                }}
                              >
                                Know more
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {errors.format ? <p className="text-sm text-destructive">{errors.format}</p> : null}
                  </div>
                  </div>
                </div>
              </section>

              <section className="border-b border-slate-200">
                <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3.5 sm:px-5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-950 text-[11px] font-bold text-white">03</div>
                  <div className="min-w-0 leading-tight">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Final check</p>
                    <h3 className="text-sm font-semibold text-slate-950">Confirmation</h3>
                  </div>
                </div>
                <div className="px-4 py-[18px] sm:px-5">
                  <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:items-center sm:gap-4 sm:px-4">
                    <Checkbox
                      id="terms"
                      checked={formData.acceptedTerms}
                      onCheckedChange={(checked) => handleInputChange("acceptedTerms", Boolean(checked))}
                      className={cn("mt-0.5 h-5 w-5 rounded-md border-slate-400 data-[state=checked]:border-blue-900 data-[state=checked]:bg-blue-900 sm:mt-0", errors.acceptedTerms && "border-destructive")}
                    />
                    <div className="flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <label htmlFor="terms" className="cursor-pointer text-sm font-semibold leading-relaxed text-slate-900 sm:flex-1">
                          I have read and accept the waiver and booking terms. <span className="text-destructive">*</span>
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 rounded-lg border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-none hover:border-slate-900 hover:bg-slate-900 hover:text-white sm:self-auto"
                          onClick={(event) => {
                            event.preventDefault()
                            setShowWaiverModal(true)
                          }}
                        >
                          View terms & conditions
                        </Button>
                      </div>
                    </div>
                  </div>
                  {errors.acceptedTerms ? <p className="mt-2 text-sm text-destructive">{errors.acceptedTerms}</p> : null}
                </div>
              </section>

              <div className="space-y-3 bg-slate-50 px-4 py-4 sm:px-5">
              {statusMessage ? (
                <div className={cn(
                  "rounded-xl border px-4 py-3 text-sm",
                  statusMessage.tone === "error"
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-emerald-300 bg-emerald-50 text-emerald-800"
                )}>
                  {statusMessage.text}
                </div>
              ) : null}

              {(errors.payment || errors.form) ? (
                <p className="text-sm text-destructive">{errors.payment || errors.form}</p>
              ) : null}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-relaxed text-slate-600">
                    No payment collected. A team member will get in touch shortly.
                  </p>
                  <Button
                    id="trial-submit-button"
                    type="submit"
                    size="lg"
                    className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 px-8 text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-[0_18px_42px_rgba(37,99,235,0.34)] transition-all duration-300 hover:-translate-y-0.5 hover:from-blue-800 hover:via-blue-700 hover:to-sky-600 hover:shadow-[0_22px_52px_rgba(37,99,235,0.42)] disabled:translate-y-0 disabled:opacity-55 sm:w-auto sm:min-w-[190px]"
                    disabled={isSubmitting || isCreatingCheckout || !isFormValid}
                  >
                    {isSubmitting || isCreatingCheckout ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting your booking...
                      </>
                    ) : (
                      primaryButtonLabel
                    )}
                  </Button>
                </div>
              </div>
              </form>
            </div>
            )}

            <section className="mt-20 space-y-12">
              <div className="mx-auto max-w-5xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/10 to-slate-200/50 px-4 py-2 backdrop-blur-sm">
                  <Award className="h-4 w-4 text-blue-900" />
                  <span className="text-sm font-semibold text-blue-900">What Sets Us Apart</span>
                </div>
                <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">Key Benefits</h2>
                <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
                  Discover the proven advantages that make Physique 57 India the preferred choice for fast, visible results and sustainable transformation.
                </p>
              </div>

              <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-2">
                {keyBenefits.map((benefit, index) => {
                  const Icon = benefitIcons[benefit.icon]
                  const colors = colorClasses[benefit.color]

                  return (
                    <motion.div
                      key={benefit.title}
                      initial={{ opacity: 0, y: 26 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{ duration: 0.5, delay: index * 0.06 }}
                      className={cn(
                        "group relative h-full rounded-2xl border-r-2 border-y-2 border-r-slate-200 border-y-slate-200 bg-gradient-to-br from-white/95 to-slate-50/60 p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl",
                        colors.border
                      )}
                    >
                      <div className="flex items-start gap-6">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={cn("flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-all duration-300 group-hover:-rotate-6 group-hover:scale-110", colors.iconBg)}>
                              <Icon className="h-7 w-7" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="border-slate-700 bg-slate-900 text-white">
                            <p className="font-medium">{benefit.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                        <div className="flex-1">
                          <h3 className={cn("mb-3 text-xl font-bold text-foreground transition-colors", colors.hoverText)}>
                            {benefit.title}
                          </h3>
                          <p className="text-sm leading-relaxed text-muted-foreground">{benefit.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </section>

            <section className="mt-20 space-y-12">
              <div className="mx-auto max-w-4xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/10 to-slate-200/50 px-4 py-2 backdrop-blur-sm">
                  <Sparkles className="h-4 w-4 text-blue-900" />
                  <span className="text-sm font-semibold text-blue-900">Your First Visit</span>
                </div>
                <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">What Happens Next</h2>
                <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
                  From your first click to your first shake, every step is designed to feel curated, clear, and high-touch.
                </p>
              </div>

              <div className="relative mx-auto mt-12 max-w-4xl">
                <div className="absolute bottom-12 left-[27px] top-12 hidden w-0.5 bg-gradient-to-b from-slate-300 via-blue-900 to-slate-300 md:block" />
                <div className="space-y-8">
                  {journeySteps.map((step, index) => (
                    <motion.div
                      key={step.number}
                      initial={{ opacity: 0, x: -40 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-80px" }}
                      transition={{ duration: 0.5, delay: index * 0.08 }}
                    >
                      <div className="group flex items-start gap-6">
                        <div className="relative z-10 flex-shrink-0">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-900 to-blue-700 text-lg font-bold text-white shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl">
                            {step.number}
                          </div>
                        </div>
                        <div className="flex-1 rounded-2xl border border-border/50 bg-gradient-to-br from-white/90 via-white/75 to-slate-100/30 p-6 backdrop-blur-sm transition-all duration-300 group-hover:translate-x-2 group-hover:border-blue-900/30 group-hover:shadow-xl">
                          <h3 className="mb-2 text-lg font-bold text-foreground transition-colors group-hover:text-blue-900">{step.title}</h3>
                          <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-20 space-y-12">
              <div className="mx-auto max-w-4xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-200/50 px-4 py-2 backdrop-blur-sm">
                  <MapPin className="h-4 w-4 text-amber-700" />
                  <span className="text-sm font-semibold text-amber-900">Studio Locations</span>
                </div>
                <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">Choose Your Studio</h2>
                <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
                  Each location carries the same Physique 57 method, with its own neighborhood energy and format mix.
                </p>
              </div>

              <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
                <div className="space-y-6">
                  {studios.map((studio, index) => (
                    (() => {
                      const theme = studioThemes[studio.name as keyof typeof studioThemes]
                      return (
                    <motion.div
                      key={studio.name}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{ duration: 0.5, delay: index * 0.12 }}
                      className={cn(
                        "group overflow-hidden rounded-2xl border-2 bg-gradient-to-br shadow-sm transition-all duration-300 hover:shadow-2xl",
                        theme.cardBorder,
                        theme.cardBg
                      )}
                    >
                      <div className="space-y-6 p-8">
                        <div className="flex items-start gap-6">
                          <div className={cn("relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6", theme.iconBg)}>
                            <Building2 className="relative z-10 h-8 w-8 text-white" />
                            <div className="absolute inset-0 rounded-2xl bg-white/20" />
                          </div>
                          <div className="flex-1">
                            <h3 className={cn("mb-2 text-2xl font-bold text-foreground transition-colors", theme.hoverTitle)}>{studio.name}</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">{studio.description}</p>
                          </div>
                        </div>

                        <div className={cn("space-y-3 rounded-2xl border-2 bg-white/80 p-6 text-sm shadow-sm backdrop-blur-sm", theme.pillBorder)}>
                          {[
                            { icon: MapPin, title: "Location", value: studio.neighborhood },
                            { icon: Phone, title: "Phone", value: studio.phone },
                            { icon: Clock, title: "Hours", value: studio.hours },
                            { icon: Building2, title: "Address", value: studio.address },
                          ].map((item) => {
                            const ItemIcon = item.icon
                            return (
                              <div key={item.title} className="flex items-start gap-3">
                                <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm", theme.itemIconBg)}>
                                  <ItemIcon className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                  <p className={cn("mb-1 font-bold", theme.accentText)}>{item.title}</p>
                                  <p className="leading-snug text-muted-foreground">{item.value}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${studio.lat},${studio.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn("inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl", theme.buttonBg)}
                        >
                          <MapPin className="h-4 w-4" />
                          Get Directions
                        </a>
                      </div>
                    </motion.div>
                      )
                    })()
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="h-[700px] overflow-hidden rounded-2xl border-2 border-slate-200 shadow-2xl lg:sticky lg:top-8"
                >
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241317.14571262895!2d72.71637!3d19.082502!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c6306644edc1%3A0x5da4ed8f8d648c69!2sMumbai%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1234567890"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-full w-full"
                    title="Physique 57 studio map"
                  />
                </motion.div>
              </div>
            </section>

            <section className="relative mt-20 space-y-12 pb-2 overflow-hidden">
              <div className="absolute inset-0 -z-10 h-96 bg-gradient-to-b from-rose-50/80 via-transparent to-transparent blur-3xl" />

              <div className="mx-auto max-w-5xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-rose-600/30 bg-gradient-to-r from-rose-600/15 to-rose-200/60 px-4 py-2 backdrop-blur-md shadow-sm">
                  <Heart className="h-4 w-4 text-rose-700 animate-pulse" />
                  <span className="text-sm font-semibold text-rose-900">Member Stories</span>
                </div>
                <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">What Our Members Say</h2>
                <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">Real transformations, real results, real people just like you.</p>
              </div>

              <div className="relative mt-12 overflow-hidden px-2 md:px-0">
                <div className="mx-auto max-w-7xl">
                  <motion.div
                    animate={{ x: `calc(50% - ${currentReview * REVIEW_CARD_STRIDE + REVIEW_CARD_CENTER_OFFSET}px)` }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="flex gap-6"
                  >
                    {clientReviews.map((review, index) => (
                      <motion.div
                        key={`review-${index}`}
                        className="w-[22rem] flex-shrink-0"
                      >
                        <motion.div
                          animate={{
                            scale: index === currentReview ? 1 : 0.88,
                            opacity: Math.abs(index - currentReview) <= 1 ? (index === currentReview ? 1 : 0.5) : 0.25,
                            y: index === currentReview ? 0 : 16,
                          }}
                          transition={{ duration: 0.6 }}
                          className={cn(
                            "rounded-3xl h-96 flex flex-col justify-between transition-all duration-500",
                            index === currentReview
                              ? "border-2 border-rose-200/80 bg-gradient-to-br from-white via-rose-50/40 to-rose-100/20 p-8 shadow-2xl"
                              : "border border-slate-200/60 bg-gradient-to-br from-white/70 to-white/50 p-6 shadow-md hover:shadow-lg"
                          )}
                        >
                          {index === currentReview ? (
                            <>
                              <div className="mb-2">
                                <svg className="h-8 w-8 text-rose-300/60" fill="currentColor" viewBox="0 0 32 32">
                                  <path d="M8 12l2.266-5.333h4.934l-3.6 8h-3.6v9.333h8v-8.933l3.867-4C20.8 8.133 20.4 4.667 22 2h-4.267C18 6 12 12 8 21v-9z" />
                                </svg>
                              </div>

                              <div className="flex-1">
                                <p className="mb-6 text-lg font-medium leading-relaxed text-foreground">"{review.review}"</p>
                              </div>

                              <div className="mb-4 flex gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                  >
                                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                                  </motion.div>
                                ))}
                              </div>

                              <div className="space-y-1 border-t border-rose-200/40 pt-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-rose-600 text-lg font-bold text-white shadow-lg">
                                    {review.name.charAt(0)}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-bold text-foreground">{review.name}</p>
                                    <p className="text-xs font-semibold text-rose-600">{review.class}</p>
                                    <p className="text-xs text-muted-foreground/70">{review.date}</p>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="mb-2">
                                <svg className="h-6 w-6 text-rose-200/40" fill="currentColor" viewBox="0 0 32 32">
                                  <path d="M8 12l2.266-5.333h4.934l-3.6 8h-3.6v9.333h8v-8.933l3.867-4C20.8 8.133 20.4 4.667 22 2h-4.267C18 6 12 12 8 21v-9z" />
                                </svg>
                              </div>

                              <div>
                                <p className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-5">
                                  "{review.review}"
                                </p>
                              </div>

                              <div className="mb-3 flex gap-0.5 opacity-30">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                                ))}
                              </div>

                              <div className="space-y-1 border-t border-slate-200/30 pt-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-300 to-rose-500 text-xs font-bold text-white">
                                    {review.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-foreground">{review.name}</p>
                                    <p className="text-xs text-muted-foreground">{review.class}</p>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </motion.div>
                      </motion.div>
                    ))}
                  </motion.div>

                  <div className="mt-12 flex flex-wrap justify-center gap-3">
                    {clientReviews.map((_, index) => (
                      <motion.button
                        key={index}
                        onClick={() => setCurrentReview(index)}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "transition-all duration-300 rounded-full",
                          currentReview === index
                            ? "h-3 w-10 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 shadow-lg shadow-rose-200"
                            : "h-3 w-3 rounded-full bg-slate-300 hover:bg-rose-300 hover:shadow-md"
                        )}
                        aria-label={`View review ${index + 1}`}
                      />
                    ))}
                  </div>

                  <div className="mt-6 text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      <span className="font-bold text-rose-600">{currentReview + 1}</span> of <span className="font-bold text-rose-600">{clientReviews.length}</span>
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-20 space-y-12 pb-2">
              <div className="mx-auto max-w-5xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/10 to-slate-200/50 px-4 py-2 backdrop-blur-sm">
                  <Info className="h-4 w-4 text-blue-900" />
                  <span className="text-sm font-semibold text-blue-900">Questions</span>
                </div>
                <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">Helpful Answers Before You Book</h2>
                <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
                  Everything you need before your first class, without losing the premium feel of the page.
                </p>
              </div>

              <div className="mt-12 space-y-4">
                {featuredFaqs.map((faq, index) => (
                  <motion.div
                    key={faq.question}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.35, delay: index * 0.04 }}
                    className="overflow-hidden rounded-2xl border border-slate-900/15 bg-card shadow-sm transition-all duration-300 hover:border-slate-900/30 hover:shadow-xl"
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className={cn(
                        "group flex w-full items-center justify-between px-8 py-6 text-left transition-colors",
                        openFaq === index
                          ? "bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800"
                          : "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 hover:from-slate-950 hover:to-slate-900"
                      )}
                    >
                      <span className="pr-4 text-lg font-bold text-white transition-colors group-hover:text-slate-100">{faq.question}</span>
                      <motion.div
                        animate={{ rotate: openFaq === index ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300", openFaq === index ? "border-white/25 bg-white/10" : "border-white/15 bg-white/5 group-hover:bg-white/10")}>
                          {openFaq === index ? <Minus className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
                        </div>
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {openFaq === index ? (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                          <div className="border-t border-slate-900/10 bg-gradient-to-br from-zinc-50 via-white to-stone-50 px-8 pb-6 pt-6">
                            <div className="space-y-3 border-l-4 border-slate-900/80 pl-5 text-[15px] leading-7 text-slate-700">
                              {faq.answer.map((paragraph, paragraphIndex) => (
                                <p key={`${faq.question}-${paragraphIndex}`}>{paragraph}</p>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>

              <div className="mt-12 rounded-2xl border border-blue-900/20 bg-gradient-to-br from-blue-900/10 to-slate-200/30 p-8">
                <div className="space-y-4 text-center">
                  <h3 className="text-2xl font-bold text-blue-900">Need More Information?</h3>
                  <p className="text-blue-900/80">Explore the full FAQ guide or read the complete waiver for more details.</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-4">
                    <Button variant="outline" size="lg" className="border-blue-900 text-blue-900 hover:bg-blue-900 hover:text-white" onClick={() => setShowAllFaqsModal(true)}>
                      View all FAQs
                    </Button>
                    <Button variant="outline" size="lg" className="border-blue-900 text-blue-900 hover:bg-blue-900 hover:text-white" onClick={() => setShowWaiverModal(true)}>
                      Read full waiver
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <ModalShell open={showSchedule} onClose={() => setShowSchedule(false)} className="max-h-[85vh] max-w-5xl overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">Class Schedule</h3>
            <p className="mt-1 text-sm text-muted-foreground">{formData.studio || "Select a studio to view schedule"}</p>
          </div>
          <button onClick={() => setShowSchedule(false)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-inner">
          <div ref={scheduleHostRef} className="min-h-[420px]" />
        </div>
      </ModalShell>

      <ModalShell open={showSuccessModal} onClose={() => setShowSuccessModal(false)} className="max-w-md border-2 border-white bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-10 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 shadow-xl">
          <CheckCircle2 className="h-12 w-12 text-white" />
        </div>
        <h3 className="mb-3 text-3xl font-bold text-foreground">Request Submitted!</h3>
        <p className="mb-8 leading-relaxed text-muted-foreground">
          Your details have been received. A member of our team will get in touch shortly. We&apos;ll redirect you to your selected studio schedule now.
        </p>
        <Button className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 py-6 text-lg text-white hover:from-blue-700 hover:to-emerald-700" onClick={redirectToSelectedStudioSchedule}>
          View selected studio schedule
        </Button>
      </ModalShell>

      <ModalShell open={showWaiverModal} onClose={() => setShowWaiverModal(false)} className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-2xl font-bold">Terms & Waiver</h3>
          <button onClick={() => setShowWaiverModal(false)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          {waiverSections.map((section, sectionIndex) => (
            <div key={section.title ?? `section-${sectionIndex}`} className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
              {section.title ? <h4 className="text-base font-bold text-slate-950">{section.title}</h4> : null}
              {section.paragraphs?.map((paragraph, paragraphIndex) => (
                <p key={`paragraph-${sectionIndex}-${paragraphIndex}`}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul className="list-disc space-y-2 pl-6">
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li key={`bullet-${sectionIndex}-${bulletIndex}`}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
        <Button onClick={() => setShowWaiverModal(false)} className="mt-6 w-full bg-blue-900 hover:bg-blue-950">
          I Understand
        </Button>
      </ModalShell>

      <ModalShell open={Boolean(showFormatInfo)} onClose={() => setShowFormatInfo(null)} className="h-[92vh] max-h-[92vh] max-w-5xl overflow-hidden p-0 sm:h-[90vh] sm:max-h-[90vh]">
        {activeFormat ? (
          <>
            <div className="grid h-full min-h-0 grid-rows-[260px_minmax(0,1fr)] lg:grid-cols-[42%_58%] lg:grid-rows-1">
              <div className="relative flex min-h-0 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-100 lg:h-full">
                <img
                  src={activeFormat.image}
                  alt={activeFormat.imageAlt}
                  className={cn(
                    "h-full w-full object-center",
                    activeFormat.id === "powercycle"
                      ? "object-cover"
                      : activeFormat.id === "strength-lab"
                        ? "object-cover object-[center_22%]"
                        : "object-contain p-5 sm:p-6 lg:p-8"
                  )}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/90">Class formats</p>
                  <h3 className="text-3xl font-semibold sm:text-4xl">{activeFormat.subtitle}</h3>
                  <p className="mt-2 max-w-md text-sm text-white/85 sm:text-base">{activeFormat.title}</p>
                </div>
              </div>

              <div className="flex min-h-0 flex-col overflow-hidden bg-white lg:h-full">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-900/70">Format details</p>
                    <p className="mt-1 text-sm text-muted-foreground">A closer look at what this first-class experience feels like.</p>
                  </div>
                  <button onClick={() => setShowFormatInfo(null)} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8">
                  {activeFormat.warningBadge ? (
                    <div className="mb-5 inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-900 shadow-sm">
                      {activeFormat.warningBadge}
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Intensity</p>
                      <p className="mt-1 font-semibold text-slate-900">{activeFormat.intensity}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Duration</p>
                      <p className="mt-1 font-semibold text-slate-900">{activeFormat.duration}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Best for</p>
                      <p className="mt-1 font-semibold text-slate-900">{activeFormat.bestFor}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Training style</p>
                      <p className="mt-1 font-semibold text-slate-900">{activeFormat.trainingStyle}</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Overview</h4>
                    <p className="text-sm leading-7 text-slate-700 sm:text-[15px]">{activeFormat.fullDescription}</p>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Why it stands out</h4>
                    <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
                      {activeFormat.highlights.map((highlight) => (
                        <li key={highlight} className="flex gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-blue-900" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="border-t border-slate-200 bg-white px-6 py-5 sm:px-8">
                  <Button onClick={() => setShowFormatInfo(null)} className="w-full sm:w-auto">
                    Got it
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </ModalShell>

      <ModalShell open={showAllFaqsModal} onClose={() => setShowAllFaqsModal(false)} className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">Complete FAQ Guide</h3>
            <p className="mt-1 text-sm text-muted-foreground">Everything you might want to know before your first class.</p>
          </div>
          <button onClick={() => setShowAllFaqsModal(false)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-2xl border border-slate-900/10 bg-card p-6 shadow-sm">
              <h4 className="mb-3 text-lg font-semibold text-foreground">{faq.question}</h4>
              <div className="space-y-3 leading-relaxed text-muted-foreground">
                {faq.answer.map((paragraph, paragraphIndex) => (
                  <p key={`${faq.question}-modal-${paragraphIndex}`}>{paragraph}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ModalShell>

      <div className="fixed bottom-6 right-6 z-[80]">
        <button
          type="button"
          onClick={handleOpenWhatsApp}
          className="flex h-15 w-15 items-center justify-center rounded-full bg-[linear-gradient(135deg,#25d366,#128c7e)] text-white shadow-[0_4px_16px_rgba(37,211,102,0.3)] transition-transform duration-200 hover:scale-105 hover:shadow-[0_6px_20px_rgba(37,211,102,0.4)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/60"
          aria-label="Chat with Physique 57 team on WhatsApp"
          title="Chat with Physique 57 team"
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
            <path
              fill="currentColor"
              d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.085"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
