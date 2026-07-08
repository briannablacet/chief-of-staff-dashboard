import { NextResponse } from "next/server"

// Returns a plain HTML fragment containing the bookmarklet anchor.
// This runs server-side so React's client-side javascript: URL sanitization
// never touches it — the href is correct from the first byte the browser sees.
export async function GET() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000")

  const secret = process.env.BOOKMARKLET_SECRET ?? "cos-import"

  const script = `(function(){var t=document.title;var u=window.location.href;var s=window.getSelection?window.getSelection().toString():'';if(!s){var b=document.body;s=b?b.innerText.slice(0,5000):'';}var d=JSON.stringify({url:u,title:t,text:s,secret:'${secret}'});var endpoint='${appUrl}/api/import-job';fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:d}).then(function(r){if(!r.ok){return r.text().then(function(t){throw new Error('HTTP '+r.status+': '+t.slice(0,200));});}return r.json();}).then(function(j){if(j.ok){alert('Saved to Chief of Staff: '+j.role+(j.company?' at '+j.company:''));}else{alert('Chief of Staff error: '+j.error);}}).catch(function(e){alert('Error: '+e.message+'\nEndpoint: '+endpoint);});})();`

  const href = `javascript:${encodeURIComponent(script)}`

  const html = `<!DOCTYPE html><html><body><a href="${href}" style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border:2px dashed #6366f1;border-radius:8px;background:#eef2ff;color:#4f46e5;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;text-decoration:none;cursor:grab" draggable="true">&#128278; Save to Chief of Staff</a></body></html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "no-store",
      // Allow this endpoint to be embedded in an iframe from the app
      "X-Frame-Options": "SAMEORIGIN",
    },
  })
}
