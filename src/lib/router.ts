import { useEffect, useState } from "react";

export type Route = {
  path: string;
  segments: string[];
  query: URLSearchParams;
};

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [pathPart, queryPart] = raw.split("?");
  const path = pathPart.replace(/\/+$/, "") || "dashboard";
  return {
    path,
    segments: path.split("/").filter(Boolean),
    query: new URLSearchParams(queryPart ?? ""),
  };
}

export function navigate(to: string) {
  const next = to.startsWith("#") ? to : `#/${to.replace(/^\/+/, "")}`;
  if (window.location.hash === next) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  window.location.hash = next;
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(() => parseHash());

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    if (!window.location.hash) window.history.replaceState(null, "", "#/dashboard");
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}

export function customerPath(id: string, tab = "resumo") {
  return `clientes/${id}?tab=${tab}`;
}
