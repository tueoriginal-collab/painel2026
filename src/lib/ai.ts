import { supabase } from "@/integrations/supabase/client";

async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export async function aiStream(
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void,
  system?: string,
) {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
    body: JSON.stringify({ messages, system, stream: true }),
  });
  if (!res.ok || !res.body) throw new Error(await res.text());

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) onChunk(delta);
      } catch {
        /* ignora pedaços parciais */
      }
    }
  }
}

export async function aiText(prompt: string, system?: string) {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
    body: JSON.stringify({ messages: [{ role: "user", content: prompt }], system, stream: false }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.text();
}

export async function aiJson<T>(prompt: string, system?: string): Promise<T> {
  const raw = await aiText(
    prompt,
    (system ?? "") + " Responda APENAS com JSON válido, sem comentários e sem blocos de código.",
  );
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

export async function aiImage(prompt: string, size: "1024x1024" | "1536x1024" = "1024x1024") {
  const res = await fetch("/api/ai/image", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
    body: JSON.stringify({ prompt, size }),
  });
  if (!res.ok) throw new Error(await res.text());
  return ((await res.json()) as { url: string }).url;
}
