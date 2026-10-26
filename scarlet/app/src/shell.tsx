import { createRoot } from 'react-dom/client'
import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { Front } from './routes/index'
import './styles.css'

/** Registry paths are root-absolute in the page. A static root is not the host root. */
const here = new URL('.', document.baseURI)
const orig = window.fetch.bind(window)
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === 'string' && input.startsWith('/registry/')) {
    return orig(new URL(input.slice(1), here).href, init)
  }
  return orig(input, init)
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Front,
})

const routeTree = rootRoute.addChildren([indexRoute])

/** Route only. The host and the captured path never enter the router. The line stays in the real hash. */
const history = createMemoryHistory({
  initialEntries: [window.location.search ? `/${window.location.search}` : '/'],
})

const router = createRouter({ routeTree, history })

const node = document.getElementById('shell')
if (node) createRoot(node).render(<RouterProvider router={router} />)
