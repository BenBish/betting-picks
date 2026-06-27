import { createLazyFileRoute, redirect } from '@tanstack/react-router';
import { checkAuth } from '../lib/api';
import { LoginPage } from '../components/LoginPage';

export const Route = createLazyFileRoute('/login')({
  beforeLoad: async () => {
    const authenticated = await checkAuth();
    if (authenticated) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginPage,
});
