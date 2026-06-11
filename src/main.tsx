import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (typeof (window as any).zaloJSV2 === "undefined") {
  (window as any).zaloJSV2 = new Proxy(
    {},
    { get: () => () => undefined },
  );
}
if (typeof (window as any).ZaloJavaScriptInterface === "undefined") {
  (window as any).ZaloJavaScriptInterface = new Proxy(
    {},
    { get: () => () => undefined },
  );
}

const isZaloError = (msg: unknown): boolean => {
  const s = String(msg ?? "");
  return (
    s.includes("zaloJSV2") ||
    s.includes("ZaloJavaScriptInterface") ||
    s.includes("zaloJS")
  );
};

window.addEventListener(
  "error",
  (e) => {
    if (isZaloError(e.message) || isZaloError((e.error as Error)?.message)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },
  true,
);

window.addEventListener("unhandledrejection", (e) => {
  if (isZaloError(e.reason) || isZaloError((e.reason as Error)?.message)) {
    e.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
