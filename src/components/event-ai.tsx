"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { LoaderCircle, MessageCircle, Send, Sparkles, X } from "lucide-react";
import type { z } from "zod";
import { getAiConfig, interpretEventSearch, askEvent, aiSearchHref, type searchInterpretationSchema, type eventAnswerSchema } from "@/lib/ai-api";
import styles from "./event-ai.module.css";

type Exchange = {
  id: number;
  question: string;
  scope: string;
  search?: z.infer<typeof searchInterpretationSchema>;
  answer?: z.infer<typeof eventAnswerSchema>;
  error?: string;
};

export function EventAi() {
  const pathname = usePathname();
  const slug = /^\/events\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(pathname)?.[1];
  const [opened, setOpened] = useState(false);
  const [mode, setMode] = useState("search");
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<Exchange[]>([]);
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const config = useQuery({ queryKey: ["ai-availability"], queryFn: getAiConfig, enabled: opened, staleTime: 300000, retry: false });
  const eventMode = !!slug && mode === pathname;

  function close() {
    setOpened(false);
    launcher.current?.focus();
  }
  useEffect(() => {
    if (opened) input.current?.focus();
  }, [opened, config.data?.enabled]);
  useEffect(() => {
    if (opened) bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages, pending, opened]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (busy.current || !config.data?.enabled || text.length < 3) return;
    busy.current = true;
    setPending(true);
    setQuestion("");
    const id = Date.now();
    const exchange: Exchange = { id, question: text, scope: eventMode ? `Event: ${slug}` : "Event search" };
    setMessages((previous) => [...previous.slice(-9), { ...exchange }]);
    try {
      if (eventMode) exchange.answer = await askEvent(slug!, text);
      else exchange.search = await interpretEventSearch(text);
    } catch (failure) {
      exchange.error = failure instanceof Error ? failure.message : "AI is unavailable. You can still browse events normally.";
    } finally {
      // Replace the pending entry without changing other conversations or route context.
      setMessages((previous) => previous.map((message) => message.id === id ? { ...exchange } : message));
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <button ref={launcher} className={styles.launcher} aria-label={opened ? "Close AI chat" : "Open AI chat"} aria-expanded={opened} aria-controls="eventgate-ai-chat" onClick={() => { if (opened) close(); else { setMode(slug ? pathname : "search"); setOpened(true); } }}>
        <MessageCircle size={21} aria-hidden="true" /> <span>Ask AI</span>
      </button>
      {opened && (
        <aside id="eventgate-ai-chat" className={styles.panel} aria-labelledby="eventgate-ai-title" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
          <header className={styles.header}>
            <div><span className={styles.tag}><Sparkles size={15} aria-hidden="true" /> EVENTGATE AI</span><h2 id="eventgate-ai-title">Your event assistant</h2></div>
            <button className={styles.iconButton} aria-label="Close AI chat panel" onClick={close}><X size={22} /></button>
          </header>
          <div className={styles.context}>
            <label htmlFor="ai-chat-mode">Help me with</label>
            <select id="ai-chat-mode" value={eventMode ? pathname : "search"} onChange={(event) => setMode(event.target.value)}>
              <option value="search">Finding events</option>
              {slug && <option value={pathname}>Questions about this event</option>}
            </select>
          </div>
          <div className={styles.conversation} role="log" aria-label="AI conversation" aria-live="polite" aria-relevant="additions text">
            <div className={styles.assistant}>
              <p>Hi! I can find events by city, date, topic or budget in English or Bangla. Open an event to ask about its tickets, entry and refund policy.</p>
              <small>Ask each question with its details. I can’t access private bookings or make payments.</small>
            </div>
            {messages.map((message) => (
              <div key={message.id} className={styles.exchange}>
                <div className={styles.user}><small>{message.scope}</small><p>{message.question}</p></div>
                {(message.search || message.answer || message.error) && <div className={styles.assistant}>
                  {message.error && <p role="alert">{message.error} Try again or use normal event browsing.</p>}
                  {message.search && <>
                    <p>{message.search.message}</p>
                    {message.search.matched && <>
                      <dl className={styles.filters}>{Object.entries(message.search.filters).map(([key, value]) => <div key={key}><dt>{{search: "Topic", city: "City", category: "Category", startDate: "From", endDate: "Through", maxPricePaisa: "Maximum price"}[key]}</dt><dd>{key === "maxPricePaisa" ? `BDT ${(Number(value) / 100).toFixed(2)}` : value}</dd></div>)}</dl>
                      <Link className={styles.action} href={aiSearchHref(message.search.filters)}>View matching events →</Link>
                    </>}
                  </>}
                  {message.answer && <>
                    <p>{message.answer.message}</p>
                    <ul className={styles.sources}>{message.answer.sources.map((source) => <li key={source.id}><Link href={source.href} onClick={close}>{source.label} ↗</Link><p>{source.text}</p></li>)}</ul>
                    <small>Your booking determines actual refund and entry eligibility.</small>
                  </>}
                </div>}
              </div>
            ))}
            {pending && <p className={styles.waiting} role="status"><LoaderCircle className={styles.spinner} size={16} /> Finding an answer…</p>}
            <div ref={bottom} />
          </div>
          <div className={styles.composer}>
            {config.isPending ? <p role="status">Connecting to AI…</p> : config.isError ? <p role="status">AI could not connect. <button className={styles.retry} onClick={() => void config.refetch()}>Retry connection</button></p> : !config.data?.enabled ? <p role="status">AI is currently unavailable. Event browsing still works.</p> : <>
              <div className={styles.examples}>{(eventMode ? ["Can I request a refund?", "When can I enter?"] : ["Music events in Sylhet", "Dhaka technology under BDT 1000"]).map((example) => <button key={example} disabled={pending} onClick={() => { setQuestion(example); input.current?.focus(); }}>{example}</button>)}</div>
              <form onSubmit={submit} className={styles.form}>
                <label className={styles.srOnly} htmlFor="ai-chat-question">Message EventGate AI</label>
                <textarea ref={input} id="ai-chat-question" value={question} onChange={(event) => setQuestion(event.target.value)} required minLength={3} maxLength={500} rows={2} placeholder={eventMode ? "Ask about this event…" : "Find an event…"} />
                <button className={styles.send} aria-label="Send message" disabled={pending || question.trim().length < 3} type="submit"><Send size={20} /></button>
              </form>
              <small>{question.length}/500 · Don’t share private or payment details.</small>
            </>}
            <p className={styles.note}>Gemini · Free quota applies. Questions and public event facts go to Google and may be used to improve its services.</p>
          </div>
        </aside>
      )}
    </>
  );
}
