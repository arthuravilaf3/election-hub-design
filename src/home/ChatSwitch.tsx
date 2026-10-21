/**
 * Prototype chrome, not design (Oct 21 2026): forces the chat's health on its
 * own, beside the stream's switch and never inside it — the two surfaces fail
 * separately and the controls have to show that they can.
 */
import type { ChatStatus } from './chat';

const OPTIONS: Array<{ value: ChatStatus; label: string }> = [
  { value: 'on', label: 'On' },
  { value: 'down', label: 'Down' },
];

interface ChatSwitchProps {
  chat: ChatStatus;
  onChange: (next: ChatStatus) => void;
}

export function ChatSwitch({ chat, onChange }: ChatSwitchProps) {
  return (
    <div className="stream-switch" role="group" aria-label="Prototype: chat state">
      <span className="stream-switch-label">Chat</span>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className="stream-switch-btn"
          aria-pressed={chat === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
