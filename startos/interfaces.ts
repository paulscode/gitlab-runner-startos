import { sdk } from './sdk'

/**
 * None. The runner makes outbound long-polls to GitLab and accepts no inbound
 * connections, so there is nothing to expose and no port to bind.
 */
export const setInterfaces = sdk.setupInterfaces(async () => [])
