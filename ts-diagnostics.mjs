import ts from 'typescript'
import { writeFileSync } from 'node:fs'

const configPath = ts.findConfigFile('.', ts.sys.fileExists, 'tsconfig.app.json')
const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, '.')
const program = ts.createProgram(config.fileNames, config.options)
const diagnostics = ts.getPreEmitDiagnostics(program)
const formatted = diagnostics.map(diagnostic => ({
  file: diagnostic.file?.fileName ?? null,
  line: diagnostic.file && diagnostic.start !== undefined
    ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1
    : null,
  message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
}))
writeFileSync('ts-diagnostics.json', JSON.stringify(formatted, null, 2))
process.exitCode = diagnostics.some(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error) ? 2 : 0
