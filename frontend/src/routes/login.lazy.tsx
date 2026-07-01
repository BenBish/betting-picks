import { createLazyFileRoute, redirect } from "@tanstack/react-router";
import { LoginPage } from "../components/LoginPage";
import { checkAuth } from "../lib/api";

export const Route = createLazyFileRoute("/login")({
  beforeLoad: async () => {
    const authenticated = await checkAuth();
    if (authenticated) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});
