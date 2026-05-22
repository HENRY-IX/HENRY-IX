'use client';

import PageShell from '@/components/PageShell';
import { Schedule } from '@/components/ContentSections';

export default function EventsPage() {
  return (
    <PageShell>
      <Schedule isDepth={true} />
    </PageShell>
  );
}
