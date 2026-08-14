export default {
  async fetch(request) {
    const target = new URL(request.url)
    target.protocol = "https:"
    target.hostname = "wykta.pages.dev"
    target.port = ""
    const pathname = target.pathname
    if (/^\/wykta(?:\/|$)/i.test(pathname)) {
      target.pathname = pathname.replace(/^\/wykta/i, "") || "/"
    }
    return Response.redirect(target.toString(), 301)
  },
}
