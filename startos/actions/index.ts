import { sdk } from '../sdk'
import { configure } from './configure'
import { customRunner } from './customRunner'

export const actions = sdk.Actions.of()
  .addAction(configure)
  .addAction(customRunner)
