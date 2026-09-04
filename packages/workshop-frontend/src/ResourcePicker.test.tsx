// @vitest-environment jsdom
/* eslint-disable react/react-in-jsx-scope */

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RpcStub } from 'capnweb'
import type { AuthenticatedApi, ConnectedAccountsSubscriber } from '@gadgets/workshop-shared/api'
import ResourcePicker from './ResourcePicker'

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@cloudflare/kumo', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children,
  useKumoToastManager: () => ({ add: vi.fn<(toast: unknown) => void>() }),
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const dispose = vi.fn<() => void>()
  const promise = Object.assign(new Promise<T>(next => { resolve = next }), {
    [Symbol.dispose]: dispose,
  })
  return { promise, resolve, dispose }
}

describe('ResourcePicker', () => {
  let root: Root | undefined
  let container: HTMLDivElement | undefined

  afterEach(() => {
    act(() => root?.unmount())
    container?.remove()
    vi.restoreAllMocks()
  })

  it('disposes a pending connected-account subscription on unmount', async () => {
    const pendingSubscription = deferred<{ [Symbol.dispose](): void }>()
    const authenticatedApi = {
      subscribeConnectedAccounts: () => pendingSubscription.promise,
      listGatekeeperVendors: async () => [],
    } as unknown as RpcStub<AuthenticatedApi>

    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => root!.render(
      <ResourcePicker
        authenticatedApi={authenticatedApi}
        searchText="https://example.com"
        onSelectAccount={() => {}}
      />,
    ))

    act(() => root!.unmount())
    root = undefined

    expect(pendingSubscription.dispose).toHaveBeenCalledOnce()
  })

  it('provisions an ambient vendor instead of starting OAuth', async () => {
    const provisionAmbientAccount = vi.fn<(vendorId: string) => Promise<void>>().mockResolvedValue()
    const connectAccount = vi.fn<
      (vendorId: string, resourceUrlPatterns?: string[]) => Promise<{ url: string }>
    >()
    const authenticatedApi = {
      subscribeConnectedAccounts: (subscriber: ConnectedAccountsSubscriber) => {
        subscriber.ready()
        return Object.assign(Promise.resolve({ [Symbol.dispose]() {} }), {
          [Symbol.dispose]() {},
        })
      },
      listGatekeeperVendors: async () => [{
        id: 'http-gatekeeper',
        description: {
          displayName: 'HTTP Gatekeeper',
          url: 'https://http-gatekeeper.example.test',
          autoProvisionsAccount: true,
        },
        supportedResources: [{
          urlPattern: 'http-gatekeeper://scope',
          title: 'HTTP scope',
          description: 'Make scoped HTTP requests.',
        }],
      }],
      provisionAmbientAccount,
      connectAccount,
    } as unknown as RpcStub<AuthenticatedApi>

    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => {
      root!.render(
        <ResourcePicker
          authenticatedApi={authenticatedApi}
          searchText=""
          onSelectAccount={() => {}}
        />,
      )
      await Promise.resolve()
    })

    const connectLabel = [...container.querySelectorAll('span')]
      .find(element => element.textContent === 'Connect new account')
    const connect = connectLabel?.parentElement
    expect(connect).toBeDefined()
    await act(async () => connect!.click())

    expect(provisionAmbientAccount).toHaveBeenCalledWith('http-gatekeeper')
    expect(connectAccount).not.toHaveBeenCalled()
  })
})
