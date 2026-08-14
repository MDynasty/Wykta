export default {
  async fetch(request) {
    const target = new URL(request.url)
    const sourcePath = target.pathname.replace(/^\/Wykta(?=\/|$)/i, "") || "/"
    target.protocol = "https:"
    target.hostname = "wykta.pages.dev"
    target.port = ""
    target.pathname = sourcePath
    return Response.redirect(target.toString(), 301)
  },
}
