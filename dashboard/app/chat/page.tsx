import { MessageSquare } from "lucide-react";

export default function Chat() {
  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center mb-6">
        <MessageSquare size={28} className="text-blue-600" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Chat</h1>
      <p className="text-muted-foreground mt-2 max-w-sm">
        AI agent powered by OpenClaw. Chat, set reminders, search your news — all from here.
      </p>
      <p className="text-xs text-muted-foreground mt-6 bg-muted px-3 py-1.5 rounded-full">Coming in Phase 3</p>
    </div>
  );
}
