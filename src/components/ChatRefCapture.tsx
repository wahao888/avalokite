"use client";

import { useEffect } from "react";
import { captureChatRef } from "@/lib/chat-ref";
import { track } from "@/lib/track";

/** 從 AI 客服的連結點進來時記下來源（見 src/lib/chat-ref.ts）。不渲染任何東西。 */
export default function ChatRefCapture() {
  useEffect(() => {
    const ref = captureChatRef(window.location.search);
    if (ref) track("chat_link_visit", { ref });
  }, []);
  return null;
}
