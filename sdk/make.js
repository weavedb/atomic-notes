import { writeFileSync, readFileSync } from "fs"
import { resolve } from "path"

const packageJson = resolve(import.meta.dirname, "package.json")
const packageJsonDist = resolve(import.meta.dirname, "dist/package.json")
const json = JSON.parse(readFileSync(packageJson, "utf8"))
delete json.type
delete json.devDependencies
delete json.scripts
json.main = "cjs/index.js"
json.module = "esm/index.js"

console.log(json)
writeFileSync(packageJsonDist, JSON.stringify(json, undefined, 2))