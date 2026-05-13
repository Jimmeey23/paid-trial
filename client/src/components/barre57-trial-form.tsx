import { useEffect, useRef, useState } from "react"
import confetti from "canvas-confetti"
import { AnimatePresence, motion } from "framer-motion"
import { parsePhoneNumberFromString, type CountryCode as PhoneCountryCode } from "libphonenumber-js/min"
import {
  Calendar,
  CheckCircle2,
  Clock,
  Heart,
  Loader2,
  MapPin,
  Phone,
  Shield,
  Sparkles,
  X,
  Award,
  Trophy,
  Target,
  Zap,
  Users,
  Dumbbell,
  ChevronDown,
  Plus,
  Minus,
  Info,
  Building2,
  Star,
  type LucideIcon,
} from "lucide-react"

import {
  countryCodes,
  faqs,
  keyBenefits,
  studios,
  waiverSections,
  clientReviews,
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

const DEFAULT_REDIRECT_URL = "https://momence.com/u/physique-57-india-fffoSp"

function createEventId() {
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

interface Barre57TrialFormProps {
  onSubmit?: (data: any) => void
  variant?: "barre" | "influencer"
}

interface ScheduleSession {
  id: string
  title: string
  instructorName?: string
  locationName?: string
  startsAt: string
  durationMinutes?: number | null
  spotsRemaining?: number | null
}

interface ScheduleGroup {
  date: string
  items: ScheduleSession[]
}

interface SubmissionSchedule {
  success: boolean
  schedulePageUrl?: string
  groupedSessions?: ScheduleGroup[]
}

interface SubmissionMomenceStatus {
  openBarreProvisioned?: boolean
  error?: string
}

function sameOriginApiUrl(path: string) {
  if (typeof window === "undefined") {
    return path
  }

  return new URL(path, window.location.origin).toString()
}

function formatScheduleDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(parsed)
}

function formatScheduleTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ""
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed)
}

// Barre 57 specific hero images
const BARRE_HERO_IMAGES = [
  "https://i.postimg.cc/BbPhr4br/hp-Img-1770172966.png",
  "https://i.postimg.cc/vZ8VzFH8/654600560_18105657745867483_8944120182227400336_n.jpg",
  "https://i.postimg.cc/PqqkNKTC/10210_Physique_57_by_Atelier_Birjis_3.webp",
  "https://i.postimg.cc/XvxDFstP/hp_Img_1767781454.png",
  "https://i.postimg.cc/255f3TrB/9.jpg",
  "https://i.postimg.cc/VvZTF5Sj/hp_Img_1770172692.png",
]

// All FAQs for Barre - combines Barre-specific with general Physique 57 FAQs
const ALL_FAQS = [
  {
    question: "Is Barre 57 suitable for beginners?",
    answer: [
      "Absolutely! Barre is designed to be accessible for all fitness levels. Our instructors provide modifications for every movement, so you can progress at your own pace.",
      "You'll use the barre for balance, not for pulling yourself up, so it's completely safe and effective whether you're a beginner or advanced."
    ]
  },
  {
    question: "What should I wear to Barre class?",
    answer: [
      "Wear comfortable, fitted clothing that lets you move freely. Many people wear leggings, shorts, or athletic wear.",
      "Bring grip socks or non-slip shoes to use during class for safety and stability."
    ]
  },
  {
    question: "Do I need to be flexible to do Barre?",
    answer: [
      "No! Flexibility is not a prerequisite. Barre actually helps you build flexibility over time as part of the workout.",
      "Our instructors will help you find your range of motion and work safely within it."
    ]
  },
  ...faqs,
]

