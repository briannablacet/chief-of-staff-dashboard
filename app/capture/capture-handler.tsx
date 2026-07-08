"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

export function CaptureHandler() {
  const params = useSearchParams()
  const [status, setStatus] = useState<"saving" | "done" | "error">("saving")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const url   = params.get("url")   ?? ""
    const title = params.get("title") ?? ""
    const text  = params.get("text")  ?? ""
    const secret = params.get("secret") ?? ""

    if (!url) {
      setStatus("error")
      setMessage("No job URL provided.")
      return
    }

    fetch("/api/import-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, title, text, secret }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setStatus("done")
          setMessage(`Saved: ${j.role}${j.company ? ` at ${j.company}` : ""}`)
          // Auto-close the popup after 2 seconds
          setTimeout(() => window.close(), 2000)
        } else {
          setStatus("error")
          setMessage(`Error: ${j.error}`)
        }
      })
      .catch((err) => {
        setStatus("error")
        setMessage(`Failed: ${err.message}`)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      {status === "saving" && (
        <>
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Saving job to Chief of Staff...</p>
        </>
      )}
      {status === "done" && (
        <>
          <div className="flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-medium text-foreground">{message}</p>
          <p className="text-xs text-muted-foreground">This window will close automatically.</p>
        </>
      )}
      {status === "error" && (
        <>
          <div className="flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="font-medium text-foreground">{message}</p>
          <button onClick={() => window.close()} className="text-xs text-muted-foreground underline">Close</button>
        </>
      )}
    </div>
  )
}
