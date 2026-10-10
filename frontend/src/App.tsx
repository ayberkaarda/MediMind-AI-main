import { useState } from 'react';
import { AppShell } from './app/AppShell';
import { AssessmentWorkspace } from './features/assessment/AssessmentWorkspace';

export default function App() {
  const [historyOpen, setHistoryOpen] = useState(false);
  return (
    <AppShell onOpenHistory={() => setHistoryOpen(true)}>
      <AssessmentWorkspace historyOpen={historyOpen} onCloseHistory={() => setHistoryOpen(false)} />
    </AppShell>
  );
}
