import { createLazyFileRoute } from "@tanstack/react-router";
import { PicksPage } from "../components/PicksPage";

export const Route = createLazyFileRoute("/_auth/")({
  component: PicksPage,
});
