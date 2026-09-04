export interface DocsEnvelope<T> {
  docs: T[]
  totalDocs: number
  totalPages: number
}

export function paginate<T>(all: T[], page: number, limit: number): DocsEnvelope<T> {
  const totalDocs = all.length
  const totalPages = Math.max(1, Math.ceil(totalDocs / limit))
  const start = (page - 1) * limit
  return { docs: all.slice(start, start + limit), totalDocs, totalPages }
}
