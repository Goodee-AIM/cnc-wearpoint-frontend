/**
 * Keep the existing hash-based dashboard deep links functional.
 * Only the site root is a landing page; /dashboard loads the original App.
 */
export function shouldRenderDashboard(pathname, hash = "") {
  const normalizedPath = (pathname || "/").replace(/\/+$/, "") || "/";
  return normalizedPath !== "/" || hash === "#monitoring" || hash === "#alerts";
}
