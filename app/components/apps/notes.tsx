'use client';
import { useCallback, useEffect, useState } from 'react';
import { registerNoteTool } from '@/lib/apps/note-tool';
const key = 'enon-home.notes.v1';
export function NotesApp() {
  const [note, setNote] = useState(''),
    [status, setStatus] = useState('');
  useEffect(() => {
    try {
      setNote(localStorage.getItem(key) ?? '');
      setStatus('所有想法，从这里开始。');
    } catch {
      setStatus('浏览器暂时不允许保存笔记。');
    }
  }, []);
  const update = useCallback((value: string) => {
    setNote(value);
    try {
      localStorage.setItem(key, value);
      setStatus('已保存到这台设备');
      return true;
    } catch {
      setStatus('保存失败，请先复制你的文字。');
      return false;
    }
  }, []);
  useEffect(() => registerNoteTool(update), [update]);
  return (
    <div className="notes-content">
      <div className="eyebrow">A LITTLE SPACE FOR YOUR THOUGHTS</div>
      <h2>今天，想到什么？</h2>
      <textarea
        autoFocus
        aria-label="笔记内容"
        placeholder="一个灵感、一件小事，或者明天想做的事…"
        value={note}
        onChange={(event) => update(event.target.value)}
        spellCheck={false}
      />
      <div className="notes-status" role="status">
        <span>{status}</span>
        <span>{note.length} 字</span>
      </div>
    </div>
  );
}
