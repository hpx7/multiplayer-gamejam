import { HathoraClient, HathoraConnection } from "@hathora/client-sdk";

import { ClientMessage, ServerMessage } from "../../shared/messages";

// eslint-disable-next-line no-unused-vars
export type UpdateListener = (update: ServerMessage) => void;

export class RoomConnection {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private connection: HathoraConnection | undefined;
  private listeners: UpdateListener[] = [];

  // eslint-disable-next-line no-unused-vars
  public constructor(private client: HathoraClient, public token: string, public roomId: string) {}

  public async connect() {
    this.connection = await this.client.newConnection(this.roomId);
    this.connection.onMessage((msg) => this.handleMessage(msg));
    this.connection.onClose((err) => this.handleClose(err));
    await this.connection.connect(this.token);
  }

  public addListener(listener: UpdateListener) {
    this.listeners.push(listener);
  }

  public sendMessage(msg: ClientMessage) {
    this.connection?.write(this.encoder.encode(JSON.stringify(msg)));
  }

  public disconnect() {
    this.connection?.disconnect();
    this.listeners = [];
  }

  private handleMessage(data: ArrayBuffer) {
    const msg: ServerMessage = JSON.parse(this.decoder.decode(data));
    this.listeners.forEach((listener) => listener(msg));
  }

  private handleClose(err: { code: number; reason: string }) {
    console.error("close", err);
  }
}
