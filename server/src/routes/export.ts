import type { FastifyInstance } from 'fastify'

// Smallest valid single-page PDF (empty page) - good enough for local dev
// to exercise the frontend's blob-download path without real rendering.
const STUB_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\n' +
    'xref\n0 4\n0000000000 65535 f \n' +
    'trailer<</Size 4/Root 1 0 R>>\nstartxref\n0\n%%EOF',
  'utf-8'
)

export function registerExportRoutes(app: FastifyInstance): void {
  app.get('/export', async (req, reply) => {
    const { resourceType = 'resource', resourceId = 'unknown' } = req.query as {
      resourceType?: string
      resourceId?: string
    }
    const date = new Date().toISOString().split('T')[0]
    const filename = `patchdocs_export_${resourceType}_${resourceId}_${date}.pdf`
    reply
      .header('content-type', 'application/pdf')
      .header('content-disposition', `attachment; filename="${filename}"`)
      .send(STUB_PDF)
  })
}
