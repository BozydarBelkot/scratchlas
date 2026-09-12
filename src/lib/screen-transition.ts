import { flushSync } from "react-dom";

export function transitionScreen(update: () => void) {
  if (
    typeof document.startViewTransition === "function" &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    document.startViewTransition(() => flushSync(update));
  } else update();
}
