/**
 * SpatialChat — Real-time Spatial & Room Chat Panel
 * Supports room-wide announcements as well as localized earshot whispers.
 */
import React, { useState, useRef, useEffect } from 'react';

export function SpatialChat({ messages = [], onSendMessage, isOpen, onToggleOpen }) {
  const [inputText, setInputText] = useState('');
  const [isWhisper, setIsWhisper] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), isWhisper);
    setInputText('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggleOpen}
        className="fixed top-20 right-6 z-40 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3.5 py-2.5 rounded-xl shadow-lg hover:border-slate-700 text-slate-300 hover:text-white transition"
      >
        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span className="text-xs font-semibold">Spatial Chat</span>
      </button>
    );
  }

  return (
    <div className="fixed top-20 right-6 z-40 w-80 h-[480px] bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <h3 className="text-sm font-bold text-slate-200">Spatial Chat</h3>
        </div>
        <button
          onClick={onToggleOpen}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Mode Selector Toggle */}
      <div className="flex p-2 bg-slate-950/60 border-b border-slate-800/80 gap-1">
        <button
          type="button"
          onClick={() => setIsWhisper(false)}
          className={`flex-1 py-1 text-xs rounded-lg font-semibold transition ${
            !isWhisper
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Room Broadcast
        </button>
        <button
          type="button"
          onClick={() => setIsWhisper(true)}
          className={`flex-1 py-1 text-xs rounded-lg font-semibold transition flex items-center justify-center gap-1 ${
            isWhisper
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Earshot Whisper</span>
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-slate-500 mt-20">
            No messages yet. Send a message to talk to participants!
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span
                  className="font-bold"
                  style={{ color: msg.senderColor || '#38bdf8' }}
                >
                  {msg.senderName}
                </span>
                {msg.isWhisper && (
                  <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[9px] font-mono">
                    WHISPER
                  </span>
                )}
                <span className="text-slate-500 text-[10px] ml-auto">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-slate-200 bg-slate-800/70 rounded-xl px-3 py-2 border border-slate-700/50 break-words">
                {msg.text}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-950/80">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isWhisper ? 'Whisper to nearby peers...' : 'Broadcast to room...'}
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default SpatialChat;
