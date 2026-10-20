// Browser-only CSS regression check; happy-dom cannot measure layout.
// Uses the production chatStyles and ChatView's message/header DOM structure.
// This isolates bubble geometry, not Lit rendering or message-action behavior.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node test-fixtures/mobile-message-layout.mjs
// Optional: CHROMIUM_EXECUTABLE_PATH, CHAT_STYLES_PATH (for a pre-fix comparison), SCREENSHOT_DIR.
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const source = await readFile(process.env.CHAT_STYLES_PATH ?? new URL("../src/client/src/components/shared.ts", import.meta.url), "utf8");
const styles = source.match(/export const chatStyles = css`([\s\S]*?)`;/)?.[1];
assert(styles, "Production chatStyles must be present");
assert(!styles.includes("${"), "chatStyles now has interpolations; load it through Lit instead of extracting the static CSS");
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}),
});

try {
  for (const hasTouch of [false, true]) {
    const context = await browser.newContext({ hasTouch });
    const page = await context.newPage();
    for (const width of [355, 320, 390, 430, 760, 761, 1280]) {
      await page.setViewportSize({ width, height: 664 });
      await page.setContent('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><body style="margin:0"><div id="host"></div></body>');
      await page.evaluate(({ styles }) => {
        const host = document.querySelector("#host");
        host.style.cssText = "height:100vh;background:var(--pi-bg);--pi-bg:#1e1e1e;--pi-surface:#282828;--pi-text:#ddd;--pi-muted:#999;--pi-dim:#999;--pi-text-secondary:#bbb;--pi-border-muted:#444;--pi-font-family:Arial,sans-serif";
        const root = host.attachShadow({ mode: "open" });
        const header = `<div class="msg-header"><b class="label">你</b><div class="msg-header-trailing"><div class="msg-actions" aria-label="Message actions">${["Fork", "Go back", "Copy"].map(label => `<button class="msg-action" aria-label="${label}">↶</button>`).join("")}</div><span class="msg-meta" role="button" tabindex="0">2026年10月20日 13:37:50</span></div></div>`;
        root.innerHTML = `<style>${styles}</style><div class="chat-wrap"><div class="chat">
          <article class="msg user" id="short">${header}<formatted-text class="part">用英文介绍一下你自己</formatted-text></article>
          <article class="msg user" id="long">${header.replace("13:37:50", "13:37:50 · provider/long-model-name")}<formatted-text class="part">${"A long user message that wraps on a narrow screen. ".repeat(100)}</formatted-text></article>
          <article class="msg assistant">${header}<formatted-text class="part">Assistant response.</formatted-text></article>
          <details class="msg event-group" open><summary>处理过程</summary><div class="group-body"><section class="group-msg assistant">${header}<formatted-text class="part">Thinking</formatted-text></section></div></details>
          <article class="msg tool-execution-shell">Tool execution</article>
          <article class="msg ask-user-record-shell">Question record</article>
        </div></div>`;
      }, { styles });

      if (process.env.SCREENSHOT_DIR && width === 355 && !hasTouch) {
        await mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
        await page.locator("#short").hover();
        await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, "mobile-message-355.png") });
      }

      for (const expanded of [false, true]) {
        const measurements = await page.evaluate(expanded => {
          const root = document.querySelector("#host").shadowRoot;
          root.querySelectorAll(".msg-meta").forEach(meta => meta.classList.toggle("expanded", expanded));
          return [...root.querySelectorAll(".msg > .msg-header")].map(header => {
            const message = header.parentElement;
            const box = message.getBoundingClientRect();
            const head = header.getBoundingClientRect();
            const body = message.querySelector(".part").getBoundingClientRect();
            const label = header.querySelector(".label").getBoundingClientRect();
            const style = getComputedStyle(message);
            return {
              left: head.left - box.left - parseFloat(style.borderLeftWidth),
              right: box.right - head.right - parseFloat(style.borderRightWidth),
              contentAlignment: label.left - body.left,
              messagePadding: parseFloat(style.paddingLeft),
              headerPadding: parseFloat(getComputedStyle(header).paddingLeft),
              overflow: style.overflow,
              position: getComputedStyle(header).position,
              controlsContained: [...header.querySelectorAll(".msg-action, .msg-meta")].every(control => {
                const rect = control.getBoundingClientRect();
                return rect.left >= box.left && rect.right <= box.right;
              }),
            };
          });
        }, expanded);
        for (const result of measurements) {
          const label = `${width}px touch=${hasTouch} expanded=${expanded}: ${JSON.stringify(result)}`;
          assert(Math.abs(result.left) < 0.1 && Math.abs(result.right) < 0.1, `Header must align with the bubble's inner border, ${label}`);
          assert(Math.abs(result.contentAlignment) < 0.1, `Header label and message content must align, ${label}`);
          assert.equal(result.messagePadding, width <= 760 ? 8 : 16, label);
          assert.equal(result.headerPadding, result.messagePadding, label);
          assert.equal(result.overflow, "visible", "Do not hide the overflow to mask the mismatch and break sticky headers");
          assert.equal(result.position, "sticky");
          assert(result.controlsContained, `Header controls must remain inside the bubble, ${label}`);
        }
      }

      const scrolling = await page.evaluate(async () => {
        const root = document.querySelector("#host").shadowRoot;
        const chat = root.querySelector(".chat");
        const message = root.querySelector("#long");
        const header = message.querySelector(".msg-header");
        chat.scrollTop += message.getBoundingClientRect().top - chat.getBoundingClientRect().top + 100;
        await new Promise(requestAnimationFrame);
        const top = header.getBoundingClientRect().top;
        chat.scrollTop += 40;
        await new Promise(requestAnimationFrame);
        const shells = [...root.querySelectorAll(".tool-execution-shell, .ask-user-record-shell, .event-group")];
        return {
          top, nextTop: header.getBoundingClientRect().top,
          scrollTop: chat.scrollTop,
          shellsUnpadded: shells.every(shell => getComputedStyle(shell).paddingLeft === "0px"),
        };
      });
      assert(scrolling.scrollTop > 0, "Long-message fixture must scroll");
      assert(Math.abs(scrolling.top - scrolling.nextTop) < 0.1, "Header must remain sticky while scrolling a long message");
      assert(scrolling.shellsUnpadded, "Special message shells must retain zero padding");
      console.log(`PASS ${width}px touch=${hasTouch}: bubble edges, text alignment, metadata, controls, sticky header, special shells`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
