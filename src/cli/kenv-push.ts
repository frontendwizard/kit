// Description: Git Push Kenv Repo

import {
  getLastSlashSeparated,
  getKenvs,
} from "../core/utils.js"

let dir = await arg(
  "Push which kenv",
  (
    await getKenvs()
  ).map(value => ({
    name: getLastSlashSeparated(value, 1),
    value,
  }))
)

cd(dir)
await exec(`git add .`)
await exec(`git commit -m "pushed from Script Kit"`)
await exec(`git push`)

await getScripts(false)

await mainScript()

// Prompt if stash exists to re-apply changes

export {}
