"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import styles from "./event-ai.module.css";
const Chat = dynamic(
  () => import("./event-ai").then((module) => module.EventAi),
  { ssr: false },
);
export function EventAiLauncher() {
  const [loaded, setLoaded] = useState(false);
  return loaded ? (
    <Chat initiallyOpen />
  ) : (
    <button
      className={styles.launcher}
      aria-label="Open AI chat"
      onClick={() => setLoaded(true)}
    >
      <MessageCircle size={21} aria-hidden="true" />
      <span>Ask AI</span>
    </button>
  );
}
