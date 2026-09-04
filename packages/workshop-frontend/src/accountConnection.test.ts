import { describe, expect, it, vi } from 'vitest'
import type { RpcStub } from 'capnweb'
import type { AuthenticatedApi, GatekeeperVendorInfo } from '@gadgets/workshop-shared/api'
import { startAccountConnection } from './accountConnection'

function fakeApi() {
  const connectAccount = vi.fn<
    (vendorId: string, resourceUrlPatterns?: string[]) => Promise<{ url: string }>
  >().mockResolvedValue({ url: 'https://accounts.example.test/authorize' })
  const provisionAmbientAccount = vi.fn<(vendorId: string) => Promise<void>>().mockResolvedValue()
  const authenticatedApi = { connectAccount, provisionAmbientAccount } as unknown as RpcStub<AuthenticatedApi>
  return { authenticatedApi, connectAccount, provisionAmbientAccount }
}

function vendor(autoProvisionsAccount: boolean): Pick<GatekeeperVendorInfo, 'id' | 'description'> {
  return {
    id: 'http-gatekeeper',
    description: {
      displayName: 'HTTP Gatekeeper',
      url: 'https://http-gatekeeper.example.test',
      autoProvisionsAccount,
    },
  }
}

describe('startAccountConnection', () => {
  it('provisions ambient vendors without starting an authorization flow', async () => {
    const { authenticatedApi, connectAccount, provisionAmbientAccount } = fakeApi()

    await expect(startAccountConnection(authenticatedApi, vendor(true), [
      'http-gatekeeper://scope',
    ])).resolves.toEqual({ kind: 'provisioned' })

    expect(provisionAmbientAccount).toHaveBeenCalledWith('http-gatekeeper')
    expect(connectAccount).not.toHaveBeenCalled()
  })

  it('starts authorization for non-ambient vendors with the requested resources', async () => {
    const { authenticatedApi, connectAccount, provisionAmbientAccount } = fakeApi()

    await expect(startAccountConnection(authenticatedApi, vendor(false), [
      'https://docs.example.test/*',
    ])).resolves.toEqual({
      kind: 'authorization',
      url: 'https://accounts.example.test/authorize',
    })

    expect(connectAccount).toHaveBeenCalledWith('http-gatekeeper', [
      'https://docs.example.test/*',
    ])
    expect(provisionAmbientAccount).not.toHaveBeenCalled()
  })
})
