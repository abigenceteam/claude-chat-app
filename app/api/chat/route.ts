import Anthropic from "@anthropic-ai/sdk";
import { getModel, type ModelId } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "ANTHROPIC_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      messages?: ChatMessage[];
      model?: ModelId;
      system?: string;
    };

    if (!body.messages?.length) {
      return Response.json({ error: "Messages are required." }, { status: 400 });
    }

    const model = getModel(body.model ?? "claude-sonnet-4-6");

    const stream = client.messages.stream({
      model: model.id,
      max_tokens: 4096,
      system:
        body.system ??
        "You are a helpful, concise AI assistant. Use Markdown when it improves readability.",
      messages: body.messages
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`
                )
              );
            }

            if (event.type === "message_stop") {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
              );
            }
          }
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: error instanceof Error ? error.message : "Unknown error"
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
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 500 }
    );
  }
}