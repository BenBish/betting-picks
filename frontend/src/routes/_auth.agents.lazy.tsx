import { createLazyFileRoute } from '@tanstack/react-router';
import { AgentsPage } from '../components/AgentsPage';

export const Route = createLazyFileRoute('/_auth/agents')({
  component: AgentsPage,
});
