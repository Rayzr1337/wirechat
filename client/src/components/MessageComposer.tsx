import { useState } from 'react';
import { SendIcon } from './icons';

interface MessageComposerProps {
  onSend: (content: string) => void;
  onTyping: () => void;
  disabled?: boolean;
}

export function MessageComposer({ onSend, onTyping, disabled }: MessageComposerProps) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput("");
  };

  return (
    <div className="flex items-center gap-3 rounded-md px-3.5 py-2.5 bg-surface-3">
      <input
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          onTyping();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSend();
        }}
        placeholder="Message"
        className="flex-1 bg-transparent outline-none text-sm"
        style={{ color: "#e8e8f0" }}
        disabled={disabled}
      />
      <SendIcon size={17} color={input.trim() ? "#7c6ff0" : "#5c5c6e"}
                onClick={handleSend} />
    </div>
  );
}
