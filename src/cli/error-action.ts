//Description: An error has occurred

import { ErrorAction } from "../enums.js"
import { getLastSlashSeparated } from "../utils.js"

let script = await arg()
let stackFile = await arg()
let errorFile = await arg()
let line = await arg()
let col = await arg()

let stack = await readFile(stackFile, "utf-8")

let errorLog = `${getLastSlashSeparated(
  errorFile,
  1
).replace(/\.js$/, "")}.log`
let errorLogPath = kenvPath("logs", errorLog)

let errorActions: {
  [key in ErrorAction]: () => Promise<void>
} = {
  [ErrorAction.Open]: async () => {
    edit(errorFile, kenvPath(), line, col)
  },
  [ErrorAction.KitLog]: async () => {
    edit(kitPath("logs", "kit.log"), kenvPath())
  },
  [ErrorAction.Log]: async () => {
    edit(errorLogPath, kenvPath())
  },
  [ErrorAction.Ask]: async () => {
    copy(stack)
    exec(
      `open "https://github.com/johnlindquist/kit/discussions/categories/errors"`
    )
  },
}

let errorAction: ErrorAction = await arg(
  {
    placeholder: `🤕 Error in ${script}`,
    hint: `<div class="font-mono text-xs">${stack
      .split("\n")
      .map(line => `<p>${line}</p>`)
      .join("")}<div>`,
    ignoreBlur: true,
  },
  [
    {
      name: `Open ${script} in editor`,
      value: ErrorAction.Open,
    },
    {
      name: `Open ${errorLog} in editor`,
      value: ErrorAction.Log,
    },
    {
      name: `Open log kit.log in editor`,
      value: ErrorAction.Log,
    },
    {
      name: `Ask for help on forum`,
      description: `Copy error to clipboard and open discussions in browser`,
      value: ErrorAction.Ask,
    },
  ]
)

await errorActions[errorAction]()

export {}
