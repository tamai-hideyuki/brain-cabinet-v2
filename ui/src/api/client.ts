const API_BASE = "/api/v1";

export async function command<T = any>(action: string, payload?: any): Promise<T> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Unknown error");
  return json.data;
}
