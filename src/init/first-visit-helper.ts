import { type IStorage, browserStorage } from '../utils/storage';
import { showWelcomeDialog } from '../ui/welcome-dialog';

const WELCOME_KEY = 'arbol-welcome-seen';

export function showFirstVisitHelp(
  onLoadSample: () => void,
  storage: IStorage = browserStorage,
): boolean {
  if (storage.getItem(WELCOME_KEY)) return false;

  showWelcomeDialog(onLoadSample);
  storage.setItem(WELCOME_KEY, 'true');
  return true;
}