// Barre 57 Workout Structure with exercises
const BARRE_WORKOUT_SECTIONS = [
  {
    title: "Warm Up",
    exercises: [
      {
        name: "Bicep Curls in Wide Second",
        gif: "https://physique57.com/wp-content/uploads/2022/07/bicep-curls-wide-second.gif",
        steps: [
          "Step your feet wide, slightly turned out.",
          "Bend knees deeply and lower your hips.",
          "Lift heavy weights up towards your shoulders and down towards the thighs"
        ],
        tips: "Try to keep hips around knee level. Keep elbows tight to ribcage and shoulders down to target the biceps and work with proper posture.",
        targets: ["Thighs", "Biceps"]
      },
      {
        name: "Tricep Kickbacks",
        gif: "https://physique57.com/wp-content/uploads/2022/07/tricep-kickbacks.gif",
        steps: [
          "Hinge forward at the hips with a slight bend in your knees.",
          "Keep weights at shoulder level and extend arms back.",
          "Return to starting position in a controlled manner."
        ],
        tips: "Keep your core engaged and avoid arching your back. Focus on the tricep contraction.",
        targets: ["Triceps", "Core"]
      },
      {
        name: "Push-ups",
        gif: "https://physique57.com/wp-content/uploads/2022/07/pushups.gif",
        steps: [
          "Start in a plank position with hands shoulder-width apart.",
          "Lower your body by bending elbows until chest nearly touches the ground.",
          "Push back up to starting position."
        ],
        tips: "Modify on knees if needed. Keep core tight and body in a straight line.",
        targets: ["Chest", "Triceps", "Core"]
      },
      {
        name: "Rows",
        gif: "https://physique57.com/wp-content/uploads/2022/07/rows.gif",
        steps: [
          "Hinge forward with a slight knee bend, weights in hand.",
          "Pull weights up to hip level, squeezing shoulder blades together.",
          "Lower weights back down with control."
        ],
        tips: "Keep your back straight and engage your lats. Avoid letting shoulders shrug.",
        targets: ["Back", "Biceps"]
      }
    ]
  },
  {
    title: "Thighs",
    exercises: [
      {
        name: "Curtsy",
        gif: "https://physique57.com/wp-content/uploads/2022/07/curtsy.gif",
        steps: [
          "Stand with feet hip-width apart at the barre.",
          "Step right leg back and across your body, bending both knees.",
          "Return to center and repeat."
        ],
        tips: "Keep your upper body upright and engage your core. Focus on the inner and outer thigh.",
        targets: ["Inner Thighs", "Outer Thighs"]
      },
      {
        name: "Upright V",
        gif: "https://physique57.com/wp-content/uploads/2022/07/upright-v.gif",
        steps: [
          "Stand at the barre with feet in a V position, heels together.",
          "Pulse up and down, keeping legs engaged.",
          "Complete high-intensity pulses for maximum burn."
        ],
        tips: "Turn out from the hips, not the knees. Squeeze your glutes and thighs throughout.",
        targets: ["Thighs", "Glutes"]
      },
      {
        name: "Wide Incline",
        gif: "https://physique57.com/wp-content/uploads/2022/07/wide-incline.gif",
        steps: [
          "Stand with feet very wide, toes slightly turned out.",
          "Bend knees and lower into a wide squat position.",
          "Pulse up and down, staying low."
        ],
        tips: "Keep knees behind your toes. Engage your entire lower body.",
        targets: ["Thighs", "Inner Thighs", "Glutes"]
      },
      {
        name: "Thigh Dance",
        gif: "https://physique57.com/wp-content/uploads/2022/07/thigh-dance.gif",
        steps: [
          "Stand at the barre with a small bend in your knees.",
          "Pulse the working leg up and down in quick rhythmic motions.",
          "Maintain turn-out and control throughout."
        ],
        tips: "Keep your hips level and core engaged. This targets deep thigh muscles.",
        targets: ["Thighs"]
      }
    ]
  },
  {
    title: "Glutes",
    exercises: [
      {
        name: "Pretzel",
        gif: "https://physique57.com/wp-content/uploads/2022/07/pretzel.gif",
        steps: [
          "Lie on your side with legs bent, top leg crossed over.",
          "Lift top leg up, squeezing your glute.",
          "Lower with control and repeat."
        ],
        tips: "Keep your core engaged and avoid rolling backward. Focus on glute activation.",
        targets: ["Glutes", "Hips"]
      },
      {
        name: "Mermaid",
        gif: "https://physique57.com/wp-content/uploads/2022/07/mermaid.gif",
        steps: [
          "Lie on your side with both legs bent together.",
          "Press top hip forward and lift top leg slightly.",
          "Pulse leg up and down in small, controlled movements."
        ],
        tips: "This exercise deeply targets the glute and hip area. Keep movements small and controlled.",
        targets: ["Glutes", "Hip Flexors"]
      },
      {
        name: "Side Forearm Glutes",
        gif: "https://physique57.com/wp-content/uploads/2022/07/standing-hairpin.gif",
        steps: [
          "Stand at the barre, holding it with one hand.",
          "Lift working leg straight behind you and pulse.",
          "Keep torso upright and core engaged."
        ],
        tips: "Squeeze your glute at the top of each pulse. Avoid arching your back.",
        targets: ["Glutes"]
      },
      {
        name: "Fold Over",
        gif: "https://physique57.com/wp-content/uploads/2022/07/fold-over.gif",
        steps: [
          "Bend forward and hold the barre, creating a 90-degree angle.",
          "Pulse one leg up and down behind you.",
          "Alternate legs and maintain posture."
        ],
        tips: "This intense position maximizes glute engagement. Breathe steadily throughout.",
        targets: ["Glutes", "Lower Back"]
      }
    ]
  },
  {
    title: "Abs",
    exercises: [
      {
        name: "Scissors",
        gif: "https://physique57.com/wp-content/uploads/2022/07/scissors.gif",
        steps: [
          "Lie on your back with legs extended upward.",
          "Cross legs in a scissor motion while keeping lower back planted.",
          "Continuous crossing motion for high-intensity core work."
        ],
        tips: "Keep your lower back flat on the ground. Use controlled movements.",
        targets: ["Abs", "Core"]
      },
      {
        name: "Roundback Abs on Forearms",
        gif: "https://physique57.com/wp-content/uploads/2022/07/roundback.gif",
        steps: [
          "Sit on your forearms with legs extended.",
          "Round your back and crunch forward, engaging your core.",
          "Release and repeat with control."
        ],
        tips: "Focus on deep core engagement. This targets lower abdominal muscles.",
        targets: ["Abs", "Core"]
      },
      {
        name: "Curl on the Ball",
        gif: "https://physique57.com/wp-content/uploads/2022/07/curl-ball.gif",
        steps: [
          "Lie back on a stability ball with knees bent.",
          "Crunch up, lifting shoulders off the ball.",
          "Lower back down with control."
        ],
        tips: "The ball allows for greater range of motion. Keep movements controlled.",
        targets: ["Upper Abs", "Core"]
      },
      {
        name: "Forearm Plank",
        gif: "https://physique57.com/wp-content/uploads/2022/07/forearm-plank.gif",
        steps: [
          "Start in a forearm plank position with elbows under shoulders.",
          "Hold position, engaging core, glutes, and legs.",
          "Breathe steadily and maintain alignment."
        ],
        tips: "Keep your body in a straight line from head to heels. This builds core endurance.",
        targets: ["Core", "Abs", "Shoulders"]
      }
    ]
  }
]

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

