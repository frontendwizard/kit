import * as path from "path"
import {
  appDbPath,
  kitPath,
  kenvPath,
  mainScriptPath,
  prefsPath,
  promptDbPath,
  shortcutsPath,
  isDir,
  extensionRegex,
  resolveScriptToCommand,
  parseScripts,
  isMac,
} from "./utils.js"
import { Choice, Script, PromptDb } from "../types/core"
import {
  Low,
  JSONFile,
} from "@johnlindquist/kit-internal/lowdb"

export const resolveKenv = (...parts: string[]) => {
  if (global.kitScript) {
    return path.resolve(
      global.kitScript,
      "..",
      "..",
      ...parts
    )
  }

  return kenvPath(...parts)
}

export async function arrayDb<T>({
  key = "_" + resolveScriptToCommand(global.kitScript),
  defaults = [] as T[],
  fromCache = true,
}: {
  key?: string
  defaults?: T[] | (() => Promise<T[]>)
  fromCache?: boolean
}) {
  let dbPath = key
  if (!key.endsWith(".json")) {
    dbPath = resolveKenv("db", `${key}.json`)
  }

  let parentExists = await isDir(path.dirname(dbPath))
  if (!parentExists) {
    console.warn(
      `Couldn't find ${path.dirname(
        dbPath
      )}. Returning defaults...`
    )

    return {
      items: defaults,
      write: () => {},
    }
  }

  let _db = new Low<{ items: T[] }>(new JSONFile(dbPath))

  await _db.read()

  const isFunction = (
    defaults: T[] | (() => Promise<T[]>)
  ): defaults is () => Promise<T[]> =>
    typeof defaults === "function"

  if (!_db.data || !fromCache) {
    let getData = async () => {
      if (isFunction(defaults)) {
        let data = await defaults()
        if (Array.isArray(data)) return { items: data }

        return data
      }

      return { items: defaults }
    }

    _db.data = await getData()

    await _db.write()
  }

  return new Proxy<Low<{ items: T[] }>>(
    {} as Low<{ items: T[] }>,
    {
      get: (_target, k: string) => {
        if (k === "then") return _db
        let d = _db
        if (d[k]) {
          return typeof d[k] === "function"
            ? d[k].bind(d)
            : d[k]
        }
        return _db?.data?.[k]
      },
      set: (target: any, key: string, value: any) => {
        try {
          _db.data[key] = value
          return true
        } catch (error) {
          return false
        }
      },
    }
  )
}

global.arrayDb = arrayDb

export async function db<T extends object>({
  key = "_" + resolveScriptToCommand(global.kitScript),
  defaults = {} as T,
  fromCache = true,
}: {
  key?: string
  defaults?: T | (() => Promise<T>)
  fromCache?: boolean
}) {
  let dbPath = key
  if (!key.endsWith(".json")) {
    dbPath = resolveKenv("db", `${key}.json`)
  }

  let parentExists = await isDir(path.dirname(dbPath))
  if (!parentExists) {
    console.warn(
      `Couldn't find ${path.dirname(
        dbPath
      )}. Returning defaults...`
    )

    return {
      ...defaults,
      write: () => {},
    } as Low<T> & T
  }

  let _db = new Low<T>(new JSONFile(dbPath))

  await _db.read()

  const isFunction = (
    defaults: T | (() => Promise<T>)
  ): defaults is () => Promise<T> =>
    typeof defaults === "function"

  if (!_db.data || !fromCache) {
    let getData = async () => {
      if (isFunction(defaults)) return defaults()
      return defaults
    }

    _db.data = await getData()

    await _db.write()
  }

  return new Proxy<Low<T> & T>({} as Low<T> & T, {
    get: (_target, k: string) => {
      if (k === "then") return _db
      let d = _db
      if (d[k]) {
        return typeof d[k] === "function"
          ? d[k].bind(d)
          : d[k]
      }
      return _db?.data?.[k]
    },
    set: (target: any, key: string, value: any) => {
      try {
        _db.data[key] = value
        return true
      } catch (error) {
        return false
      }
    },
  })
}

global.db = db

export let getScriptsDb = async (fromCache = true) => {
  // if (!fromCache) console.log(`🔄 Refresh scripts db`)
  const scripts = await parseScripts()
  return db<{ scripts: typeof scripts }>({
    key: kitPath("db", "scripts.json"),
    defaults: { scripts },
    fromCache,
  })
}

export let refreshScriptsDb = async () => {
  await getScriptsDb(false)
}

export let getPrefs = async () => {
  return await db({ key: kitPath("db", "prefs.json") })
}

export let getScriptFromString = async (
  script: string
): Promise<Script> => {
  let { scripts } = await getScriptsDb()

  if (!script.includes(path.sep)) {
    let result = scripts.find(
      s =>
        s.name === script ||
        s.command === script.replace(extensionRegex, "")
    )

    if (!result) {
      throw new Error(
        `Cannot find script based on name or command: ${script}`
      )
    }

    return result
  }

  if (script.startsWith(path.sep)) {
    let result = scripts.find(s => s.filePath === script)

    if (!result) {
      throw new Error(
        `Cannot find script based on path: ${script}`
      )
    }

    return result
  }

  throw new Error(
    `Cannot find script: ${script}. Input should either be the "command-name" of the "/path/to/the/script"`
  )
}

export let getScripts = async (fromCache = true) =>
  (await getScriptsDb(fromCache)).scripts
export interface ScriptValue {
  (pluck: keyof Script, fromCache?: boolean): () => Promise<
    Choice<string>[]
  >
}

export let scriptValue: ScriptValue =
  (pluck, fromCache) => async () => {
    let menuItems: Script[] = await getScripts(fromCache)

    return menuItems.map((script: Script) => ({
      ...script,
      value: script[pluck],
    }))
  }

type AppDb = {
  needsRestart: boolean
  version: string
  openAtLogin: boolean
  previewScripts: boolean
  autoUpdate: boolean
  tray: boolean
}

export const appDefaults = {
  needsRestart: false,
  version: "0.0.0",
  autoUpdate: true,
  tray: true,
  openAtLogin: true,
  previewScripts: false,
}

export let getAppDb = async () => {
  return await db<AppDb>({
    key: appDbPath,
    defaults: appDefaults,
  })
}

type ShortcutsDb = {
  shortcuts: {
    [key: string]: string
  }
}
export let getShortcutsDb = async () => {
  return await db<ShortcutsDb>({
    key: shortcutsPath,
    defaults: {
      shortcuts: {
        [mainScriptPath]: isMac ? "cmd ;" : "ctrl ;",
      },
    },
  })
}

type PrefsDb = {
  showJoin: boolean
}
export let getPrefsDb = async () => {
  return await db<PrefsDb>({
    key: prefsPath,
    defaults: { showJoin: true },
  })
}

export let getPromptDb = async () => {
  return await db<PromptDb>({
    key: promptDbPath,
    defaults: {
      screens: {},
      clear: false,
    },
  })
}
