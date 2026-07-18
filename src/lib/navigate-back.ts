/** Retourne à l’écran précédent ; sinon appelle fallback (souvent /home). */
export function navigateBack(
  history: { canGoBack: () => boolean; back: () => void },
  fallback: () => void,
) {
  if (history.canGoBack()) history.back();
  else fallback();
}
