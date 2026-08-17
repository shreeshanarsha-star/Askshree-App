'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

// v3: sends recent conversation history so follow-ups have context, and
// reads the response as a stream so the reply appears progressively
// instead of after one long "thinking…" wait. See app/api/ask-shree/route.js
// for the matching server-side changes.
export default function AskShreeChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi, I'm Shree. I can answer questions about this site and its tools — what would you like to know?" },
  ]);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    const history = messages.slice(-16); // matches the server's MAX_HISTORY_TURNS*2 cap
    setMessages((m) => [...m, { role: 'user', text: userMsg }, { role: 'assistant', text: '' }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ask-shree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, page: pathname, history }),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', text: data.error || "You've reached today's message limit. Try again tomorrow." };
          return copy;
        });
        setLoading(false);
        return;
      }
      if (!res.ok || !res.body) {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', text: 'Ask Shree had trouble answering that. Try again.' };
          return copy;
        });
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const chunk = acc;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', text: chunk };
          return copy;
        });
      }
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', text: 'Network error. Try again.' };
        return copy;
      });
    }
    setLoading(false);
  }

  return (
    <>
      <button className="chat-launcher" onClick={() => setOpen((o) => !o)}>&#9679; Ask Shree</button>
      {open && (
        <div className="chat-panel open">
          <div className="chat-head">
            <span>Ask Shree</span>
            <span className="x" onClick={() => setOpen(false)}>&times;</span>
          </div>
          <div className="chat-body" style={{ maxHeight: 280, overflowY: 'auto' }}>
            {messages.map((m, i) => (
              <div key={i} className="chat-msg" style={{ opacity: m.role === 'user' ? 0.8 : 1 }}>
                {m.text || (loading && i === messages.length - 1 ? 'thinking…' : '')}
              </div>
            ))}
          </div>
          <div className="chat-input-row">
            <input
              type="text"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              disabled={loading}
            />
            <button onClick={send} disabled={loading}>send</button>
          </div>
        </div>
      )}
    </>
  );
}
