import { createFileRoute } from '@tanstack/react-router'
import { writeSite } from '../dccp/site'

export const Route = createFileRoute('/log')({
  server: { handlers: { GET: async () => Response.json(writeSite()) } },
})
