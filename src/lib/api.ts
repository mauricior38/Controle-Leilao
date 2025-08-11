export function getApiBaseUrl() {
  const saved = localStorage.getItem("apiBaseUrl");
  return saved || "http://localhost:3030";
}

export function setApiBaseUrl(url: string) {
  localStorage.setItem("apiBaseUrl", url.replace(/\/+$/, ""));
}

// src/lib/api.ts
export async function apiFetch(path: string, init: RequestInit = {}) {
  const base = getApiBaseUrl();
  const token = localStorage.getItem("apiToken") || "";

  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers || {});

  const hasBody = init.body !== undefined && init.body !== null;
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;

  // Só manda Content-Type JSON quando o body NÃO é FormData
  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${base}${path}`, {
    ...init,
    method,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
  }

  return res;
}
