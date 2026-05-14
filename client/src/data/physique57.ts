export interface CountryCode {
  code: string
  country: string
  name: string
  flag: string
}

export interface Studio {
  name: string
  backendName: string
  location: string
  address: string
  neighborhood: string
  phone: string
  hours: string
  formats: string[]
  description: string
  scheduleLocationId: string
  lat: number
  lng: number
}

export interface FormatOption {
  id: string
  backendValue: string
  icon: string
  title: string
  subtitle: string
  description: string
  fullDescription: string
  image: string
  imageAlt: string
  intensity: string
  bestFor: string
  duration: string
  trainingStyle: string
  warningBadge?: string
  highlights: string[]
}

export interface MembershipOffer {
  name: string
  price: string
  sessions: string
  validFor: string
  description: string[]
  highlights: string[]
}

export interface Benefit {
  icon: "sparkles" | "trophy" | "shield" | "heart" | "award" | "users" | "target" | "zap"
  color: "blue" | "amber" | "emerald" | "rose" | "violet" | "cyan" | "orange" | "indigo"
  title: string
  description: string
  tooltip: string
}

export interface JourneyStep {
  number: string
  title: string
  description: string
}

export interface Review {
  name: string
  class: string
  review: string
  date: string
}

export interface FaqItem {
  question: string
  answer: string[]
}

export interface ContentSection {
  title?: string
  paragraphs?: string[]
  bullets?: string[]
}

