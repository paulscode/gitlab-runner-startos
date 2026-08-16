import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

/**
 * Create the store on first install so everything downstream -- action
 * metadata included, which is evaluated during init -- reads a real object
 * rather than deciding against an absent one.
 */
export const seedStore = sdk.setupOnInit(async (effects) => {
  const existing = await storeJson.read().const(effects)
  if (existing) return

  await storeJson.merge(
    effects,
    {
      token: '',
      useLocalGitlab: true,
      externalUrl: '',
      name: 'startos-runner',
      concurrent: 1,
      defaultImage: 'alpine:latest',
    },
    { allowWriteAfterConst: true },
  )
})
