// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { promptClipboardMarkdown } from "./promptClipboardLinks";

describe("clipboard links", () => {
  it("preserves web and mail links and separates paragraphs", () => {
    expect(promptClipboardMarkdown('<p>Read <a href="https://example.com/docs?q=1">the docs</a>.</p><p><a href="mailto:hello@example.com">Mail us</a></p>'))
      .toBe("Read [the docs](<https://example.com/docs?q=1>).\n\n[Mail us](<mailto:hello@example.com>)");
  });

  it("keeps unsafe or relative anchors as text while preserving allowed links", () => {
    expect(promptClipboardMarkdown('<a href="javascript:alert(1)">bad</a> <a href="data:text/html,hello">data</a> <a href="/relative">relative</a> <a href="https://example.com">safe</a><script>secret</script>'))
      .toBe("bad data relative [safe](<https://example.com/>)");
  });

  it("leaves ordinary plain text and markup without supported links to native paste", () => {
    expect(promptClipboardMarkdown("<p>just text</p>")).toBeUndefined();
    expect(promptClipboardMarkdown('<a href="file:///private/path">local</a>')).toBeUndefined();
  });

  it("escapes Markdown labels and destination angle brackets", () => {
    expect(promptClipboardMarkdown('<a href="https://example.com/a(b)?q=&lt;tag&gt;">[label] \\ path</a>'))
      .toBe("[\\[label\\] \\\\ path](<https://example.com/a(b)?q=%3Ctag%3E>)");
  });
});
