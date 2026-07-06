import { Router } from "express";
import Groq from "groq-sdk";

const router = Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `Sen LumisAI'sın — akıllı, sıcak ve yardımsever bir yapay zeka asistanısın.
Varsayılan dil Türkçe'dir. Kullanıcı başka bir dilde yazarsa o dilde yanıt ver.
Yanıtların net, bilgilendirici ve nazik olsun. Markdown kullanabilirsin (başlıklar, listeler, kod blokları).
Güncel bilgi, haber veya bilinmeyen bir konu için search_web aracını kullan.`;

async function searchWeb(query: string): Promise<string> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      Answer?: string;
      AbstractText?: string;
      AbstractURL?: string;
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string; Name?: string; Topics?: Array<{ Text?: string }> }>;
    };

    const parts: string[] = [];
    if (data.Answer) parts.push(`Doğrudan Cevap: ${data.Answer}`);
    if (data.AbstractText) {
      parts.push(`Özet: ${data.AbstractText}`);
      if (data.AbstractURL) parts.push(`Kaynak: ${data.AbstractURL}`);
    }
    if (data.RelatedTopics?.length) {
      const topics = data.RelatedTopics
        .slice(0, 5)
        .filter((t) => t.Text)
        .map((t) => `• ${t.Text}`)
        .join("\n");
      if (topics) parts.push(`İlgili Konular:\n${topics}`);
    }
    return parts.length ? parts.join("\n\n") : "Arama sonucu bulunamadı.";
  } catch {
    return "Web araması gerçekleştirilemedi.";
  }
}

router.post("/", async (req, res) => {
  const { messages = [], enableWebSearch = true } = req.body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    enableWebSearch?: boolean;
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const write = (data: object) =>
    res.write(`data: ${JSON.stringify(data)}\n\n`);

  const systemMessages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...messages,
  ];

  try {
    if (enableWebSearch) {
      // First pass: check if the AI wants to search
      const firstPass = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: systemMessages,
        tools: [
          {
            type: "function" as const,
            function: {
              name: "search_web",
              description:
                "Güncel haberler, gerçek zamanlı bilgi veya bilinmeyen konular için web araması yap.",
              parameters: {
                type: "object" as const,
                properties: {
                  query: { type: "string", description: "Arama sorgusu" },
                },
                required: ["query"],
              },
            },
          },
        ],
        tool_choice: "auto",
        max_tokens: 4096,
      });

      const firstChoice = firstPass.choices[0];

      if (
        firstChoice?.finish_reason === "tool_calls" &&
        firstChoice.message.tool_calls?.length
      ) {
        const toolResults = [];
        for (const call of firstChoice.message.tool_calls) {
          if (call.function.name === "search_web") {
            const args = JSON.parse(call.function.arguments) as { query: string };
            write({ type: "searching", query: args.query });
            const result = await searchWeb(args.query);
            toolResults.push({
              tool_call_id: call.id,
              role: "tool" as const,
              content: result,
            });
          }
        }

        write({ type: "done_searching" });

        const finalStream = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [...systemMessages, firstChoice.message, ...toolResults],
          max_tokens: 4096,
          stream: true,
        });

        for await (const chunk of finalStream) {
          const content = chunk.choices[0]?.delta?.content ?? "";
          if (content) write({ type: "content", content });
        }

        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      // No tool call triggered — re-run as a true stream (no tools this time)
      const fallbackStream = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: systemMessages,
        max_tokens: 4096,
        stream: true,
      });

      for await (const chunk of fallbackStream) {
        const content = chunk.choices[0]?.delta?.content ?? "";
        if (content) write({ type: "content", content });
      }

      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    // Direct streaming (web search disabled)
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: systemMessages,
      max_tokens: 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content ?? "";
      if (content) write({ type: "content", content });
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    write({ type: "error", message });
    res.end();
  }
});

export default router;
