// src/client/App.tsx
import React, { useEffect, useRef, useState } from 'react';
import type {
  ApiKeysOverride,
  Attachment,
  ChatMessage,
  ChatThread,
  ModelId,
  ProviderOverride,
} from '../shared/types';
import {
  loadApiKeysOverride,
  loadProviderOverride,
  loadSelectedModel,
  loadThreads,
  saveApiKeysOverride,
  saveProviderOverride,
  saveSelectedModel,
  saveThreads,
} from './lib/storage';
import { streamChatCompletion } from './lib/sseClient';
import { Sidebar } from './components/Sidebar';
import { HeroLanding } from './components/HeroLanding';
import { AntigravityComposer } from './components/AntigravityComposer';
import { MessageItem } from './components/MessageItem';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  const [threads, setThreads] = useState<ChatThread[]>(() => loadThreads());
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => loadThreads()[0]?.id ?? null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelId>(() => loadSelectedModel());
  const [providerOverride, setProviderOverride] = useState<ProviderOverride>(() => loadProviderOverride());
  const [apiKeys, setApiKeys] = useState<ApiKeysOverride>(() => loadApiKeysOverride());
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    saveThreads(threads);
  }, [threads]);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  const sendPrompt = async (promptText: string, attached: Attachment[]) => {
    const trimmed = promptText.trim();
    if (!trimmed && attached.length === 0) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: trimmed,
      attachments: attached.length > 0 ? attached : undefined,
      createdAt: Date.now(),
    };

    const assistantMsgId = `msg_${Date.now()}_a`;
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      reasoning: '',
      modelId: selectedModel,
      createdAt: Date.now(),
    };

    let targetThreadId = activeThreadId;
    let historyMessages: ChatMessage[] = [];

    if (!targetThreadId || !activeThread) {
      targetThreadId = `thr_${Date.now()}`;
      const newThread: ChatThread = {
        id: targetThreadId,
        title: (trimmed || 'Attachment prompt').slice(0, 42),
        messages: [userMsg, assistantMsg],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      historyMessages = [userMsg];
      setThreads((prev) => [newThread, ...prev]);
      setActiveThreadId(targetThreadId);
    } else {
      historyMessages = [...activeThread.messages, userMsg];
      setThreads((prev) =>
        prev.map((t) =>
          t.id === targetThreadId
            ? { ...t, messages: [...t.messages, userMsg, assistantMsg], updatedAt: Date.now() }
            : t
        )
      );
    }

    setInput('');
    setAttachments([]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChatCompletion(
        {
          modelId: selectedModel,
          providerOverride,
          messages: historyMessages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          apiKeys,
        },
        (evt) => {
          setThreads((prev) =>
            prev.map((t) => {
              if (t.id !== targetThreadId) return t;
              return {
                ...t,
                messages: t.messages.map((m) => {
                  if (m.id !== assistantMsgId) return m;
                  if (evt.type === 'meta') {
                    return {
                      ...m,
                      resolvedModelName: evt.modelName,
                      providerUsed: evt.provider,
                    };
                  }
                  if (evt.type === 'failover') {
                    return {
                      ...m,
                      failover: { from: evt.from, to: evt.to, reason: evt.reason },
                    };
                  }
                  if (evt.type === 'reasoning') {
                    return { ...m, reasoning: (m.reasoning ?? '') + evt.delta };
                  }
                  if (evt.type === 'text') {
                    return { ...m, content: m.content + evt.delta };
                  }
                  if (evt.type === 'done') {
                    return { ...m, latencyMs: evt.latencyMs };
                  }
                  if (evt.type === 'error') {
                    return { ...m, error: evt.message };
                  }
                  return m;
                }),
              };
            })
          );
        },
        controller.signal
      );
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        const errMsg = err instanceof Error ? err.message : String(err);
        setThreads((prev) =>
          prev.map((t) =>
            t.id === targetThreadId
              ? {
                  ...t,
                  messages: t.messages.map((m) =>
                    m.id === assistantMsgId ? { ...m, error: errMsg } : m
                  ),
                }
              : t
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const composerElement = (
    <AntigravityComposer
      value={input}
      onChange={setInput}
      attachments={attachments}
      onAttachmentsChange={setAttachments}
      selectedModel={selectedModel}
      onSelectModel={(m) => {
        setSelectedModel(m);
        saveSelectedModel(m);
      }}
      providerOverride={providerOverride}
      onSelectProviderOverride={(p) => {
        setProviderOverride(p);
        saveProviderOverride(p);
      }}
      isStreaming={isStreaming}
      onSubmit={() => sendPrompt(input, attachments)}
      onStop={() => abortRef.current?.abort()}
    />
  );

  return (
    <div className="app-shell">
      <Sidebar
        threads={threads}
        activeThreadId={activeThreadId}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        onNewThread={() => setActiveThreadId(null)}
        onSelectThread={(id) => setActiveThreadId(id)}
        onRenameThread={(id, title) =>
          setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)))
        }
        onDeleteThread={(id) => {
          setThreads((prev) => prev.filter((t) => t.id !== id));
          if (activeThreadId === id) setActiveThreadId(null);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="workspace-main">
        {!activeThread || activeThread.messages.length === 0 ? (
          <HeroLanding
            composerSlot={composerElement}
            onSelectStarter={(prompt) => sendPrompt(prompt, [])}
          />
        ) : (
          <div className="active-thread-layout">
            <div className="thread-scroll-region">
              {activeThread.messages.map((msg) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  onOpenSettings={() => setSettingsOpen(true)}
                />
              ))}
            </div>
            <div className="docked-composer-bar">{composerElement}</div>
          </div>
        )}
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        keys={apiKeys}
        onSave={(nextKeys) => {
          setApiKeys(nextKeys);
          saveApiKeysOverride(nextKeys);
        }}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};
