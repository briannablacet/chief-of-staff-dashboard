import { lookup } from "node:dns/promises"
import net from "node:net"

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number)
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    )
  }
  const v = ip.toLowerCase()
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:")
}

async function assertPublicUrl(raw: string): Promise<URL> {
  const u = new URL(raw)
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("Only http(s) links are supported.")
  const host = u.hostname.replace(/^\[|\]$/g, "")
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("That link isn't a public web page.")
  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error("That link isn't a public web page.")
  return u
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
}

/** Fetches a public job posting and returns its title and readable text. Throws on failure. */
export async function fetchJobPage(rawUrl: string): Promise<{ title: string; text: string }> {
  let url = await assertPublicUrl(rawUrl)
  let res: Response | null = null
  for (let hop = 0; hop < 4; hop++) {
    res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ChiefOfStaff/1.0)", Accept: "text/html,*/*" },
    })
    const loc = res.headers.get("location")
    if (res.status >= 300 && res.status < 400 && loc) {
      url = await assertPublicUrl(new URL(loc, url).toString())
      continue
    }
    break
  }
  if (!res || !res.ok) throw new Error(`The site returned ${res?.status ?? "no response"}.`)
  const html = (await res.text()).slice(0, 1_500_000)
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? ""
  return { title, text: htmlToText(html) }
}
