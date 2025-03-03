import { stringToLog } from '../../_shared/src/import-test'

export const handler = async () => {
  console.log('Syncer run...', stringToLog)
}
