import React from "react";
import { onApiHealth } from "@/lib/apiClient";

export default function ApiOfflineBanner() {
  const [down, setDown] = React.useState(false);
  React.useEffect(() => onApiHealth((ok) => setDown(!ok)), []);
  if (!down) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-[60] px-3 py-2 rounded-xl border border-yellow-500/40 bg-yellow-500/15 text-yellow-200 text-sm backdrop-blur">
      API offline — check your dev server on <code className="mx-1 px-1 rounded bg-black/30">127.0.0.1:3000</code>
    </div>
  );
}
