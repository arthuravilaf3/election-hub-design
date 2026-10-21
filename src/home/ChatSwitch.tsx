/**
 * Prototype chrome, not design (Oct 21 2026): forces what the chat panel is
 * showing, on its own and never inside the stream's switch — the two surfaces
 * fail separately and the controls have to show that they can.
 */
import type { ChatStatus } from './chat';

const OPTIONS: Array<{ value: ChatStatus; label: string }> = [
  { value: 'member', label: 'Member' },
  { value: 'locked', label: 'Locked' },
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
