export default {
  async fetch(request) {
    const target = new URL(request.url)
    target.protocol = "https:"
    target.hostname = "wykta.pages.dev"
    target.port = ""
    return Response.redirect(target.toString(), 301)
  },
}
