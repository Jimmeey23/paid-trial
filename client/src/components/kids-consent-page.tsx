import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

const BRAND_LOGO_URL = new URL("../assets/physique57-logo.jpg", import.meta.url).href

type ConsentSection = {
  title: string
  paragraphs: string[]
}

type KidsConsentDocumentProps = {
  customerName?: string
  customerEmail?: string
}

const DOCUMENT_DETAILS = [
  ["Host", "Physique 57 Mumbai"],
  ["Business", "AMP Fitness LLP"],
  ["Address", "Kwality House, 2nd Floor, August Kranti Marg, Kemps Corner, Mumbai - 400036"],
  ["Tax ID", "27ABGFA3922Q1Z2"],
]

export const CONSENT_SECTIONS: ConsentSection[] = [
  {
    title: "Release and Health Declaration",
    paragraphs: [
      'I confirm and declare that I am at least eighteen (18) years of age or, where applicable, am represented by a parent or legal guardian who is at least eighteen (18) years of age and competent to enter into this Agreement on my behalf. I further confirm that this informed consent is executed freely and voluntarily, with full understanding of its contents, and is not the result of coercion, undue influence, fraud, misrepresentation, or mistake. This Agreement shall be binding upon me and my spouse, partner, parents, guardians, relatives, legal representatives, heirs, executors, administrators, successors, and assigns.',
      'I confirm and declare that I am in adequate physical and mental health to participate in the exercise classes, programs, and activities conducted by Physique 57 India and/or AMP Fitness LLP ("AMP"), and that I do not suffer from any illness, injury, disease, disorder, condition, or other health concern that may place myself or any other person at risk. I acknowledge that should my health condition change at any time, it shall be my sole responsibility to promptly notify the instructors and staff of AMP.',
      'In consideration of my enrolment and participation in any exercise class, fitness program, activity, service, or facility provided by AMP (collectively referred to as the "Program"), I hereby, on behalf of myself and my heirs, successors, executors, administrators, and legal representatives, irrevocably release, waive, discharge, and covenant not to sue AMP, its partners, directors, shareholders, affiliates, subsidiaries, licensors, licensees, employees, officers, consultants, contractors, agents, service providers, successors, and assigns (collectively, the "Released Parties") from any and all claims, liabilities, demands, actions, causes of action, losses, damages, costs, expenses, injuries, illnesses, diseases, disorders, conditions, disabilities, or death arising out of or in any way connected with my participation in the Program, whether caused directly or indirectly by my own acts or omissions, the acts or omissions of any other participant, instructor, employee, or representative of AMP, or otherwise.',
      'I further agree to indemnify, defend, and hold harmless the Released Parties from and against any and all claims, liabilities, losses, damages, costs, expenses, or demands arising from or relating to my participation in the Program or any breach of my obligations under this Agreement.',
    ],
  },
  {
    title: "Assumption of Risk and Safety",
    paragraphs: [
      'I acknowledge and understand that participation in physical exercise and fitness activities involves inherent risks, including but not limited to physical injury, illness, medical complications, temporary or permanent disability, grievous bodily injury, and death. I voluntarily assume all such risks and accept full responsibility for any consequences arising from my participation in the Program.',
      'I represent and warrant that I have disclosed all relevant information relating to my physical, medical, emotional, or mental condition that may affect my ability to safely participate in the Program or that may pose a risk to myself or others. I further declare that I do not currently suffer from, nor am I aware of any condition that would prevent or impair my participation in the Program. I confirm that I possess the necessary level of fitness and ability required to safely participate in the Program.',
      "I acknowledge that I have either viewed or had the opportunity to view the facilities where the Program is conducted, reviewed or had the opportunity to review the qualifications of the instructors, received an explanation of the nature of the classes and the risks associated therewith, and had the opportunity to ask questions regarding the Program before participating.",
      "I agree that my safety is primarily my own responsibility. I undertake to participate within my personal limits and capabilities and to comply with all rules, policies, procedures, instructions, codes of conduct, safety requirements, and operational guidelines communicated by AMP from time to time. I agree to immediately cease participation and seek assistance if I believe I am unable to continue safely or if continuing participation may pose a risk to myself or others.",
    ],
  },
  {
    title: "Services, Property, and Personal Information",
    paragraphs: [
      'I acknowledge that all services, facilities, programs, information, coaching, and access provided by AMP are offered on an "as is" basis without warranties of any kind, whether express or implied, including any warranty regarding uninterrupted access, availability of services, instructor availability, fitness outcomes, or suitability for any particular purpose.',
      "I acknowledge and agree that any personal property brought by me to any AMP or Physique 57 India location is brought entirely at my own risk. AMP and Physique 57 India shall not be responsible or liable for the loss, theft, damage, destruction, or safekeeping of any personal belongings while I am attending classes, using facilities, or otherwise present at any location operated by AMP.",
      "I consent to AMP collecting, storing, processing, transferring, disclosing, and otherwise handling my personal information, including sensitive personal information, for purposes relating to my participation in the Program. I acknowledge that such information shall be handled in accordance with AMP's Privacy Policy and applicable law. I further understand and accept the risks associated with the electronic transmission, storage, and exchange of personal and confidential information through email, text messaging, telephone communications, mobile applications, video conferencing platforms, and other digital technologies.",
    ],
  },
  {
    title: "Booking and Class Policies",
    paragraphs: [
      "Cancellations, transfers & refunds are not possible under this program.",
      "Participants arriving more than ten (10) minutes after the scheduled start time of a Full Studio Barre or Express Studio Barre class shall not be permitted to join the class, and such class shall be deducted from the participant's package.",
      "All classes must be paid for in advance and all payments are final and non-refundable. Payments may be made online through approved payment methods, including valid credit and debit cards. Participants may reserve classes up to one (1) hour prior to the scheduled start time, subject to availability. Where a class is fully booked, participants may be placed on a waitlist and spaces shall be allocated on a first-come, first-served basis. Instructor requests, preferred class dates, and preferred class timings are subject to availability and cannot be guaranteed.",
    ],
  },
  {
    title: "Governing Law and Signature Acknowledgement",
    paragraphs: [
      "This Agreement shall be governed by and construed in accordance with the laws of India. Any dispute arising out of or in connection with this Agreement shall be referred to and finally resolved by arbitration in accordance with the Arbitration and Conciliation Act, 1996, as amended from time to time. The arbitration shall be conducted by a sole arbitrator mutually appointed by the parties. The seat, venue, and place of arbitration shall be Mumbai, Maharashtra, India, and the language of the proceedings shall be English. Subject to the foregoing, the courts at Mumbai shall have exclusive jurisdiction over matters arising from or relating to this Agreement.",
      "By signing below, I acknowledge that I have carefully read, fully understood, and voluntarily accepted the terms of this Release and Indemnity Agreement and agree to be legally bound by its provisions.",
    ],
  },
]

