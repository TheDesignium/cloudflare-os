import { describe, expect, it, vi } from "vitest";
import { env, RpcStub as NativeRpcStub } from "cloudflare:workers";
import { runInDurableObject } from "cloudflare:test";
import type { OverseerDurableObject } from "../src/overseer.js";

declare module "cloudflare:workers" {
  interface ProvidedEnv {
    TEST_OVERSEER: DurableObjectNamespace<OverseerDurableObject>;
  }
}

describe("transient agent callback stubs", () => {
  it("remain available across separate RPC callers until the callback resolves", async () => {
    const overseer = env.TEST_OVERSEER.getByName("transient-agent-callback-stubs");

    await runInDurableObject(overseer, async (instance: OverseerDurableObject) => {
      const impl = (instance as unknown as { impl: any }).impl;
      const agent = { type: "agent", id: "model-id", name: "Model" };
      impl.ownerId = "owner-id";
      impl.storage.chatMeta.put({
        id: 7,
        title: "Chat",
        started: new Date(0),
        lastActive: new Date(0),
      });
      impl.users = {
        idFromString: (id: string) => id,
        get: () => ({
          getChatContext: async () => ({
            profile: { type: "gadget", id: "gadget-id", name: "Gadget" },
            aiModel: { profile: agent, config: {} },
          }),
          setGadgetLastActive: async () => {},
        }),
      };
      impl.startAgent = () => Promise.resolve();

      const callback = new NativeRpcStub<(value: string) => void>((value: string) => {
        impl.storage.title.put(value);
      });
      const delivery = impl.deliverAgentCallback(
          7, "run", [callback], "owner-id", "model-id");

      await Promise.race([
        delivery.then(() => {
          throw new Error("Agent callback resolved before becoming active.");
        }),
        vi.waitFor(() => expect(impl.activeAgentCallbackCount(7)).toBe(1)),
      ]);
      expect(impl.nextChatSequencePeek(7)).toBe(1);
    });

    {
      using firstCaller = await overseer.getTransientStub(7, 0, 0);
      await firstCaller("first");
    }
    {
      using secondCaller = await overseer.getTransientStub(7, 0, 0);
      await secondCaller("second");
    }

    await runInDurableObject(overseer, async (instance: OverseerDurableObject) => {
      const impl = (instance as unknown as { impl: any }).impl;
      expect(impl.storage.title.get()).toBe("second");
      impl.resolveAgentCallback(7, 0, undefined);
    });
  });
});
