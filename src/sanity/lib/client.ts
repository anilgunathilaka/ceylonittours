import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from '../env'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  // Off: pages are statically generated and refreshed by revalidation, so each re-render must read the
  // latest published content straight from the API, not a CDN copy that may still be stale.
  useCdn: false,
})
