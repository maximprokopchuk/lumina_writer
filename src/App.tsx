import AppLayout from './components/AppLayout';
import { useAuth } from './hooks/useAuth';
import { useBooks } from './hooks/useBooks';
import { useSync } from './hooks/useSync';
import { useKeyboard } from './hooks/useKeyboard';

export default function App() {
  // Bind all global side-effects and listeners
  useAuth();
  const { lastCloudLoadRef } = useBooks();
  const { manualSave } = useSync(lastCloudLoadRef);
  useKeyboard();

  // Render the presentational layout
  return <AppLayout manualSave={manualSave} />;
}
