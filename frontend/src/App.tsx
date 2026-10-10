import { useState } from 'react';
import { MotionProvider } from './app/MotionProvider';
import { AppShell } from './app/AppShell';
import { FocusStage } from './features/assessment/FocusStage';

export default function App() {
  const [historyOpen, setHistoryOpen] = useState(false);
  return (
    <MotionProvider>
      <AppShell onOpenHistory={() => setHistoryOpen(true)}>
        <FocusStage
          historyOpen={historyOpen}
          onCloseHistory={() => setHistoryOpen(false)}
          onOpenHistory={() => setHistoryOpen(true)}
        />
      </AppShell>
    </MotionProvider>
  );
}
