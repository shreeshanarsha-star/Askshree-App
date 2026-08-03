'use client';
import { useState } from 'react';

export default function AskShreeChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi — ask me anything about talent acquisition, this site\'s tools, or search the web and my reference docs.' },
  ]);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((m) => [...m, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ask-shree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', text: data.reply || data.error || 'No response.' }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: 'Network error. Try again.' }]);
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
            <span className="chat-tag">unrestricted &middot; searches public web + admin repository</span>
            {messages.map((m, i) => (
              <div key={i} className="chat-msg" style={{ opacity: m.role === 'user' ? 0.8 : 1 }}>
                {m.text}
              </div>
            ))}
            {loading && <div className="chat-msg">thinking…</div>}
          </div>
          <div className="chat-input-row">
            <input
              type="text"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button onClick={send}>send</button>
          </div>
        </div>
      )}
    </>
  );
}
