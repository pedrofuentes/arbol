import { showHelpDialog } from '../ui/help-dialog';
import { type IStorage, browserStorage } from '../utils/storage';

const WELCOME_KEY = 'arbol-welcome-seen';

export function showFirstVisitHelp(
  onLoadSample: () => void,
  storage: IStorage = browserStorage,
): boolean {
  if (storage.getItem(WELCOME_KEY)) return false;

  showHelpDialog({
    initialSection: 1,
    onLoadSample,
  });
  storage.setItem(WELCOME_KEY, 'true');
  return true;
}
