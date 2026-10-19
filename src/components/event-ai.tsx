"use client";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { LoaderCircle, Sparkles, ArrowRight } from "lucide-react";
import type { z } from "zod";
import {
  getAiConfig,
  interpretEventSearch,
  askEvent,
  aiSearchHref,
  type searchInterpretationSchema,
  type eventAnswerSchema,
} from "@/lib/ai-api";
import styles from "./event-ai.module.css";

export function EventAi({ slug }: { slug?: string }) {
  const [opened, setOpened] = useState(false);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState<z.infer<
    typeof searchInterpretationSchema
  > | null>(null);
  const [answer, setAnswer] = useState<z.infer<
    typeof eventAnswerSchema
  > | null>(null);
  const config = useQuery({
    queryKey: ["ai-availability"],
    queryFn: getAiConfig,
    enabled: opened,
    staleTime: 300000,
    retry: false,
  });
  const examples = slug
    ? [
        "Can I request a refund?",
        "How do I buy another ticket?",
        "When can I enter?",
      ]
    : [
        "Technology events in Dhaka next weekend under BDT 1000",
        "Music events in Sylhet",
        "এই সপ্তাহে ঢাকায় কী ইভেন্ট আছে?",
      ];
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || !config.data?.enabled || question.trim().length < 3) return;
    setError("");
    setSearch(null);
    setAnswer(null);
    setPending(true);
    try {
      if (slug) setAnswer(await askEvent(slug, question.trim()));
      else setSearch(await interpretEventSearch(question.trim()));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "AI is unavailable. Please use the standard search or event information.",
      );
    } finally {
      setPending(false);
    }
  }
  function changeQuestion(value: string) {
    setQuestion(value);
    setSearch(null);
    setAnswer(null);
    setError("");
  }
  return (
    <section
      className={styles.panel}
      aria-label={slug ? "AI event assistant" : "AI event search"}
    >
      <div className={styles.header}>
        <div>
          <span className={styles.tag}>
            <Sparkles size={15} aria-hidden="true" /> EVENTGATE AI
          </span>
          <h2>
            {slug ? "Ask about this event." : "Find it in your own words."}
          </h2>
          <p>
            {slug
              ? "Questions about tickets, entry and refunds—answered from published event details and policies."
              : "Describe a topic, city, date or budget in English or Bangla. Review the filters before searching."}
          </p>
        </div>
        {!opened && (
          <button
            className="button"
            type="button"
            onClick={() => setOpened(true)}
          >
            {slug ? "Ask a question" : "Try AI search"}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      {opened && (
        <>
          {config.isPending ? (
            <p role="status">Checking AI availability…</p>
          ) : config.isError ? (
            <p role="status">
              AI could not connect. Standard search and event information remain
              available.{" "}
              <button
                className={styles.retry}
                type="button"
                onClick={() => void config.refetch()}
              >
                Retry connection
              </button>
            </p>
          ) : !config.data.enabled ? (
            <p role="status">
              AI is not available right now. Use standard search and published
              event details below.
            </p>
          ) : (
            <>
              <div className={styles.examples}>
                {examples.map((example) => (
                  <button
                    type="button"
                    key={example}
                    disabled={pending}
                    onClick={() => changeQuestion(example)}
                  >
                    {example}
                  </button>
                ))}
              </div>
              <form onSubmit={submit} className={styles.form}>
                <label
                  htmlFor={slug ? "event-ai-question" : "ai-search-question"}
                >
                  {slug
                    ? "Your event question"
                    : "What would you like to attend?"}
                </label>
                <textarea
                  id={slug ? "event-ai-question" : "ai-search-question"}
                  value={question}
                  onChange={(e) => changeQuestion(e.target.value)}
                  disabled={pending}
                  required
                  minLength={3}
                  maxLength={500}
                  rows={2}
                  placeholder={
                    slug
                      ? "Ask about the event, tiers or booking policies…"
                      : "For example: a technology event in Dhaka next weekend under BDT 1000"
                  }
                />
                <div className={styles.submit}>
                  <small>
                    {question.length}/500 · Don’t include private or payment
                    information.
                  </small>
                  <button
                    className="button button-primary"
                    disabled={pending || question.trim().length < 3}
                    type="submit"
                  >
                    {pending ? (
                      <>
                        <LoaderCircle
                          size={16}
                          className={styles.spinner}
                          aria-hidden="true"
                        />{" "}
                        {slug
                          ? "Finding sources…"
                          : "Understanding your search…"}
                      </>
                    ) : slug ? (
                      "Find answer"
                    ) : (
                      "Interpret search"
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          {search && (
            <div className={styles.result} role="status">
              <p>{search.message}</p>
              {search.matched && (
                <>
                  <dl className={styles.filters}>
                    {Object.entries(search.filters).map(([key, value]) => (
                      <div key={key}>
                        <dt>
                          {
                            {
                              search: "Topic",
                              city: "City",
                              category: "Category",
                              startDate: "From",
                              endDate: "Through",
                              maxPricePaisa: "Maximum tier price",
                            }[key]
                          }
                        </dt>
                        <dd>
                          {key === "maxPricePaisa"
                            ? `BDT ${(Number(value) / 100).toFixed(2)}`
                            : value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <Link
                    className="button button-primary"
                    href={aiSearchHref(search.filters)}
                  >
                    Search these events{" "}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <p className={styles.note}>
                    Filters remain editable in standard search. Dates use
                    Bangladesh time; ticket prices and availability come from
                    the catalogue.
                  </p>
                </>
              )}
            </div>
          )}
          {answer && (
            <div className={styles.result} role="status">
              <p>{answer.message}</p>
              <ul className={styles.sources}>
                {answer.sources.map((source) => (
                  <li key={source.id}>
                    <Link href={source.href}>{source.label} ↗</Link>
                    <p>{source.text}</p>
                  </li>
                ))}
              </ul>
              <small>
                Source-backed guidance, not a booking or refund decision. Your
                booking shows your actual eligibility.
              </small>
            </div>
          )}
          <p className={styles.note}>
            Powered by Gemini · Free quota applies. Only your question and
            public event information are sent to Google. Google may use
            free-tier inputs to improve its services.
          </p>
        </>
      )}
    </section>
  );
}
