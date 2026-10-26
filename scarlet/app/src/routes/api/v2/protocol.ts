import { createFileRoute } from '@tanstack/react-router'
import { DIALECT } from '../../../dccp/handoff'

export const Route = createFileRoute('/api/v2/protocol')({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          protocol: 'DCCP/2',
          dialect: DIALECT,
          line: 'DCCP/2|from=dualiscapax.com|rp=dualiscapax.com|verify=assertion|unity=unity:required|flags=0|grade=REPORTED',
          flags: 0,
          grade: 'REPORTED',
          verified: false,
          accepted_at: null,
          till: 'closed',
          note: 'The world stays shut without this line. The unity field is an assertion, not a biometric.',
        })
      },
    },
  },
})