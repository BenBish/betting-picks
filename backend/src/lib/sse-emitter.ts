export interface ActivityEvent {
  action: string;
  agent_id: string | null;
  created_at: string;
  details: string | null;
  id: string;
  pick_id: string | null;
}

// Simple in-memory SSE broadcaster
// Each "client" is a function that receives encoded SSE messages
type Client = (data: Uint8Array) => void;

class SseEmitter {
  private readonly clients: Set<Client> = new Set();

  subscribe(client: Client): () => void {
    this.clients.add(client);
    return () => this.clients.delete(client);
  }

  emit(event: string, data: unknown): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);

    const toRemove: Client[] = [];
    for (const client of this.clients) {
      try {
        client(encoded);
      } catch {
        toRemove.push(client);
      }
    }
    for (const client of toRemove) {
      this.clients.delete(client);
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }
}

export const sseEmitter = new SseEmitter();
