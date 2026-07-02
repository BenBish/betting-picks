import { createFileRoute, redirect } from "@tanstack/react-router";
import { checkAuth } from "../lib/api";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const authenticated = await checkAuth();
    if (authenticated) {
      throw redirect({ to: "/" });
    }
  },
});