export function KidsConsentDocument({
  customerName,
  customerEmail,
}: KidsConsentDocumentProps) {
  const safeCustomerName = customerName?.trim() || "Parent/Guardian"
  const safeCustomerEmail = customerEmail?.trim() || "Registered email"

  return (
    <article className="mx-auto w-full max-w-4xl border border-slate-300 bg-white px-5 py-6 text-slate-950 shadow-sm sm:px-8 sm:py-8">
      <header className="flex items-start justify-between gap-5">
        <div>
          <p className="text-lg font-semibold leading-none tracking-normal text-slate-950">Physique 57 Mumbai</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">Child booking waiver</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <img src={BRAND_LOGO_URL} alt="Physique 57 India" className="h-auto w-20 object-contain sm:w-24" />
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">EIN: 851821903</p>
        </div>
      </header>

      <h2 className="mt-12 text-center text-3xl font-bold leading-tight text-slate-950">Waiver</h2>

      <section className="mt-9 space-y-1 text-sm leading-5 text-slate-900">
        {DOCUMENT_DETAILS.map(([label, value]) => (
          <p key={label}>
            <span className="font-bold">{label}: </span>
            {value}
          </p>
        ))}
      </section>

      <section className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="text-sm font-bold uppercase leading-5 text-slate-950">Customer:</p>
          <p className="mt-1 min-h-6 text-lg leading-6 text-slate-950">{safeCustomerName}</p>
        </div>
        <div>
          <p className="text-sm font-bold uppercase leading-5 text-slate-950">Email:</p>
          <p className="mt-1 min-h-6 break-words text-lg leading-6 text-slate-950">{safeCustomerEmail}</p>
        </div>
      </section>

      <div className="mt-10 space-y-7">
        {CONSENT_SECTIONS.map((section) => (
          <section key={section.title} className="space-y-4">
            <h3 className="sr-only">{section.title}</h3>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="grid grid-cols-[auto_1fr] gap-2 text-base leading-7 text-slate-950">
                <span aria-hidden="true">-&gt;</span>
                <span>{paragraph}</span>
              </p>
            ))}
          </section>
        ))}
      </div>

      <footer className="mt-12 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
        Parent/guardian signature is captured on the Juniors registration form and submitted to Momence against this child booking waiver.
      </footer>
    </article>
  )
}

export function KidsConsentPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto mb-4 flex max-w-4xl justify-start">
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-[6px] border-slate-300 bg-white px-3 text-slate-950 hover:bg-slate-50"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back()
              return
            }
            window.location.assign("/kids")
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <KidsConsentDocument />
    </main>
  )
}
