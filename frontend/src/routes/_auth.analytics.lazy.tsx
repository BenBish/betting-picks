import { createLazyFileRoute } from '@tanstack/react-router';
import { AnalyticsPage } from '../components/AnalyticsPage';

export const Route = createLazyFileRoute('/_auth/analytics')({
  component: AnalyticsPage,
});
