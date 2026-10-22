/**
 * This route is responsible for the built-in authoring environment using Sanity Studio.
 * All routes under your studio path is handled by this file using Next.js' catch-all routes:
 * https://nextjs.org/docs/routing/dynamic-routes#catch-all-routes
 *
 * You can learn more about the next-sanity package here:
 * https://github.com/sanity-io/next-sanity
 */

import { NextStudio } from 'next-sanity/studio'
import config from '../../../../sanity.config'

export const dynamic = 'force-static'

export { metadata, viewport } from 'next-sanity/studio'

export default function StudioPage() {
  // The root layout wraps every route in the site Header and Footer. Lift the Studio above them in a
  // full-screen layer so its full 100vh height — including the document footer with the Publish button — stays on screen.
  return (
    <div className="fixed inset-0 z-[300]">
      <NextStudio config={config} />
    </div>
  )
}
