import { LangDict } from './default'

// English only. Each locale here must translate every key in default.ts, so a
// partial contribution will not compile; complete locale blocks are welcome.
export default {} satisfies Record<string, LangDict>
