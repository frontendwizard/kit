import { Channel } from "../core/enum"
import { Choice } from "../types/core"

let kitAppDb = await db<{ KENVS: Choice[] }>({
  key: kitPath("db", "app.json"),
})

let kenv = await arg(
  {
    placeholder: `Select kenv`,
    hint: `Current Kenv: ${process.env.KENV}`,
  },
  kitAppDb.KENVS
)

global.send(Channel.SWITCH_KENV, kenv)

export {}
