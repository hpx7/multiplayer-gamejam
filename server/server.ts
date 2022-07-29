import { register } from "@hathora/server-sdk";

import { APP_SECRET } from "../shared/base.js";

const coordinator = await register({
  appSecret: APP_SECRET,
  authInfo: { anonymous: { separator: "-" } },
  store: {
    newState(roomId, userId, data) {
      console.log("newState", roomId.toString(36), userId, data);
    },
    subscribeUser(roomId, userId) {
      console.log("subscribeUser", roomId.toString(36), userId);
    },
    unsubscribeUser(roomId, userId) {
      console.log("unsubscribeUser", roomId.toString(36), userId);
    },
    unsubscribeAll() {
      console.log("unsubscribeAll");
    },
    onMessage(roomId, userId, data) {
      const dataStr = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
      console.log("handleUpdate", roomId.toString(36), userId, dataStr);
    },
  },
});
