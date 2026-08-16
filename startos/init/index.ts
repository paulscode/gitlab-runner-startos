import { sdk } from '../sdk'
import { setDependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { versionGraph } from '../versions'
import { actions } from '../actions'
import { restoreInit } from '../backups'
import { seedStore } from './seedStore'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  // Before `actions`: action metadata is evaluated here, once, so anything
  // that reads the store must find it already present.
  seedStore,
  setInterfaces,
  setDependencies,
  actions,
)

export const uninit = sdk.setupUninit(versionGraph)
