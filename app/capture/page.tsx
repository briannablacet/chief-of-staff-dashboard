import { Suspense } from "react"
import { CaptureHandler } from "./capture-handler"

export default function CapturePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-foreground text-sm">Saving job...</div>}>
      <CaptureHandler />
    </Suspense>
  )
}
