import { PagesDashboard } from '@/components/studio/pages-dashboard';
import { loadSceneTemplates } from '@/lib/templates';

export default function StudioPage() {
  return <PagesDashboard templates={loadSceneTemplates()} />;
}
