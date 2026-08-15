'use client';
import { useState } from 'react';

// Small inline-editable table cell — shows the AI-extracted value (or a
// muted placeholder like "Add manually") and turns into a text input on
// click. Used for Qualification / Current CTC / Expected CTC / Notice
// period columns, which search snippets rarely contain, so recruiters
// need a fast way to fill them in by hand without leaving the table.
export default function EditableCell({ value, onChange, placeholder = 'Add manually' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); onChange(draft); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { setEditing(false); onChange(draft); } }}
        style={{
          width: 100, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--amber-dim)',
          borderRadius: 4, padding: '3px 6px', color: 'var(--cream)', fontSize: 11,
          fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500, outline: 'none',
        }}
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value || ''); setEditing(true); }}
      style={{ cursor: 'pointer', color: value ? 'var(--cream)' : 'var(--slate)', fontStyle: value ? 'normal' : 'italic' }}
      title="Click to edit"
    >
      {value || placeholder}
    </span>
  );
}
