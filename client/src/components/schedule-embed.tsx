import { useEffect, useRef } from "react"

interface ScheduleEmbedProps {
  hostId: string
  locationIds: string[]
}

export function ScheduleEmbed({ hostId, locationIds }: ScheduleEmbedProps) {
  const scheduleHostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!scheduleHostRef.current) {
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
    script.setAttribute("host_id", hostId)
    script.setAttribute("location_ids", `[${locationIds.join(",")}]`)
    script.src = "https://momence.com/plugin/host-schedule/host-schedule.js"
    host.appendChild(script)

    return () => {
      host.innerHTML = ""
    }
  }, [hostId, locationIds])

  return <div ref={scheduleHostRef} className="min-h-[420px]" />
}
