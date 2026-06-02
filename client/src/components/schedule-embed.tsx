import { useEffect, useRef } from "react"

interface ScheduleEmbedProps {
  hostId: string
  locationIds: string[]
  teacherIds?: string[]
  tagIds?: string[]
  sessionType?: string
  hideTags?: boolean
  defaultFilter?: string
  locale?: string
  lockTimezone?: string
}

function formatMomenceIdList(ids: string[]) {
  return `[${ids.join(",")}]`
}

export function ScheduleEmbed({
  hostId,
  locationIds,
  teacherIds,
  tagIds,
  sessionType,
  hideTags,
  defaultFilter,
  locale,
  lockTimezone,
}: ScheduleEmbedProps) {
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
    script.setAttribute("location_ids", formatMomenceIdList(locationIds))
    if (teacherIds) {
      script.setAttribute("teacher_ids", formatMomenceIdList(teacherIds))
    }
    if (tagIds) {
      script.setAttribute("tag_ids", formatMomenceIdList(tagIds))
    }
    if (sessionType) {
      script.setAttribute("session_type", sessionType)
    }
    if (typeof hideTags === "boolean") {
      script.setAttribute("hide_tags", String(hideTags))
    }
    if (defaultFilter) {
      script.setAttribute("default_filter", defaultFilter)
    }
    if (locale) {
      script.setAttribute("locale", locale)
    }
    if (lockTimezone) {
      script.setAttribute("lock_timezone", lockTimezone)
    }
    script.src = "https://momence.com/plugin/host-schedule/host-schedule.js"
    host.appendChild(script)

    return () => {
      host.innerHTML = ""
    }
  }, [defaultFilter, hideTags, hostId, locale, locationIds, lockTimezone, sessionType, tagIds, teacherIds])

  return <div ref={scheduleHostRef} className="min-h-[420px]" />
}
