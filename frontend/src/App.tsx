import { useState } from 'react';
import { MotionProvider } from './app/MotionProvider';
import { AppShell } from './app/AppShell';
import { Workspace } from './features/assessment/Workspace';

export default function App() {
  const [historyOpen, setHistoryOpen] = useState(false);
  return (
    <MotionProvider>
      <AppShell onOpenHistory={() => setHistoryOpen(true)}>
        <Workspace historyOpen={historyOpen} onCloseHistory={() => setHistoryOpen(false)} />
      </AppShell>
    </MotionProvider>
  );
}
