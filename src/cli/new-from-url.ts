// Description: Creates a script from an entered url

import { exists, stripMetadata } from "../core/utils.js"
import { prependImport } from "./lib/utils.js"

let url = await arg("Enter script url:")

let contents = (await get<any>(url)).data
if (!arg?.keepMetadata) contents = stripMetadata(contents)

if (url.endsWith(".js")) {
  let nameFromUrl = url.split("/").pop().replace(".js", "")
  updateArgs([nameFromUrl])
}

let name = await arg({
  placeholder: "Enter a name for your script:",
  validate: exists,
})

let scriptPath = path.join(
  kenvPath("scripts"),
  name + ".js"
)

contents = prependImport(contents)
await writeFile(scriptPath, contents)

await cli("create-bin", "scripts", name)

edit(scriptPath, kenvPath())

export {}
