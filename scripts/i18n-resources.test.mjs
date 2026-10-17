import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { runtimeCopies, syncI18nRuntimes } from "./i18n-sync.mjs";

const roots = ["src/shared", ...runtimeCopies];
const repo = resolve(".");
async function readResource(file) {
  const source = await readFile(file, "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}
function hashStrings(strings) {
  let hash = 2166136261;
  const source = JSON.stringify(strings);
  for (let index = 0; index < source.length; index++) hash = Math.imul(hash ^ source.charCodeAt(index), 16777619) >>> 0;
  return hash;
}
async function* sourceFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "locales") continue;
    const file = join(directory, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(file);
    else if (file.endsWith(".ts") && !file.endsWith(".test.ts")) yield file;
  }
}

describe("locale resources", () => {
  it("keeps standalone plugin translation runtimes in sync with the canonical runtime", async () => {
    await syncI18nRuntimes(true);
  });

  it("has complete string catalogs and validates every template against the English call site", async () => {
    const resources = new Map();
    for (const root of roots) {
      const en = await readResource(join(root, "locales/en.ts"));
      const zh = await readResource(join(root, "locales/zh-CN.ts"));
      expect(Object.keys(zh.messages).sort(), root).toEqual(Object.keys(en.messages).sort());
      resources.set(resolve(root), zh);
    }
    const errors = [];
    let validated = 0;
    for (const directory of ["src/client/src", "pi-web-plugins", "pi-packages/relays", "pi-packages/workflows"]) {
      for await (const file of sourceFiles(directory)) {
        const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
        const imports = source.statements.filter(ts.isImportDeclaration);
        const localeImport = imports.find((node) => ts.isStringLiteral(node.moduleSpecifier) && /(?:^|\/)i18n(?:\.js)?$/.test(node.moduleSpecifier.text));
        if (localeImport === undefined) continue;
        const resourceRoot = dirname(resolve(dirname(file), localeImport.moduleSpecifier.text));
        const catalog = resources.get(resourceRoot);
        function visit(node) {
          if (ts.isTaggedTemplateExpression(node) && ts.isCallExpression(node.tag) && ts.isIdentifier(node.tag.expression)
            && ["localizedTemplate", "localizedText"].includes(node.tag.expression.text)) {
            const keyNode = node.tag.arguments[0];
            const key = ts.isStringLiteral(keyNode) ? keyNode.text : undefined;
            const record = catalog?.templates[key];
            const template = node.template;
            const strings = ts.isNoSubstitutionTemplateLiteral(template) ? [template.text] : [template.head.text, ...template.templateSpans.map((span) => span.literal.text)];
            const count = strings.length - 1;
            if (record === undefined || record.sourceHash !== hashStrings(strings) || record.valueCount !== count
              || record.strings.length !== record.order.length + 1 || record.order.some((index) => !Number.isInteger(index) || index < 0 || index >= count)) {
              errors.push(`${relative(repo, resolve(file))}: ${key ?? "missing key"}`);
            }
            validated += 1;
          }
          ts.forEachChild(node, visit);
        }
        visit(source);
      }
    }
    expect(errors).toEqual([]);
    expect(validated).toBeGreaterThan(500);
  });

  it("keeps plain-transpiled plugin locale imports inside their browser roots", async () => {
    for (const root of ["pi-web-plugins/git/browser", "pi-packages/workflows/browser"]) {
      for await (const file of sourceFiles(root)) {
        const source = await readFile(file, "utf8");
        for (const match of source.matchAll(/from\s+["']([^"']*i18n[^"']*)["']/g)) {
          const target = resolve(dirname(file), match[1]);
          expect(relative(resolve(root), target).startsWith(".."), file).toBe(false);
        }
      }
    }
  });
});
