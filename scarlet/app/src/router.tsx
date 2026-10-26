import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function Quiet() {
  return null;
}

export function getRouter() {
  return createRouter({ routeTree, defaultErrorComponent: Quiet });
}
