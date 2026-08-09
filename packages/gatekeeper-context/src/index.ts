// Context Library worker: private per-account collections plus public per-domain collections. The
// vendor auto-provisions accounts that expose a read-only agent singleton and a management UI.

import { WorkerEntrypoint } from "cloudflare:workers";
import { ContextCollectionDurableObject } from "./context-collection.js";
import { UserLibraryDurableObject } from "./user-library.js";
import { LibraryRegistryDurableObject } from "./registry-do.js";

export { ContextCollectionDurableObject };
export { UserLibraryDurableObject };
export { LibraryRegistryDurableObject };
export {
  GatekeeperVendor, ContextAccount, ContextVerifier, ContextGatekeeper,
} from "./library-gatekeeper.js";

export class DataResetEntrypoint extends WorkerEntrypoint<Cloudflare.Env> {
  async purgeDurableObjectForDataReset(className: string, objectId: string): Promise<unknown> {
    if (className === "ContextCollectionDurableObject") {
      let ns = this.ctx.exports.ContextCollectionDurableObject;
      return ns.get(ns.idFromString(objectId)).purgeForDataReset();
    }
    if (className === "UserLibraryDurableObject") {
      let ns = this.ctx.exports.UserLibraryDurableObject;
      return ns.get(ns.idFromString(objectId)).purgeForDataReset();
    }
    if (className === "LibraryRegistryDurableObject") {
      let ns = this.ctx.exports.LibraryRegistryDurableObject;
      return ns.get(ns.idFromString(objectId)).purgeForDataReset();
    }
    if (className === "ContextGatekeeper") {
      let ns = this.ctx.exports.ContextGatekeeper;
      return ns.get(ns.idFromString(objectId)).purgeForDataReset();
    }
    throw new Error(`Unsupported Context reset class: ${className}`);
  }
}

// Keep ES Module worker format; this worker is used over RPC/DOs, not HTTP.
export default {
  async fetch(): Promise<Response> {
    return new Response("Context Library worker is running.", {
      headers: { "content-type": "text/plain" },
    });
  },
};