export const countryCodes: CountryCode[] = [
  { code: "+1", country: "US", name: "United States", flag: "🇺🇸" },
  { code: "+1", country: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "+20", country: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "+27", country: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "+31", country: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "+32", country: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "+33", country: "FR", name: "France", flag: "🇫🇷" },
  { code: "+34", country: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "+39", country: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "+41", country: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "+44", country: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+45", country: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "+47", country: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "+49", country: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "+52", country: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "+55", country: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "+60", country: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "+61", country: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "+62", country: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "+63", country: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "+64", country: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "+65", country: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "+66", country: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "+81", country: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "+82", country: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "+84", country: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "+86", country: "CN", name: "China", flag: "🇨🇳" },
  { code: "+90", country: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "+91", country: "IN", name: "India", flag: "🇮🇳" },
  { code: "+92", country: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "+93", country: "AF", name: "Afghanistan", flag: "🇦🇫" },
  { code: "+94", country: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "+971", country: "AE", name: "UAE", flag: "🇦🇪" },
  { code: "+972", country: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "+974", country: "QA", name: "Qatar", flag: "🇶🇦" },
]

export const heroImages = [
  "https://i.postimg.cc/VvZTF5Sj/hp-Img-1770172692.png",
  "https://i.postimg.cc/1XWy5H3w/main2.png",
  "https://i.postimg.cc/wMDd7jtj/IMG-7853-2.jpg",
  "https://i.postimg.cc/526bSnvX/2L2A8104.jpg",
  "https://i.postimg.cc/Rh4nWjWY/Whats-App-Image-2025-04-03-at-11-03-13-AM-(1).jpg",  
]

export const studios: Studio[] = [
  {
    name: "Kwality House, Kemps Corner",
    backendName: "Kwality House, Kemps Corner",
    location: "Kemps Corner, Mumbai",
    address: "Kwality House, August Kranti Rd, below Kemps Corner, Grant Road, Mumbai 400036",
    neighborhood: "Kemps Corner",
    phone: "097696 65757",
    hours: "Mon-Sat: 6:00 AM - 9:00 PM | Sun: 7:00 AM - 7:00 PM",
    formats: ["powercycle", "strength-lab"],
    description: "Grant Road, Mumbai",
    scheduleLocationId: "9030",
    lat: 19.0633,
    lng: 72.8692,
  },
  {
    name: "Supreme HQ, Bandra",
    backendName: "Supreme Headquarters, Bandra",
    location: "Bandra West, Mumbai",
    address: "203, Supreme Headquarters, Junction of 14th & 33rd Rd, opposite Monkey Bar, Bandra West, Mumbai 400050",
    neighborhood: "Bandra West",
    phone: "097696 65757",
    hours: "Mon-Sat: 6:00 AM - 9:00 PM | Sun: 7:00 AM - 7:00 PM",
    formats: ["powercycle"],
    description: "Bandra West, Mumbai",
    scheduleLocationId: "29821",
    lat: 19.0596,
    lng: 72.8295,
  },
]

export const formats: FormatOption[] = [
  {
    id: "powercycle",
    backendValue: "powerCycle",
    icon: "🚲",
    title: "Low-impact cardio blast",
    subtitle: "powerCycle",
    description: "Meaningful resistance, music, and measurable progress.",
    fullDescription:
      "PowerCycle is our signature indoor cycling experience that combines rhythm-based choreography with inspiring music. Expect a full-body workout that challenges cardiovascular endurance while building lean muscle.",
    image: "https://i.postimg.cc/1XWy5H3w/main2.png",
    imageAlt: "powerCycle indoor cycling class at Physique 57 India",
    intensity: "Moderate to high",
    bestFor: "Cardio conditioning, toned legs, endorphin boost",
    duration: "30 or 45 mins",
    trainingStyle: "Indoor cycling + resistance intervals",
    highlights: [
      "Excellent cross-training option for guests who also love barre",
      "Lets you track progress through real riding metrics",
      "Best if you want sweat, stamina, and rhythm-driven motivation",
    ],
  },
  {
    id: "strength-lab",
    backendValue: "Strength Lab",
    icon: "🏋️",
    title: "Full Body Strength",
    subtitle: "Strength Lab",
    description: "Intermediate-level full-body strength with heavy lifts, core work, power, and mobility.",
    fullDescription:
      "INTERMEDIATE LEVEL - 57 minutes of full-body strength. This class blends heavy strength, core, power lifts & mobility work for complete training. Using dumbbells, kettlebells, plyo boxes, resistance bands & a pull up bar, you'll move through circuits that hit every major muscle group. Built on progressive overload, Strength Lab helps you build lean muscle, boost metabolism, and improve overall performance — while reducing injury risk. Pair it with Barre & Powercycle for the ultimate balanced routine.",
    image: "https://i.postimg.cc/wMDd7jtj/IMG-7853-2.jpg",
    imageAlt: "Strength Lab class format at Physique 57 India",
    intensity: "High",
    bestFor: "Functional strength, muscular power, conditioning",
    duration: "57 mins",
    trainingStyle: "Strength intervals + heavy weights + core",
    warningBadge: "Not for complete strength training beginners",
    highlights: [
      "Focuses on progressive resistance with heavier loads than classic barre",
      "Combines endurance work and core conditioning for a stronger overall training effect",
      "Best if you want a more strength-led first class than sculpt- or cardio-first formats",
    ],
  },
]

export const membershipOffer: MembershipOffer = {
  name: "Newcomers 2 For 1",
  price: "₹1,838.00",
  sessions: "2 Sessions",
  validFor: "14 Days",
  description: [
    "Whether you're a fitness enthusiast or just starting out, Physique 57's Newcomers 2 For 1 is the perfect way to experience the method with expert guidance and a premium studio experience.",
    "Your two sessions come with expert guidance, a curated intro to the method, and a studio experience that'll make you want to come back for more.",
  ],
  highlights: [
    "2 introductory sessions included",
    "Valid for 14 days from first use",
    "Late cancellations within 12 hours result in loss of credit",
    "Non-refundable and non-transferable",
    "Subject to studio availability and booking policies",
  ],
}

export const keyBenefits: Benefit[] = [
  {
    icon: "sparkles",
    color: "blue",
    title: "Proven, Visible Results in Weeks",
    description:
      "Physique 57 is known for delivering fast, visible transformation—leaner arms, lifted glutes, stronger core, and improved posture—within just a few weeks.",
    tooltip: "See results in 2–3 weeks with 3-4 classes per week",
  },
  {
    icon: "trophy",
    color: "amber",
    title: "Proprietary, Globally Proven Method",
    description:
      "This signature method was developed in New York and refined over years, giving members a system that feels premium, polished, and internationally trusted.",
    tooltip: "Trusted by members in 10+ countries worldwide",
  },
  {
    icon: "shield",
    color: "emerald",
    title: "High-Intensity Yet Low-Impact",
    description:
      "The workout deeply fatigues muscles without putting stress on joints, making it intense enough for results and sustainable enough for long-term consistency.",
    tooltip: "Ideal for all ages and fitness levels",
  },
  {
    icon: "heart",
    color: "rose",
    title: "Celebrity-Endorsed and Loved",
    description:
      "The brand’s strong aspirational value comes from its premium reputation and longstanding association with visible, physique-focused results.",
    tooltip: "Featured in Vogue, Elle, and Harper’s Bazaar",
  },
  {
    icon: "award",
    color: "violet",
    title: "Award-Winning Fitness Method",
    description:
      "Global recognition and premium studio positioning reinforce the method’s credibility, quality, and consistency across locations.",
    tooltip: "Winner of multiple international fitness awards",
  },
  {
    icon: "users",
    color: "cyan",
    title: "Expert-Led, Hands-On Coaching",
    description:
      "Highly trained & certified instructors actively correct form, guide alignment, and ensure every movement is effective and safe.",
    tooltip: "Instructors complete extensive method training",
  },
  {
    icon: "target",
    color: "orange",
    title: "Structured, Progressive Programming",
    description:
      "Each class follows a designed structure that builds strength, endurance, and control over time—no random workouts, just consistent progress.",
    tooltip: "Follow a proven system, not random programming",
  },
  {
    icon: "zap",
    color: "indigo",
    title: "Strong Community and Accountability",
    description:
      "A supportive boutique environment helps members stay motivated, consistent, and emotionally connected to their fitness routine.",
    tooltip: "Join a loyal and supportive studio community",
  },
]

export const journeySteps: JourneyStep[] = [
  {
    number: "01",
    title: "Tell us what suits you",
    description: "Share your preferred studio and the format you want to begin with.",
  },
  {
    number: "02",
    title: "We review your preferences",
    description: "The studio team checks your selected location and preferred format to shape the best first recommendation.",
  },
  {
    number: "03",
    title: "You receive a guided confirmation",
    description: "You hear back with the best-fit option, next steps, and booking details needed to secure your first class.",
  },
  {
    number: "04",
    title: "We help you prepare",
    description: "You’ll know what to wear, when to arrive, and what to expect so your first visit feels stress-free.",
  },
  {
    number: "05",
    title: "Arrive ready for your first session",
    description: "Walk in with clarity, confidence, and a format that suits your schedule, goals, and energy.",
  },
  {
    number: "06",
    title: "Feel the signature finish",
    description: "Expect expert coaching, boutique energy, and the unmistakable shake that makes the method memorable from class one.",
  },
]

export const clientReviews: Review[] = [
  { name: "Priyashi Mehta Kothari", class: "Studio SWEAT in 30", review: "The 30-minute format is perfect for my busy schedule. I've seen visible toning in just 4 weeks!", date: "Nov 21, 2023" },
  { name: "Sheetal Chauhan", class: "Studio Cardio Barre", review: "Wonderful session and awesome energy! The instructors push you in the best way possible.", date: "Mar 14, 2024" },
  { name: "Smita Modi", class: "powerCycle", review: "Wonderful class in every respect—Kauveri is too good! Leaves me energized for the entire day.", date: "Feb 9, 2026" },
  { name: "Aashna Godha", class: "powerCycle", review: "Amazing playlist. Amazing workout. I'm already stronger and my legs are more defined.", date: "Aug 8, 2025" },
  { name: "Chitra Balachandran", class: "Studio FIT", review: "We need a sixth star for this one. Incredible! My entire body has transformed.", date: "Apr 4, 2025" },
  { name: "Amruta Patil", class: "Studio Mat 57", review: "Very nice experience. There was a lovely flow throughout the class. So rejuvenating!", date: "May 19, 2025" },
  { name: "Sunita Singhania", class: "Studio Barre 57", review: "Very good. Time just flew. I'm hooked—this is my favorite way to work out now.", date: "Aug 7, 2025" },
  { name: "Roopali Misra", class: "Studio Barre 57", review: "Tough class but it feels so good to do. I'm more confident and strong.", date: "Feb 9, 2026" },
  { name: "Divya Kapoor", class: "Studio Strength Lab", review: "Best investment in myself! The strength gains are real and visible. I feel powerful.", date: "Jan 15, 2026" },
  { name: "Neha Sharma", class: "Cardio Barre Plus", review: "The combination of cardio and barre is genius. Already down 2 kg and feeling amazing!", date: "Dec 28, 2025" },
  { name: "Ritika Verma", class: "Studio SWEAT in 30", review: "Perfect for post-work sessions. Low impact but such high results. Highly recommend!", date: "Jan 22, 2026" },
  { name: "Pooja Desai", class: "powerCycle", review: "I love tracking my progress with the metrics. The motivation is unreal. Best 30 mins ever!", date: "Feb 1, 2026" },
  { name: "Ankita Nair", class: "Back Body Blaze", review: "My posture has never been better. I'm standing taller and feeling stronger every day.", date: "Dec 10, 2025" },
  { name: "Kavya Reddy", class: "Studio Foundations", review: "Started as a complete beginner but the instructors made me feel so supported and confident!", date: "Nov 30, 2025" },
  { name: "Sakshi Iyer", class: "FIT + Strength Lab", review: "Mix of both formats is perfection. My body composition has completely changed in 6 weeks!", date: "Jan 8, 2026" },
  { name: "Zara Khan", class: "Mat 57", review: "So much deeper strength than I expected. My core is fire and I feel so grounded.", date: "Feb 3, 2026" },
]

export const faqs: FaqItem[] = [
  {
    question: "What is Physique 57?",
    answer: [
      "Physique 57 is India’s first barre-based workout, designed to target full-body muscle endurance in every class. For fitness newbies and professional athletes alike, our classes are designed to sculpt muscle, burn fat and transform your entire body.",
      "Offered in a group class or private training format, our low impact, high-intensity workout incorporates our scientifically proven method, ‘Interval Overload’ by blending cardio, strength training, stretching and recovery to improve your endurance and boost your metabolism.",
    ],
  },
  {
    question: "What are the benefits of Physique 57?",
    answer: [
      "We offer a highly effective full-body workout program that provides numerous benefits. We have designed it to tone and sculpt your entire body through a unique combination of pilates, yoga, and cardio & strength training.",
      "Some of the main benefits of Physique 57 include:",
      "Total body toning and sculpting: Our workout targets all major muscle groups to help enhance muscle definition and shape your physique from head to toe. It can help create a lean, toned, and athletic-looking body.",
      "Improved posture and alignment: We emphasize correct form, posture, and body alignment using pilates and ballet techniques. This can improve overall posture over time.",
      "Increased flexibility and range of motion: The stretching and movement components of Physique 57 make it excellent for enhancing flexibility and mobility.",
      "Core strength: Our program strongly focuses on exercises that engage and strengthen the deep core muscles of the body. This can result in improved stability and strength in the midsection.",
      "Low impact: Many of our moves involve isometric holds rather than high-impact movements, making it gentle on the joints while still delivering results. It's suitable for most fitness levels.",
      "Full-body mind-muscle connection: Physique 57 trains you to focus on engaging the correct muscles during exercises, helping to target specific areas and maximize the benefits.",
    ],
  },
  {
    question: "Who can do Physique 57?",
    answer: [
      "We welcome individuals of all fitness levels, whether you're just starting or more advanced. Physique 57 is a safe and effective choice for prenatal and postnatal women, and there's no specific age limit. Your well-being and fitness journey are important to us.",
    ],
  },
  {
    question: "How often should I do Physique 57?",
    answer: [
      "For optimal results, we recommend taking Physique 57 classes at least 3-4 times a week. Keep in mind that the frequency can be adjusted to align with your individual fitness goals and preferences.",
    ],
  },
  {
    question: "What types of classes are offered by Physique 57?",
    answer: [
      "We offer a range of classes, showcasing methods from our Signature Barre to Mat Pilates, Indoor Cycling, Functional Strength training & more.",
      "These classes are designed to cater to different fitness levels and goals. You can choose from workouts that focus on toning and strengthening specific muscle groups or opt for full-body sessions that incorporate cardio and strength training.",
      "Whether you're seeking high-intensity options like Amped Up or shorter, time-efficient workouts like powerCycle(Express), our classes provide various benefits, including improved posture, flexibility, endurance, and overall body strength. No two workouts are ever the same. You’ll never plateau.",
    ],
  },
  {
    question: "How soon can I see results with Physique 57?",
    answer: [
      "Many of our clients start noticing positive changes in their bodies, posture, sleep, and overall mood after completing just eight classes in 2 weeks. Consistency and regular practice are key to achieving and maintaining your desired results with Physique 57.",
    ],
  },
  {
    question: "Can I attend Physique 57 classes if I'm not flexible?",
    answer: [
      "We welcome individuals of all flexibility levels. Our method is designed to help improve flexibility over time, and our exercises are crafted to work with various ranges of motion. You don't need to be naturally flexible to begin or succeed in Physique 57.",
    ],
  },
  {
    question: "Can I join Physique 57 if I have never done barre before?",
    answer: [
      "Absolutely! Physique 57 is a great fit for individuals who are new to barre workouts or fitness in general. Our instructors provide clear guidance and offer modifications for beginners, ensuring that they feel comfortable and confident in the classes.",
    ],
  },
  {
    question: "Do I need any prior dance experience to do Physique 57?",
    answer: [
      "No, you don't need any prior dance experience to enjoy the benefits of Physique 57. Our method is designed for people of all backgrounds and fitness levels. We focus on the workout techniques and movements, rather than dance choreography.",
    ],
  },
  {
    question: "How long is each Physique 57 class?",
    answer: [
      "The duration of a typical Physique class varies, but most classes are approximately 57 minutes long. However, we also offer options for shorter durations, such as the Sweat in 30 or the 45-minute express classes. You can choose the duration that best suits your schedule and preferences.",
    ],
  },
  {
    question: "Do I need to bring any equipment for Physique 57 classes?",
    answer: [
      "No, there's no need to bring your own equipment to our classes. Physique provides all the necessary equipment, which may include hand weights, playground balls, resistance bands, and the ballet barre for support. Our studios are full service with luxury fittings & amenities in our Locker Rooms & Waiting areas as well.",
    ],
  },
  {
    question: "Are there modifications available for different fitness levels?",
    answer: [
      "In our approach, we prioritize providing a safe and effective workout experience for all our clients. While our workouts may not be entirely customizable, we do encourage beginners to dedicate more time to our foundation levels.",
      "This helps them approach their classes at Physique 57 in a safer, more effective manner. For those who are more advanced or fitter, we offer opportunities to explore higher levels of intensity and challenge. Our aim is to ensure that regardless of fitness level, you can continue to progress & grow, while safely achieving your fitness goals.",
    ],
  },
  {
    question: "Can I do Physique 57 if I have an injury or physical limitations?",
    answer: [
      "Although our workouts are suitable for individuals with a diverse range of medical conditions, it's important to note that the suitability can vary based on the specific details of the individual's condition. If you have a specific medical condition, we will require you to obtain clearance to workout from your doctor before you attend a Physique 57 class.",
    ],
  },
  {
    question: "Can I take Physique 57 classes if I'm pregnant?",
    answer: [
      "Physique is considered a safe and effective option for prenatal women. The low-impact nature and focus on form and control make it an excellent choice for maintaining fitness and preparing for labor and delivery. However, it is important to consult with your healthcare provider before starting or continuing any exercise routine during pregnancy.",
    ],
  },
  {
    question: "Can I do Physique 57 if I've recently given birth?",
    answer: [
      "Physique can assist in postnatal recovery and rehabilitation. The low-impact exercises and focus on targeted core toning can help rebuild the core & overall strength and endurance postpartum. However, it is important to consult with your healthcare provider before starting or resuming any exercise program after childbirth.",
    ],
  },
  {
    question: "Can I do Physique 57 if I have a specific medical condition?",
    answer: [
      "Although our workouts are suitable for individuals with a diverse range of medical conditions, it's important to note that the suitability can vary based on the specific details of the individual's condition. If you have a specific medical condition, we will require you to obtain clearance to workout from your doctor before you attend a Physique 57 class.",
    ],
  },
  {
    question: "Can I do Physique 57 if I have mobility issues?",
    answer: [
      "Physique 57 can be adapted for individuals with certain mobility issues. Our instructors can provide modifications and alternatives to exercises to accommodate different levels of mobility. It is recommended to inform the instructor about any specific limitations or concerns you may have, so they can provide appropriate guidance during the class.",
    ],
  },
  {
    question: "Can I take Physique 57 classes if I have preexisting injuries?",
    answer: [
      "Physique 57 classes can be modified to accommodate individuals with preexisting injuries. It is important to inform the instructor about your injuries before the class, so they can provide appropriate modifications and alternatives to exercises to ensure your safety and comfort. It is recommended to consult with your healthcare provider or physical therapist for guidance specific to your condition.",
    ],
  },
  {
    question: "Are there options for private training at Physique 57?",
    answer: [
      "Yes, Physique 57 offers a comprehensive menu of private training sessions. You can contact the studio directly or inquire with our concierge team for more information about private training options, including personalized sessions tailored to your specific goals and needs.",
    ],
  },
  {
    question: "Can I do Physique 57 if I have a busy schedule?",
    answer: [
      "Yes, we offer a variety of class formats and duration options to accommodate different schedules. You can choose from full-length, 57-minute classes or Express, 45-minute classes, which provide an effective workout in less time.",
    ],
  },
  {
    question: "How many Physique 57 locations are there?",
    answer: [
      "Physique 57 offers in-person classes in Mumbai at Taj Wellington Mews and Kwality House studios.",
    ],
  },
  {
    question: "How do I sign up for Physique 57 classes?",
    answer: [
      "To book your classes, simply download the Physique India App (by Momence) and log in with your registered email id. You can find our app on both the Apple App Store and Android Play Store.",
    ],
  },
  {
    question: "What should I wear and bring to a Physique 57 class?",
    answer: [
      "For Physique classes, we recommend wearing comfortable workout attire that allows freedom of movement. Most participants choose to wear grip socks during the class. It's also advisable to bring a water bottle to stay hydrated and a towel if desired.",
    ],
  },
  {
    question: "Can I attend Physique 57 classes if I'm visiting from out of town?",
    answer: [
      "Yes, we warmly welcome visitors from out of town. You can check the availability of classes at your desired location and reserve your spot in advance to ensure you can participate in the classes during your visit.",
    ],
  },
  {
    question: "Is there a cancellation policy for Physique 57 classes?",
    answer: [
      "All cancellations for Studio classes must be informed to the front desk team via official channels i.e. email, WhatsApp, via the Physique 57 India app or directly in person at least 12 hours prior to the Scheduled start time of the reserved class. All Private Bookings/Workshop Reservations can be cancelled without incurring any charge, provided the cancellation request reaches the front desk team no later than 24 hours until the scheduled start time of the private session. Failure to adhere to the cancellation policy will result in the deduction of the class from your Class Package.",
      "If you cancel a reservation more than 12 hours before the scheduled class start time, the class will be credited to your Physique 57 account for future reservations.",
    ],
  },
  {
    question: "How can I sign up for a trial class?",
    answer: [
      "To book yourself for a complimentary trial session, you can follow the link below and register for the class. Please do arrive 10-minutes before the scheduled class start time to speak with your trainer.",
    ],
  },
  {
    question: "Can I have a look at your class schedule?",
    answer: [
      "Of course, you can find our class schedule here, where you can also purchase a membership and book yourself into a class of your choosing. Your fitness journey is important to us.",
    ],
  },
]

export const waiverSections: ContentSection[] = [
  {
    paragraphs: [
      "In exchange for the Fees and during the Term of this agreement, you will have access to each Physique 57 location in Mumbai during regular studio hours and you will have the right to participate in instructional classes offered by the studio subject to availability. Services offered by the studio will include classes in the Physique 57 ® fitness technique.",
      "The Fees payable under the terms of this Agreement are for the period of time and are in no way related to your actual usage of the Studio facilities.",
      "For the avoidance of doubt, please note that, you are not, under any circumstances whatsoever, entitled to receive a refund of the Fees or any part thereof, under this membership agreement. Physique 57 reserves the right to cancel this membership and terminate this agreement at any time in the event that the member engages in behaviour that is unsafe or objectionable to other members or Physique 57 Staff.",
      "You shall at all times comply with and be bound by the policies, rules and regulations of Physique 57, as framed and modified from time to time, in all matters, including relating to your access and use of Physique 57’s facilities, equipment and generally in relation to the services being provided to you hereunder.",
      "Any personal property brought to a Physique 57 India Studio is brought at your sole risk as to its theft, damage, or loss. You agree that Physique 57 India is in no way responsible for the safekeeping of your personal belongings while you attend Classes or are otherwise at a Physique 57 location.",
    ],
  },
  {
    title: "Release, Indemnity & Participation Consent",
    paragraphs: [
      "In connection with my enrolment and participation in the exercise class / program organised by AMP Fitness, LLP (“AMP”) and use of the property, facilities and services provided to me by AMP (“Program”), I hereby, on behalf myself and my relatives, heirs, successors, executors and administrators, indemnify and agree to release, waive, discharge and agree and covenant to indemnify, release, waive, discharge and not to sue AMP, its designated partners, other partners, shareholders, directors, subsidiaries, affiliates, its and their licensees, licensors, successors, assigns, employees, officers, directors, consultants, service providers, agents, and contractors, and all persons, corporations, partnerships and other entities with which these entities may have become affiliated or may otherwise have dealings with at any time in the future, from any and all liability, claims, demands, actions and causes of action whatsoever arising out of or relating to any loss, expense, damages, injury, illnesses, diseases, disorders, conditions, disablement (whether partial, total, permanent or temporary), grievous bodily injury including death, that may be sustained by me, or to any property belonging to me, whether directly or indirectly caused to me by any person and on account of any reason whatsoever, whether by reason of due to my acts or omissions or by AMP or any of its instructors/ operators, or otherwise as a result of participating in the Program.",
      "I am voluntarily participating in the Program with full knowledge, understanding and appreciation of the risks inherent in any physical exercise and expressly assume all risks of injury, illnesses, diseases, disorders, conditions and even partial or permanent disablement and/or death which could occur by reason of my participation.",
      "I have disclosed all relevant information regarding my physical, medical, emotional or mental conditions that could cause harm to me or others by participating in this Program and I hereby expressly declare, confirm and state that I have neither at any time suffered nor currently suffer nor am I susceptible to suffering any form of health condition which prevents or could prevent me, in any manner whatsoever, from participating in the Program in the manner as required by AMP.",
      "I am executing this Release cum Indemnity Agreement after having viewed or having had the opportunity to view the site of AMP’s trial exercise classes; having reviewed the instructor’s qualifications; having had the scope of AMP’s classes and their associated risks fully explained to me; and after asking or having had an opportunity to ask questions regarding the classes and risks associated with AMP’s exercise classes.",
      "I hereby further declare, confirm and state that I have all the requisite qualifications and minimum fitness requirements to enable me to participate in the Program. I agree that my safety is primarily my own responsibility.",
      "I agree to make sure that I know how to safely participate in the Program, and I agree to observe any and all rules, codes, guidelines, procedures, manuals and practices that may be required to minimize the risk of injuries, illnesses, diseases, disorders, conditions and even partial or permanent disablement and/or death whether or not such rules, codes, guidelines, procedures, manuals and practices are specifically and/or expressly conveyed to me.",
      "I acknowledge that I am fully aware and conversant with the precautions that I am required to take in connection with any and all physical activities whilst partaking in the activities forming a part of the Program. I agree to stop and seek assistance if I do not believe I can safely continue with the activities involved in the Program, to limit my participation in the said Program to reflect my personal fitness level, and to refrain from any and all actions that would pose any form of hazard to myself or others in the Program.",
      "The services provided by AMP to me under the Program are on an is “as is” basis, without warranty of any kind, either expressed or implied, including without limitation any warranty for information services, coaching, uninterrupted access, or products and services provided through or in connection with the Program. All personal property carried by me and brought to AMP’s premises or the Program is brought at my sole risks and consequences and AMP shall not, in any manner whatsoever, be liable for any loss or damage caused to the same during the Program.",
    ],
  },
  {
    title: "Privacy, Data & Jurisdiction",
    paragraphs: [
      "I consent to AMP collecting, storing, possessing, dealing, disclosing, transferring and otherwise handling my personal information including sensitive personal data or information (“personal information”) for the purposes of my participating in the Programs.",
      "I agree to the terms of AMP’s Privacy Policy with regard to all matters pertaining to my personal information. I understand that personal information provided by me will be held confidential unless agreed otherwise in writing or as may be required by applicable law.",
      "Additionally, I understand that the use of technology is not always secure and I accept the risks involved in the transmission, exchange and storage of confidential and personal information in and through various electronic means, including but not limited to in the use of email, text, phones, video conferencing facilities and other technology.",
      "The terms of this Agreement are governed by the laws of India and shall be subject to the exclusive jurisdiction of the courts at Mumbai. Any dispute arising out of or in connection with this Agreement shall be referred to and finally resolved by arbitration in accordance with the Arbitration and Conciliation Act, 1996, and amendments thereto. The arbitration proceedings shall be conducted by a sole arbitrator to be mutually appointed by the parties. The seat, place and venue of the arbitration shall be Mumbai. The language of the arbitration shall be English only.",
      "This Release cum Indemnity Agreement shall be read in conjunction with the other application forms and documents executed between me and AMP in relation to the Program. By my signature below, I acknowledge that I have read and fully understood and accept the terms of this Release cum Indemnity Agreement and represent and agree that my signature is freely and knowingly given.",
    ],
  },
  {
    title: "Cancellation Policy",
    bullets: [
      "All cancellations must be given in writing to info@physique57india.com or via the Physique 57 India app atleast 12 hours prior to the Scheduled Class Start time. All cancellations outside of this time frame will be deducted from your class package.",
      "Clients will be unable to join a Full Studio Barre class 10-Minutes past the scheduled start time; should this happen, this class will be deducted from your class package.",
      "Clients will be unable to join an Express Studio Barre class past the scheduled start time; should this happen, this class will be deducted from your class package.",
      "Clients who have attended under 10 powerCycle classes will need to be at the Studio atleast 15 minutes before the Scheduled Class Start time. Entry to the Studio will be permitted until 5 minutes before the class start time.",
      "Clients who have attended over 10 Physique 57 classes need to be at the Studio 10 minutes before class starts. Entry to the room will not be permitted once the class has begun.",
    ],
  },
  {
    paragraphs: [
      "I confirm and declare that I am an adult of at least 18 years of age or am represented by an adult parent or guardian of at least 18 years of age and competent to contract and participate in this exercise class/ program. This informed consent is freely and voluntarily executed after fully understanding the contents thereof, not caused by coercion, undue influence, fraud, misinterpretation, or mistake and shall be binding upon me, my spouse, partner, parents /guardians, relatives, legal representatives, heirs, executors, administrators, successors and assignees.",
      "I confirm and declare that I am in adequate health to participate in any activities at the Studio(s) of AMP Fitness LLP and that I also do not have any illness, disease or other health condition which could potentially put me or anyone else at risk. I confirm and acknowledge that should this information or position change, it is my sole responsibility to promptly notify the instructors at the Studio(s) of AMP Fitness LLP.",
      "In connection with my enrolment and participation in the exercise class / program organised by AMP Fitness, LLP (“AMP”) and use of the property, facilities and services provided to me by AMP (“Program”), I hereby, on behalf myself and my relatives, heirs, successors, executors and administrators, indemnify and agree to release, waive, discharge and agree and covenant to indemnify, release, waive, discharge and not to sue AMP, its designated partners, other partners, shareholders, directors, subsidiaries, affiliates, its and their licensees, licensors, successors, assigns, employees, officers, directors, consultants, service providers, agents, and contractors, and all persons, corporations, partnerships and other entities with which these entities may have become affiliated or may otherwise have dealings with at any time in the future, from any and all liability, claims, demands, actions and causes of action whatsoever arising out of or relating to any loss, expense, damages, injury, illnesses, diseases, disorders, conditions, disablement (whether partial, total, permanent or temporary), grievous bodily injury including death, that may be sustained by me, or to any property belonging to me, whether directly or indirectly caused to me by any person and on account of any reason whatsoever, whether by reason of due to my acts or omissions or by AMP or any of its instructors/ operators, or otherwise as a result of participating in the Program.",
      "I am voluntarily participating in the Program with full knowledge, understanding and appreciation of the risks inherent in any physical exercise and expressly assume all risks of injury, illnesses, diseases, disorders, conditions and even partial or permanent disablement and/or death which could occur by reason of my participation. I have disclosed all relevant information regarding my physical, medical, emotional or mental conditions that could cause harm to me or others by participating in this Program and I hereby expressly declare, confirm and state that I have neither at any time suffered nor currently suffer nor am I susceptible to suffering any form of health condition which prevents or could prevent me, in any manner whatsoever, from participating in the Program in the manner as required by AMP.",
      "I am executing this Release cum Indemnity Agreement after having viewed or having had the opportunity to view the site of AMP’s trial exercise classes; having reviewed the instructor’s qualifications; having had the scope of AMP’s classes and their associated risks fully explained to me; and after asking or having had an opportunity to ask questions regarding the classes and risks associated with AMP’s exercise classes. I hereby further declare, confirm and state that I have all the requisite qualifications and minimum fitness requirements to enable me to participate in the Program. I agree that my safety is primarily my own responsibility.",
      "I agree to make sure that I know how to safely participate in the Program, and I agree to observe any and all rules, codes, guidelines, procedures, manuals and practices that may be required to minimize the risk of injuries, illnesses, diseases, disorders, conditions and even partial or permanent disablement and/or death whether or not such rules, codes, guidelines, procedures, manuals and practices are specifically and/or expressly conveyed to me. I acknowledge that I am fully aware and conversant with the precautions that I am required to take in connection with any and all physical activities whilst partaking in the activities forming a part of the Program. I agree to stop and seek assistance if I do not believe I can safely continue with the activities involved in the Program, to limit my participation in the said Program to reflect my personal fitness level, and to refrain from any and all actions that would pose any form of hazard to myself or others in the Program.",
      "The services provided by AMP to me under the Program are on an is “as is” basis, without warranty of any kind, either expressed or implied, including without limitation any warranty for information services, coaching, uninterrupted access, or products and services provided through or in connection with the Program. All personal property carried by me and brought to AMP’s premises or the Program is brought at my sole risks and consequences and AMP shall not, in any manner whatsoever, be liable for any loss or damage caused to the same during the Program.",
      "I consent to AMP collecting, storing, possessing, dealing, disclosing, transferring and otherwise handling my personal information including sensitive personal data or information (“personal information”) for the purposes of my participating in the Programs. I agree to the terms of AMP’s Privacy Policy with regard to all matters pertaining to my personal information. I understand that personal information provided by me will be held confidential unless agreed otherwise in writing or as may be required by applicable law.",
      "Additionally, I understand that the use of technology is not always secure and I accept the risks involved in the transmission, exchange and storage of confidential and personal information in and through various electronic means, including but not limited to in the use of email, text, phones, video conferencing facilities and other technology. The terms of this Agreement are governed by the laws of India and shall be subject to the exclusive jurisdiction of the courts at Mumbai. Any dispute arising out of or in connection with this Agreement shall be referred to and finally resolved by arbitration in accordance with the Arbitration and Conciliation Act, 1996, and amendments thereto. The arbitration proceedings shall be conducted by a sole arbitrator to be mutually appointed by the parties. The seat, place and venue of the arbitration shall be Mumbai. The language of the arbitration shall be English only.",
      "This Release cum Indemnity Agreement shall be read in conjunction with the other application forms and documents executed between me and AMP in relation to the Program. By my signature below, I acknowledge that I have read and fully understood and accept the terms of this Release cum Indemnity Agreement and represent and agree that my signature is freely and knowingly given.",
    ],
  },
  {
    bullets: [
      "Any personal property brought to Classes is brought at your sole risk as to its theft, damage, or loss. You agree that Physique 57 is in no way responsible for the safekeeping of your personal belongings while you attend Classes or are otherwise at a Physique 57 location.",
      "All cancellations must be given in writing to info@physique57india.com 12 hours prior to the class booking. All cancellations outside of this time frame will be deducted from your class package.",
      "Clients will be unable to join a Full or Express Studio Barre Class 10-Minutes past the scheduled start time; should this happen, this class will be deducted from your class package.",
      "Payments can be made online via our app, using a valid credit or debit card.",
      "All classes must be paid for in advance and are non-refundable.",
      "Clients can pre-register for class up to one hour prior to the scheduled class time in order to reserve their space in class.",
      "If the class is full, you will be placed on the waitlist; additions to the class from the waitlist will be on a first come, first served basis.",
      "Instructor requests will be subject to availability.",
      "Preferred date and class timings will be subject to availability.",
    ],
  },
]
