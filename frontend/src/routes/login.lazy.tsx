import { createLazyFileRoute } from "@tanstack/react-router";
import { LoginPage } from "../components/LoginPage";

export const Route = createLazyFileRoute("/login")({
  component: LoginPage,
});
