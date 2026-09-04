import type { RpcStub } from 'capnweb'
import type { AuthenticatedApi, GatekeeperVendorInfo } from '@gadgets/workshop-shared/api'

type ConnectableVendor = Pick<GatekeeperVendorInfo, 'id' | 'description'>

export type AccountConnectionStart =
  | { kind: 'provisioned' }
  | { kind: 'authorization', url: string }

/**
 * Start the connection flow advertised by a vendor. Ambient vendors mint the account directly;
 * every other vendor returns an authorization URL for the caller to open.
 */
export async function startAccountConnection(
  authenticatedApi: RpcStub<AuthenticatedApi>,
  vendor: ConnectableVendor,
  resourceUrlPatterns?: string[],
): Promise<AccountConnectionStart> {
  if (vendor.description.autoProvisionsAccount) {
    await authenticatedApi.provisionAmbientAccount(vendor.id)
    return { kind: 'provisioned' }
  }

  const { url } = await authenticatedApi.connectAccount(vendor.id, resourceUrlPatterns)
  return { kind: 'authorization', url }
}
