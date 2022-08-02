import { HathoraClient } from "@hathora/client-sdk";
import { HathoraTransport, TransportType } from "@hathora/client-sdk/lib/transport";

import { ClientMessage, ServerMessage } from "../../shared/messages";

// eslint-disable-next-line no-unused-vars
export type UpdateListener = (update: ServerMessage) => void;

export class RoomConnection {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private connection: HathoraTransport | undefined;
  private listeners: UpdateListener[] = [];

  // eslint-disable-next-line no-unused-vars
  public constructor(private client: HathoraClient, public token: string, public roomId: string) {}

  public async connect() {
    this.connection = await this.client.connect(
      this.token,
      this.roomId,
      (msg) => this.handleMessage(msg),
      (err) => this.handleClose(err),
      TransportType.WebSocket
    );
  }

  public addListener(listener: UpdateListener) {
    this.listeners.push(listener);
  }

  public sendMessage(msg: ClientMessage) {
    this.connection?.write(this.encoder.encode(JSON.stringify(msg)));
  }

  private handleMessage(data: ArrayBuffer) {
    const msg: ServerMessage = JSON.parse(this.decoder.decode(data));
    this.listeners.forEach((listener) => listener(msg));
  }

  private handleClose(err: { code: number; reason: string }) {
    console.error("close", err);
  }
}
