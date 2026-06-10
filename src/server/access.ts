export function assertAuthorized(
  request: Request,
  env: {
    ACCESS_EMAIL_ALLOWLIST?: string
    REQUIRE_CLOUDFLARE_ACCESS?: string
  },
): void {
  const accessEmail =
    request.headers.get('cf-access-authenticated-user-email') ??
    request.headers.get('Cf-Access-Authenticated-User-Email')

  if (!accessEmail) {
    if (env.REQUIRE_CLOUDFLARE_ACCESS === 'true') {
      throw new Error('Cloudflare Access did not forward an authenticated identity header.')
    }

    return
  }

  const allowlist = (env.ACCESS_EMAIL_ALLOWLIST ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  if (allowlist.length && !allowlist.includes(accessEmail.toLowerCase())) {
    throw new Error('This identity is not allowed to access Pure Expense.')
  }
}
