'use client';
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'askshree_home2_notes';

export default function NotesWidget() {
  const [notes, setNotes] = useState([]);
  const [draft, setDraft] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setNotes(JSON.parse(raw));
    } catch (e) { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (e) { /* ignore */ }
  }, [notes, loaded]);

  function addNote() {
    const text = draft.trim();
    if (!text) return;
    setNotes((n) => [{ id: Date.now(), text }, ...n]);
    setDraft('');
  }

  function removeNote(id) {
    setNotes((n) => n.filter((note) => note.id !== id));
  }

  return (
    <div className="widget-notes">
      <div className="widget-notes-input-row">
        <textarea
          className="widget-notes-textarea"
          placeholder="Jot something down..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); }}
          rows={2}
        />
        <button type="button" className="widget-notes-add" onClick={addNote}>Add</button>
      </div>

      {notes.length === 0 && (
        <div className="widget-notes-empty">No notes yet — they&rsquo;re saved on this device.</div>
      )}

      <div className="widget-notes-list">
        {notes.map((note) => (
          <div key={note.id} className="widget-notes-item">
            <span>{note.text}</span>
            <button type="button" className="widget-notes-remove" onClick={() => removeNote(note.id)} aria-label="Delete note">&times;</button>
          </div>
        ))}
      </div>
    </div>
  );
}
