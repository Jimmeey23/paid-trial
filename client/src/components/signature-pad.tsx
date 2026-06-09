import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import type { PointerEvent } from "react"

type Point = {
  x: number
  y: number
}

export type SignaturePadHandle = {
  clear: () => void
  isEmpty: () => boolean
  toDataURL: () => string | null
  toRealSignature: () => string | null
}

type SignaturePadProps = {
  label?: string
  onChange?: (hasSignature: boolean) => void
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ label, onChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const wrapRef = useRef<HTMLDivElement | null>(null)
    const drawingRef = useRef(false)
    const lastPointRef = useRef<Point | null>(null)
    const currentPathRef = useRef<number[] | null>(null)
    const pathsRef = useRef<number[][]>([])
    const emptyRef = useRef(true)
    const [, setRenderTick] = useState(0)

    function notifyChange() {
      onChange?.(!emptyRef.current)
    }

    function getPoint(event: PointerEvent<HTMLCanvasElement>): Point {
      const rect = canvasRef.current?.getBoundingClientRect()
      return {
        x: event.clientX - (rect?.left ?? 0),
        y: event.clientY - (rect?.top ?? 0),
      }
    }

    function getContext() {
      const canvas = canvasRef.current
      const context = canvas?.getContext("2d")
      if (!canvas || !context) {
        return null
      }

      context.lineCap = "round"
      context.lineJoin = "round"
      context.strokeStyle = "#0f172a"
      context.lineWidth = 2.4
      return context
    }

    function clear() {
      const canvas = canvasRef.current
      const context = canvas?.getContext("2d")
      if (!canvas || !context) {
        return
      }

      context.clearRect(0, 0, canvas.width, canvas.height)
      pathsRef.current = []
      currentPathRef.current = null
      emptyRef.current = true
      lastPointRef.current = null
      setRenderTick((tick) => tick + 1)
      notifyChange()
    }

    useEffect(() => {
      function resize() {
        const wrap = wrapRef.current
        const canvas = canvasRef.current
        if (!wrap || !canvas) {
          return
        }

        const ratio = window.devicePixelRatio || 1
        canvas.width = Math.max(1, Math.floor(wrap.clientWidth * ratio))
        canvas.height = Math.max(1, Math.floor(wrap.clientHeight * ratio))
        canvas.style.width = `${wrap.clientWidth}px`
        canvas.style.height = `${wrap.clientHeight}px`

        const context = canvas.getContext("2d")
        context?.setTransform(ratio, 0, 0, ratio, 0, 0)
        pathsRef.current = []
        currentPathRef.current = null
        emptyRef.current = true
        lastPointRef.current = null
        setRenderTick((tick) => tick + 1)
        notifyChange()
      }

      resize()
      window.addEventListener("resize", resize)
      return () => window.removeEventListener("resize", resize)
    }, [])

    useImperativeHandle(ref, () => ({
      clear,
      isEmpty: () => emptyRef.current,
      toDataURL: () => {
        if (emptyRef.current) {
          return null
        }

        return canvasRef.current?.toDataURL("image/png") ?? null
      },
      toRealSignature: () => {
        if (emptyRef.current) {
          return null
        }

        const paths = pathsRef.current.filter((path) => path.length >= 4)
        if (!paths.length) {
          return null
        }

        return JSON.stringify(paths.map((path) => path.map((coordinate) => Number(coordinate.toFixed(4)))))
      },
    }))

    function begin(event: PointerEvent<HTMLCanvasElement>) {
      const canvas = canvasRef.current
      canvas?.setPointerCapture(event.pointerId)
      drawingRef.current = true
      const point = getPoint(event)
      const path = [point.x, point.y, point.x, point.y]
      pathsRef.current.push(path)
      currentPathRef.current = path
      lastPointRef.current = point
      emptyRef.current = false
      notifyChange()
    }

    function draw(event: PointerEvent<HTMLCanvasElement>) {
      if (!drawingRef.current) {
        return
      }

      const context = getContext()
      const last = lastPointRef.current
      const next = getPoint(event)
      if (!context || !last) {
        return
      }

      context.beginPath()
      context.moveTo(last.x, last.y)
      context.lineTo(next.x, next.y)
      context.stroke()

      currentPathRef.current?.push(next.x, next.y)
      lastPointRef.current = next
      emptyRef.current = false
      notifyChange()
    }

    function end(event: PointerEvent<HTMLCanvasElement>) {
      const canvas = canvasRef.current
      if (canvas?.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }

      drawingRef.current = false
      lastPointRef.current = null
      currentPathRef.current = null
      notifyChange()
    }

    return (
      <div>
        {label ? (
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
            {label}
          </p>
        ) : null}
        <div
          ref={wrapRef}
          className="relative h-32 w-full overflow-hidden rounded-[14px] border border-slate-300 bg-white shadow-inner touch-none"
        >
          <canvas
            ref={canvasRef}
            aria-label="Signature drawing area"
            className="block h-full w-full cursor-crosshair"
            onPointerDown={begin}
            onPointerMove={draw}
            onPointerUp={end}
            onPointerCancel={end}
            onPointerLeave={(event) => {
              if (drawingRef.current) {
                end(event)
              }
            }}
          />
          <button
            type="button"
            onClick={clear}
            className="absolute bottom-2 right-2 rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:text-slate-950"
          >
            Clear
          </button>
        </div>
        <p className="mt-1.5 text-xs leading-5 text-slate-500">
          Sign above with a finger, stylus, trackpad, or mouse.
        </p>
      </div>
    )
  }
)
