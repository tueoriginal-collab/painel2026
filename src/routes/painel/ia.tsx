import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Bot, Plus, User } from "lucide-react";
import { toast } from "sonner";

import { aiStream } from "@/lib/ai";
import { hasModule, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

export const Route = createFileRoute("/painel/ia")({
  head: () => ({
    meta: [
      { title: "Assistente IA — Ghost Copier" },
      { name: "description", content: "Assistente inteligente do painel Ghost Copier." },
    ],
  }),
  component: IA,
});

type Msg = { role: "user" | "assistant"; content: string };

function IA() {
  const { profile, isAdmin } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  if (!hasModule(profile, isAdmin, "ia")) {
    return <p className="text-muted-foreground">Você não tem acesso a este módulo.</p>;
  }

  const send = async (textValue: string) => {
    const text = textValue.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      await aiStream(next, (chunk) => {
        setMessages((current) => {
          const copy = [...current];
          const last = copy.at(-1)!;
          copy[copy.length - 1] = { ...last, content: last.content + chunk };
          return copy;
        });
        endRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na IA");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-7.5rem)] min-h-[560px] max-w-5xl flex-col">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-primary">
            Assistente IA
          </h1>
          <p className="text-sm text-muted-foreground">Respostas em tempo real, em português.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMessages([])}
          disabled={!messages.length || busy}
        >
          <Plus className="size-4" /> Nova conversa
        </Button>
      </header>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-primary/25">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <Conversation className="flex-1">
            <ConversationContent className="mx-auto min-h-full w-full max-w-4xl p-4 md:p-6">
              {messages.length === 0 && (
                <ConversationEmptyState
                  icon={<Bot className="size-11 text-primary" />}
                  title="Como posso ajudar?"
                  description="Peça ideias, textos, estruturas de páginas ou ajuda com suas telas."
                />
              )}
              {messages.map((message, index) => (
                <Message key={index} from={message.role}>
                  <div
                    className={message.role === "user" ? "flex justify-end gap-2" : "flex gap-2"}
                  >
                    {message.role === "assistant" && (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                        <Bot className="size-4" />
                      </span>
                    )}
                    <MessageContent
                      className={
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "rounded-lg border border-primary/15 bg-muted/50 px-4 py-3"
                      }
                    >
                      {message.role === "assistant" ? (
                        <MessageResponse>{message.content || "…"}</MessageResponse>
                      ) : (
                        message.content
                      )}
                    </MessageContent>
                    {message.role === "user" && (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <User className="size-4" />
                      </span>
                    )}
                  </div>
                </Message>
              ))}
              {busy && (
                <p className="animate-pulse pl-10 text-xs text-primary">Ghost está pensando…</p>
              )}
              <div ref={endRef} />
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          <div className="border-t border-primary/15 bg-card/70 p-3 md:p-4">
            <PromptInput
              className="mx-auto max-w-4xl border-primary/30 bg-background/60"
              onSubmit={({ text }) => send(text)}
            >
              <PromptInputBody>
                <PromptInputTextarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Digite sua mensagem para o Ghost…"
                />
              </PromptInputBody>
              <PromptInputFooter>
                <span className="text-xs text-muted-foreground">
                  Enter envia • Shift + Enter quebra a linha
                </span>
                <PromptInputSubmit
                  status={busy ? "streaming" : "ready"}
                  disabled={busy || !input.trim()}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
