import { getModel, type ModelId } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const OPENROUTER_API_URL =
  "https://openrouter.ai/api/v1/chat/completions";

export async function POST(request: Request) {
  try {
        console.log(
  "OPENROUTER KEY:",
  process.env.OPENROUTER_API_KEY
    ? `FOUND (${process.env.OPENROUTER_API_KEY.length} chars)`
    : "MISSING"
);
    if (!process.env.OPENROUTER_API_KEY) {
      return Response.json(
        { error: "OPENROUTER_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      messages?: ChatMessage[];
      model?: ModelId;
      system?: string;
    };

    if (!body.messages?.length) {
      return Response.json(
        { error: "Messages are required." },
        { status: 400 }
      );
    }

    const model = getModel(body.model ?? "openrouter/free");

    const messages = [
      ...(body.system
        ? [{ role: "system" as const, content: body.system }]
        : []),
      ...body.messages
    ];

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://claude-chat-app-psi.vercel.app/",
        "X-Title": "Claude Chat App"
      },
      body: JSON.stringify({
        model: model.id,
        messages,
        max_tokens: 4096,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();

      return Response.json(
        {
          error: errorText || "OpenRouter request failed."
        },
        { status: response.status }
      );
    }

    if (!response.body) {
      return Response.json(
        { error: "No response body from OpenRouter." },
        { status: 500 }
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();

              if (!trimmed || !trimmed.startsWith("data:")) {
                continue;
              }

              const data = trimmed.slice(5).trim();

              if (data === "[DONE]") {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "done" })}\n\n`
                  )
                );
                continue;
              }

              try {
                const parsed = JSON.parse(data);

                const text = parsed.choices?.[0]?.delta?.content;

                if (text) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: "text",
                        text
                      })}\n\n`
                    )
                  );
                }
              } catch {
                // Ignore malformed SSE chunks.
              }
            }
          }

          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "Streaming failed."
              })}\n\n`
            )
          );

          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Request failed."
      },
      { status: 500 }
    );
  }
}