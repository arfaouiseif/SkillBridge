/**
 * Decides when to tell the server that the user is typing (docs/realtime.md):
 * `true` on the first keystroke, refreshed at most once every 2 seconds,
 * `false` after about 2 seconds without typing or when `stop()` is called.
 */
export class TypingNotifier {
  private active = false;
  private lastEmit = 0;
  private conversationId: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly emit: (conversationId: number, isTyping: boolean) => void;
  private readonly now: () => number;

  constructor(emit: (conversationId: number, isTyping: boolean) => void, now: () => number = Date.now) {
    this.emit = emit;
    this.now = now;
  }

  keystroke(conversationId: number) {
    if (this.conversationId !== null && this.conversationId !== conversationId) this.stop();
    this.conversationId = conversationId;

    const t = this.now();
    if (!this.active || t - this.lastEmit >= 2000) {
      this.emit(conversationId, true);
      this.active = true;
      this.lastEmit = t;
    }

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.stop(), 2000);
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.active && this.conversationId !== null) {
      this.emit(this.conversationId, false);
    }
    this.active = false;
  }
}