const colorClasses = {
  blue: {
    border: "border-l-blue-500",
    iconBg: "from-blue-400 to-blue-600",
    hoverText: "group-hover:text-blue-600",
  },
  rose: {
    border: "border-l-rose-500",
    iconBg: "from-rose-400 to-rose-600",
    hoverText: "group-hover:text-rose-600",
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

export function Barre57TrialForm({ onSubmit, variant = "barre" }: Barre57TrialFormProps) {
  const isInfluencerFlow = variant === "influencer"
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "+91",
    phone: "",
    studio: "",
    acceptedTerms: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null)
  const [showWaiverModal, setShowWaiverModal] = useState(false)
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const confettiInstanceRef = useRef<ReturnType<typeof confetti.create> | null>(null)
  const redirectTimeoutRef = useRef<number | null>(null)
  const eventIdRef = useRef<string>(createEventId())
  const publicConfigRef = useRef<PublicClientConfig | null>(null)
  const [currentHeroImage, setCurrentHeroImage] = useState(0)
  const [loadedHeroImages, setLoadedHeroImages] = useState<Set<number>>(new Set())
  const [publicConfig, setPublicConfig] = useState<PublicClientConfig | null>(null)
  const [resolvedRedirectUrl, setResolvedRedirectUrl] = useState(DEFAULT_REDIRECT_URL)
  const [showAllFaqsModal, setShowAllFaqsModal] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [selectedWorkoutSection, setSelectedWorkoutSection] = useState<number>(0)
  const [selectedExercise, setSelectedExercise] = useState<number>(0)
  const [currentReview, setCurrentReview] = useState<number>(Math.floor(clientReviews.length / 2))
  const [submissionSchedule, setSubmissionSchedule] = useState<SubmissionSchedule | null>(null)
  const [submissionMomence, setSubmissionMomence] = useState<SubmissionMomenceStatus | null>(null)

  const selectedStudio = studios.find((studio) => studio.name === formData.studio)
  const redirectUrl = resolvedRedirectUrl || publicConfig?.redirectUrl || DEFAULT_REDIRECT_URL
  const openBarreProvisioned = submissionMomence?.openBarreProvisioned === true

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

  async function ensureTrackingReady() {
    let config = publicConfigRef.current

    if (!config) {
      try {
        config = await loadPublicClientConfig()
        publicConfigRef.current = config
        setPublicConfig((current) => current ?? config)
        const resolvedConfigRedirectUrl = config?.redirectUrl || DEFAULT_REDIRECT_URL
        setResolvedRedirectUrl((current) => current || resolvedConfigRedirectUrl)
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

  useEffect(() => {
    const imageNodes = BARRE_HERO_IMAGES.map((src, index) => {
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
    if (!loadedHeroImages.has(currentHeroImage)) {
      return
    }

    const heroInterval = window.setInterval(() => {
      setCurrentHeroImage((prev) => {
        const next = (prev + 1) % BARRE_HERO_IMAGES.length
        return loadedHeroImages.has(next) ? next : prev
      })
    }, 6500)

    return () => {
      window.clearInterval(heroInterval)
    }
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
    return () => {
      if (redirectTimeoutRef.current && typeof window !== "undefined") {
        window.clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const reviewTimeout = window.setTimeout(() => {
      setCurrentReview((prev) => (prev + 1) % clientReviews.length)
    }, 3000)

    return () => {
      window.clearTimeout(reviewTimeout)
    }
  }, [currentReview])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required"
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required"
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required"
    }
    if (!formData.studio) {
      newErrors.studio = "Please select a studio"
    }
    if (!formData.acceptedTerms) {
      newErrors.acceptedTerms = "You must accept the waiver and terms"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const getCountryOption = (code: string) => {
    return countryCodes.find((item) => item.country === code)
  }

  const getPhoneNumber = () => {
    const countryCode = getCountryOption(formData.countryCode)?.code || "+91"
    return countryCode + formData.phone.replace(/\s+/g, "")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

      // Get tracking payload
      const trackingPayload = getSubmissionTrackingPayload()

      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: parsedPhone.formatInternational(),
        phoneCountry: getCountryOption(formData.countryCode)?.country || "IN",
        center: selectedStudio?.backendName ?? formData.studio,
        type: "Barre 57",
        waiverAccepted: formData.acceptedTerms ? "accepted" : "",
        event_id: eventIdRef.current,
        source_form: isInfluencerFlow ? "influencer-barre-form" : "barre-trial-form",
        ...trackingPayload,
      }

      const response = await fetch(sameOriginApiUrl(isInfluencerFlow ? "/api/submit-influencer-lead" : "/api/submit-barre-lead"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        setStatusMessage({
          text: result.error || "Submission failed. Please try again.",
          tone: "error",
        })
        setIsSubmitting(false)
        return
      }

      // Track successful submission
      await trackSuccessfulSubmission(payload as { event_id?: string; utm_campaign?: string; utm_source?: string })

      // Show success celebration
      celebrateSuccess()

      const nextRedirectUrl = result.redirectUrl || publicConfigRef.current?.redirectUrl || DEFAULT_REDIRECT_URL
      setResolvedRedirectUrl(nextRedirectUrl)
      setSubmissionSchedule(result.schedule || null)
      setSubmissionMomence(result.momence || null)
      setShowSuccessModal(true)
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        countryCode: "+91",
        phone: "",
        studio: "",
        acceptedTerms: false,
      })
      eventIdRef.current = createEventId()
      scheduleRedirectToMomence(nextRedirectUrl, isInfluencerFlow ? 6500 : 2200)

      if (onSubmit) {
        onSubmit(result)
      }
    } catch (error) {
      console.error("Submission error:", error)
      setStatusMessage({
        text: "An error occurred. Please try again.",
        tone: "error",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const celebrateSuccess = () => {
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

  const isFormValid = formData.firstName.trim() && formData.lastName.trim() && formData.email.trim() && formData.phone.trim() && formData.studio && formData.acceptedTerms

  return (
    <div className="relative min-h-screen w-full overflow-x-auto bg-background">
      <canvas ref={confettiCanvasRef} className="pointer-events-none fixed inset-0 z-[70] h-full w-full" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[
          { top: "10%", left: "10%" },
          { top: "60%", left: "80%" },
          { top: "80%", left: "20%" },
        ].map(({ top, left }, index) => (
          <motion.div
            key={index}
            className="absolute text-slate-200/20"
            initial={{ opacity: 0.2, scale: 0.9 }}
            animate={{ opacity: [0.15, 0.3, 0.15], y: [0, -16, 0], rotate: [0, 10, -8, 0] }}
            transition={{ duration: 12 + index, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            style={{ top, left }}
          >
            <Heart className="h-14 w-14" />
          </motion.div>
        ))}
      </div>

      <div className="relative grid min-h-screen w-full min-w-0 lg:grid-cols-[40%_60%]">
        <div
          className="relative hidden h-screen overflow-hidden bg-black lg:block"
        >
          <AnimatePresence>
            <motion.div
              key={currentHeroImage}
              className="absolute inset-0 overflow-hidden bg-black"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 1.3 }}
            >
              <motion.img
                src={BARRE_HERO_IMAGES[currentHeroImage]}
                alt="Physique 57 Barre"
                className="h-full w-full object-cover object-top"
                initial={{ scale: 1.12, x: 18, y: 8 }}
                animate={{ scale: 1.03, x: -8, y: -10 }}
                exit={{ scale: 1.08, x: -18, y: 6 }}
                transition={{ duration: 8.5 }}
              />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-x-0 bottom-0 p-12 text-white">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-900/10 bg-gradient-to-br from-white/98 via-blue-50/95 to-blue-100/92 px-4 py-2 backdrop-blur-md shadow-sm">
              <Sparkles className="h-4 w-4 text-blue-200" />
              <span className="text-sm font-medium">Barre 57 Trial</span>
            </div>
            <h1 className="mb-4 max-w-md text-5xl font-bold">Experience Barre 57</h1>
            <p className="max-w-lg text-lg text-white/88">Join us for a complimentary Barre 57 class and discover the power of this proven method.</p>
          </div>
        </div>

        <div className="relative min-h-screen min-w-0 bg-background/95 backdrop-blur-sm lg:h-screen lg:overflow-y-auto">
          <div className="mx-auto w-full min-w-0 max-w-[1120px] px-3 pt-0 pb-6 sm:px-4 sm:pt-0 md:px-6 lg:px-10 lg:pt-0 xl:px-14 xl:pt-0">
            {showSuccessModal ? (
              <div className="flex min-h-[78vh] items-center justify-center">
                <div className="w-full max-w-3xl rounded-[32px] border border-slate-200/80 bg-white/85 px-4 py-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:px-10 sm:py-12">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 shadow-lg">
                    <CheckCircle2 className="h-12 w-12 text-white" />
                  </div>
                  <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-900/70">
                    {isInfluencerFlow && openBarreProvisioned ? "Open Barre added" : "Request received"}
                  </p>
                  <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
                    {isInfluencerFlow && openBarreProvisioned ? "Your Open Barre pass is ready" : "Thank you for your interest in Barre 57"}
                  </h2>
                  <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                    {isInfluencerFlow
                      ? "You are now being redirected to the class schedule page. A member of our Customer Excellence team will be in touch shortly to help with your next step."
                      : "A member of our Customer Excellence team will be in touch shortly to help you find the right Barre 57 studio session."}
                  </p>
                  {isInfluencerFlow && submissionSchedule?.groupedSessions?.length ? (
                    <div className="mt-8 text-left">
                      <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Upcoming classes</h3>
                      <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
                        {submissionSchedule.groupedSessions.slice(0, 4).map((group) => (
                          <div key={group.date} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                            <p className="text-sm font-bold text-slate-950">{formatScheduleDate(group.date)}</p>
                            <div className="mt-3 space-y-2">
                              {group.items.slice(0, 3).map((session) => (
                                <div key={session.id} className="grid grid-cols-[72px_1fr] gap-3 rounded-xl bg-slate-50 px-3 py-2">
                                  <p className="text-sm font-bold text-blue-900">{formatScheduleTime(session.startsAt)}</p>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-950">{session.title}</p>
                                    <p className="text-xs text-slate-600">
                                      {[session.instructorName, session.locationName, session.durationMinutes ? `${session.durationMinutes} min` : ""].filter(Boolean).join(" • ")}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <Button
                    className="mt-8 w-full bg-gradient-to-r from-emerald-600 to-blue-600 py-6 text-lg text-white hover:from-emerald-700 hover:to-blue-700"
                    onClick={() => window.location.assign(redirectUrl)}
                  >
                    {isInfluencerFlow ? "View Class Schedule" : "Continue"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="min-w-0 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_48px_140px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/50 backdrop-blur-xl sm:p-6 lg:p-8">
                  <div className="mb-8">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-900/30 bg-gradient-to-r from-blue-900/20 to-slate-300/30 px-4 py-2 backdrop-blur-sm">
                      <Sparkles className="h-4 w-4 text-blue-900" />
                      <span className="text-sm font-semibold text-blue-900">Book Your Barre Trial</span>
                    </div>
                    <h2 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">Claim Your Free Trial</h2>
                    <p className="text-muted-foreground">Sign up for your complimentary Barre 57 class.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="relative space-y-6 rounded-2xl border border-slate-300/90 bg-white/55 p-4 pt-8 shadow-sm sm:p-6 sm:pt-9">
                      <div className="absolute -top-3 left-4 inline-flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/15 to-slate-200/70 px-4 py-1.5 shadow-sm backdrop-blur-md">
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-900">1. Your details</span>
                        <span className="text-destructive">*</span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="font-semibold">
                            First name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(event) => handleInputChange("firstName", event.target.value)}
                            className={cn(
                              "h-12 border-slate-300/95 bg-white/70 backdrop-blur-sm focus:border-slate-800 focus:ring-slate-800/15",
                              errors.firstName && "border-destructive"
                            )}
                          />
                          {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="font-semibold">
                            Last name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(event) => handleInputChange("lastName", event.target.value)}
                            className={cn(
                              "h-12 border-slate-300/95 bg-white/70 backdrop-blur-sm focus:border-slate-800 focus:ring-slate-800/15",
                              errors.lastName && "border-destructive"
                            )}
                          />
                          {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email" className="font-semibold">
                            Email <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(event) => handleInputChange("email", event.target.value)}
                            className={cn(
                              "h-12 border-slate-300/95 bg-white/70 backdrop-blur-sm focus:border-slate-800 focus:ring-slate-800/15",
                              errors.email && "border-destructive"
                            )}
                          />
                          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone" className="font-semibold">
                            Phone number <span className="text-destructive">*</span>
                          </Label>
                          <div className="grid grid-cols-[56px_minmax(0,1fr)] items-stretch gap-2">
                            <Select value={formData.countryCode} onValueChange={(value) => handleInputChange("countryCode", value)}>
                              <SelectTrigger size="lg" className="h-12 w-[56px] min-w-[56px] shrink-0 justify-center border-slate-300/95 bg-white/70 px-2 backdrop-blur-sm">
                                <SelectValue placeholder="Code">
                                  <span className="text-base leading-none">{getCountryOption(formData.countryCode)?.flag}</span>
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
                              className={cn(
                                "h-12 flex-1 border-slate-300/95 bg-white/70 backdrop-blur-sm focus:border-slate-800 focus:ring-slate-800/15",
                                errors.phone && "border-destructive"
                              )}
                            />
                          </div>
                          {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="relative space-y-5 rounded-2xl border border-slate-300/90 bg-white/55 p-4 pt-8 shadow-sm sm:p-6 sm:pt-9">
                      <div className="absolute -top-3 left-4 inline-flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/15 to-slate-200/70 px-4 py-1.5 shadow-sm backdrop-blur-md">
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-900">2. Studio choice</span>
                        <span className="text-destructive">*</span>
                      </div>
                      <div className="space-y-2 mt-4">
                        <Label htmlFor="studio" className="font-semibold">
                          Preferred studio <span className="text-destructive">*</span>
                        </Label>
                        <Select value={formData.studio} onValueChange={(value) => handleInputChange("studio", value)}>
                          <SelectTrigger
                            size="lg"
                            className={cn(
                              "w-full border-slate-300/95 bg-white/70 backdrop-blur-sm focus:border-slate-800 focus:ring-slate-800/15",
                              errors.studio && "border-destructive"
                            )}
                          >
                            <SelectValue placeholder="Select a studio" />
                          </SelectTrigger>
                          <SelectContent className="border-slate-300 bg-white/95">
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
                        {errors.studio && <p className="text-sm text-destructive">{errors.studio}</p>}
                      </div>
                    </div>

                    <div className="relative space-y-3 rounded-2xl border border-slate-300/90 bg-white/55 p-4 pt-9 shadow-sm sm:p-6 sm:pt-10">
                      <div className="absolute -top-3 left-4 inline-flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/15 to-slate-200/70 px-4 py-1.5 shadow-sm backdrop-blur-md">
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-900">3. Confirmation</span>
                      </div>
                      <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 sm:items-center sm:gap-4">
                        <Checkbox
                          id="terms"
                          checked={formData.acceptedTerms}
                          onCheckedChange={(checked) => handleInputChange("acceptedTerms", Boolean(checked))}
                          className={cn("mt-0.5 h-5 w-5 rounded-md border-slate-400 data-[state=checked]:border-blue-900 data-[state=checked]:bg-blue-900 sm:mt-0", errors.acceptedTerms && "border-destructive")}
                        />
                        <div className="flex-1">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <label htmlFor="terms" className="cursor-pointer text-sm font-semibold leading-relaxed text-slate-900 sm:flex-1">
                              I have read and accept the waiver. <span className="text-destructive">*</span>
                            </label>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 rounded-full border-slate-300 bg-white px-4 text-xs font-semibold tracking-[0.08em] text-slate-800 hover:border-slate-900 hover:bg-slate-900 hover:text-white sm:self-auto"
                              onClick={() => setShowWaiverModal(true)}
                            >
                              View waiver
                            </Button>
                          </div>
                        </div>
                      </div>
                      {errors.acceptedTerms && <p className="text-sm text-destructive">{errors.acceptedTerms}</p>}
                    </div>

                    {statusMessage && (
                      <div
                        className={cn(
                          "rounded-xl border px-4 py-3 text-sm",
                          statusMessage.tone === "error"
                            ? "border-red-300 bg-red-50 text-red-800"
                            : "border-emerald-300 bg-emerald-50 text-emerald-800"
                        )}
                      >
                        {statusMessage.text}
                      </div>
                    )}

                    <Button
                      id="barre-submit-button"
                      type="submit"
                      size="lg"
                      className="h-14 w-full bg-gradient-to-r from-blue-950 to-blue-900 text-lg shadow-lg transition-all duration-300 hover:from-slate-950 hover:to-blue-950 hover:shadow-xl"
                      disabled={isSubmitting || !isFormValid}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Booking your trial...
                        </>
                      ) : (
                        "Book Your Free Trial"
                      )}
                    </Button>
                  </form>
                </div>

                {/* KEY BENEFITS SECTION */}
                <section className="mt-20 space-y-12">
                  <div className="mx-auto max-w-5xl">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/10 to-slate-200/50 px-4 py-2 backdrop-blur-sm">
                      <Award className="h-4 w-4 text-blue-900" />
                      <span className="text-sm font-semibold text-blue-900">What Sets Us Apart</span>
                    </div>
                    <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">Key Benefits</h2>
                    <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
                      Discover the proven advantages that make Barre 57 India the preferred choice for fast, visible results and sustainable transformation.
                    </p>
                  </div>

                  <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-2">
                    {keyBenefits.map((benefit, index) => {
                      const Icon = benefitIcons[benefit.icon]
                      const colors = colorClasses[benefit.color as keyof typeof colorClasses]

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

                {/* LOCATIONS SECTION */}
                <section className="mt-20 space-y-12">
                  <div className="mx-auto max-w-4xl">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-200/50 px-4 py-2 backdrop-blur-sm">
                      <MapPin className="h-4 w-4 text-amber-700" />
                      <span className="text-sm font-semibold text-amber-900">Studio Locations</span>
                    </div>
                    <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">Choose Your Studio</h2>
                    <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
                      Each location carries the Barre 57 method, with its own neighborhood energy and format offerings.
                    </p>
                  </div>

                  <div className="mt-12 grid gap-8 md:grid-cols-2">
                    {studios.map((studio, index) => (
                      <motion.div
                        key={studio.name}
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.5, delay: index * 0.12 }}
                        className="group overflow-hidden rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white/95 to-slate-50/60 shadow-sm transition-all duration-300 hover:shadow-2xl"
                      >
                        <div className="space-y-6 p-8">
                          <div className="flex items-start gap-6">
                            <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                              <Building2 className="relative z-10 h-8 w-8 text-white" />
                              <div className="absolute inset-0 rounded-2xl bg-white/20" />
                            </div>
                            <div className="flex-1">
                              <h3 className="mb-2 text-2xl font-bold text-foreground transition-colors group-hover:text-blue-900">{studio.name}</h3>
                              <p className="text-sm leading-relaxed text-muted-foreground">{studio.description}</p>
                            </div>
                          </div>

                          <div className="space-y-3 rounded-2xl border-2 border-slate-200 bg-white/80 p-6 text-sm shadow-sm backdrop-blur-sm">
                            {[
                              { icon: MapPin, title: "Location", value: studio.neighborhood },
                              { icon: Phone, title: "Phone", value: studio.phone },
                              { icon: Clock, title: "Hours", value: studio.hours },
                              { icon: Building2, title: "Address", value: studio.address },
                            ].map((item) => {
                              const ItemIcon = item.icon
                              return (
                                <div key={item.title} className="flex items-start gap-3">
                                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 shadow-sm">
                                    <ItemIcon className="h-5 w-5 text-blue-900" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="mb-1 font-bold text-blue-900">{item.title}</p>
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
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl"
                          >
                            <MapPin className="h-4 w-4" />
                            Get Directions
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
                

                {/* MEMBER REVIEWS SECTION */}
                <section className="relative mt-20 space-y-12 pb-2 overflow-hidden">
                  {/* Animated background gradient */}
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
                      {/* Sliding carousel - translate container based on current review index */}
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
                            {/* Card that will slide across positions */}
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
                                  {/* Quote Icon */}
                                  <div className="mb-2">
                                    <svg className="h-8 w-8 text-rose-300/60" fill="currentColor" viewBox="0 0 32 32">
                                      <path d="M8 12l2.266-5.333h4.934l-3.6 8h-3.6v9.333h8v-8.933l3.867-4C20.8 8.133 20.4 4.667 22 2h-4.267C18 6 12 12 8 21v-9z" />
                                    </svg>
                                  </div>
                                  
                                  <div className="flex-1">
                                    {/* Review Text */}
                                    <p className="mb-6 text-lg font-medium leading-relaxed text-foreground">"{review.review}"</p>
                                  </div>

                                  {/* Star Rating */}
                                  <div className="mb-4 flex gap-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                      >
                                        <span className="text-lg">⭐</span>
                                      </motion.div>
                                    ))}
                                  </div>

                                  {/* User Info */}
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
                                  {/* Subtle Quote Icon */}
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

                                  {/* Hidden star rating in dimmed */}
                                  <div className="mb-3 flex gap-0.5 opacity-30">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <span key={i} className="text-sm">⭐</span>
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

                      {/* Navigation Dots - Enhanced */}
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

                      {/* Review counter */}
                      <div className="mt-6 text-center">
                        <p className="text-sm font-medium text-muted-foreground">
                          <span className="font-bold text-rose-600">{currentReview + 1}</span> of <span className="font-bold text-rose-600">{clientReviews.length}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* FAQs SECTION */}
                <section className="mt-20 space-y-12 pb-2">
                  <div className="mx-auto max-w-5xl">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-900/20 bg-gradient-to-r from-blue-900/10 to-slate-200/50 px-4 py-2 backdrop-blur-sm">
                      <Info className="h-4 w-4 text-blue-900" />
                      <span className="text-sm font-semibold text-blue-900">Questions</span>
                    </div>
                    <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">Helpful Answers Before You Book</h2>
                    <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
                      Everything you need before your first class.
                    </p>
                  </div>

                  <div className="mt-12 space-y-4">
                    {ALL_FAQS.map((faq, index) => (
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
                          Read fullwaiver
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>

      {/* All FAQs Modal */}
      <ModalShell open={showAllFaqsModal} onClose={() => setShowAllFaqsModal(false)} className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-2xl font-bold">All FAQs</h3>
          <button onClick={() => setShowAllFaqsModal(false)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-3">
          {ALL_FAQS.map((faq, index) => (
            <div key={index} className="rounded-xl border border-slate-200/50 bg-white/40 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-white/20"
              >
                <h4 className="font-semibold text-foreground pr-4">{faq.question}</h4>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 flex-shrink-0 transition-transform duration-300 text-muted-foreground",
                    openFaq === index && "rotate-180"
                  )}
                />
              </button>
              {openFaq === index && (
                <div className="border-t border-slate-200/30 px-4 py-3 space-y-2">
                  {faq.answer.map((answer, ansIndex) => (
                    <p key={ansIndex} className="text-sm text-muted-foreground leading-relaxed">
                      {answer}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <Button onClick={() => setShowAllFaqsModal(false)} className="mt-6 w-full bg-blue-900 hover:bg-blue-950">
          Close
        </Button>
      </ModalShell>

      <ModalShell open={showWaiverModal} onClose={() => setShowWaiverModal(false)} className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-2xl font-bold">Waiver & Terms</h3>
          <button onClick={() => setShowWaiverModal(false)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          {waiverSections.map((section, sectionIndex) => (
            <div key={section.title ?? `section-${sectionIndex}`} className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
              {section.title && <h4 className="text-base font-bold text-slate-950">{section.title}</h4>}
              {section.paragraphs?.map((paragraph, paragraphIndex) => (
                <p key={`paragraph-${sectionIndex}-${paragraphIndex}`}>{paragraph}</p>
              ))}
            </div>
          ))}
        </div>
        <Button onClick={() => setShowWaiverModal(false)} className="mt-6 w-full bg-blue-900 hover:bg-blue-950">
          I Understand
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className={cn("max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-xl", className)}>
        {children}
      </div>
    </div>
  )
}
