#!/usr/bin/env node
// Print the English metadata for a localized template after editing a call site.
import { readFile } from "node:fs/promises";
import ts from "typescript";
const [file, key] = process.argv.slice(2);
if (file === undefined || key === undefined) throw new Error("Usage: node scripts/i18n-template.mjs <source.ts> <template-key>");
const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
let result;
function visit(node) {
  if (ts.isTaggedTemplateExpression(node) && ts.isCallExpression(node.tag)
    && ts.isIdentifier(node.tag.expression) && ["localizedTemplate", "localizedText"].includes(node.tag.expression.text)
    && ts.isStringLiteral(node.tag.arguments[0]) && node.tag.arguments[0].text === key) {
    const template = node.template;
    const strings = ts.isNoSubstitutionTemplateLiteral(template) ? [template.text] : [template.head.text, ...template.templateSpans.map((span) => span.literal.text)];
    let hash = 2166136261;
    const text = JSON.stringify(strings);
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
    result = {
      sourceHash: hash,
      valueCount: strings.length - 1,
      strings,
      order: Array.from({ length: strings.length - 1 }, (_, index) => index),
      expressions: ts.isNoSubstitutionTemplateLiteral(template) ? [] : template.templateSpans.map((span) => span.expression.getText(source)),
    };
  }
  ts.forEachChild(node, visit);
}
visit(source);
if (result === undefined) throw new Error(`Template ${key} was not found in ${file}`);
console.log(JSON.stringify(result, null, 2));
