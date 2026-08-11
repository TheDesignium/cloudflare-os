import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { runInDurableObject } from "cloudflare:test";
import type { OAuthCredential } from "@earendil-works/pi-ai";
import type { UserDurableObject } from "../src/user.js";

declare module "cloudflare:workers" {
  interface ProvidedEnv {
    TEST_USER: DurableObjectNamespace<UserDurableObject>;
  }
}

const MODEL_ID = "gpt-5.6-sol";
const STORED_MODEL_ID = `openai-codex:${MODEL_ID}`;

function accessToken(accountId: string): string {
  let payload = btoa(JSON.stringify({
    "https://api.openai.com/auth": { chatgpt_account_id: accountId },
  }));
  return `header.${payload}.signature`;
}

function credential(overrides: Partial<OAuthCredential> = {}): OAuthCredential {
  return {
    type: "oauth",
    access: accessToken("account-1"),
    refresh: "refresh-1",
    expires: Date.now() + 60 * 60 * 1000,
    accountId: "account-1",
    ...overrides,
  };
}

describe("ChatGPT model credentials", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("stores one user credential while keeping access tokens out of model records", async () => {
    const stub = env.TEST_USER.getByName("chatgpt-store");
    await runInDurableObject(stub, async (user: UserDurableObject) => {
      await user.finishChatGptModelAdd(MODEL_ID, credential());

      const context = await user.getChatContext(STORED_MODEL_ID);
      expect(context.aiModel?.profile.id).toBe(STORED_MODEL_ID);
      expect(context.aiModel?.config.apiToken).toBe(accessToken("account-1"));

      const internals = user as unknown as {
        storage: {
          aiModels: { get(id: string): { config: { apiToken: string } } | undefined };
        };
      };
      expect(internals.storage.aiModels.get(STORED_MODEL_ID)?.config.apiToken).toBe("");
    });
  });

  it("refreshes an expiring credential once and persists refresh-token rotation", async () => {
    const rotatedAccess = accessToken("account-1");
    const fetchMock = vi.fn(async () => Response.json({
      access_token: rotatedAccess,
      refresh_token: "refresh-2",
      expires_in: 3600,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const stub = env.TEST_USER.getByName("chatgpt-refresh");
    await runInDurableObject(stub, async (user: UserDurableObject) => {
      await user.finishChatGptModelAdd(MODEL_ID, credential({ expires: Date.now() - 1 }));

      const [first, second] = await Promise.all([
        user.getChatContext(STORED_MODEL_ID),
        user.getChatContext(STORED_MODEL_ID),
      ]);
      expect(first.aiModel?.config.apiToken).toBe(rotatedAccess);
      expect(second.aiModel?.config.apiToken).toBe(rotatedAccess);

      const internals = user as unknown as {
        storage: { chatGptCredential: { get(): OAuthCredential | null } };
      };
      expect(internals.storage.chatGptCredential.get()?.refresh).toBe("refresh-2");
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://auth.openai.com/oauth/token");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeInstanceOf(URLSearchParams);
    expect((init.body as URLSearchParams).get("grant_type")).toBe("refresh_token");
  });
});
