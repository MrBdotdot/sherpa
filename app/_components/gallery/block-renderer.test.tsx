import { describe, it, expect } from "vitest";
import { renderBlockToString } from "./block-renderer";
import type { ContentBlock } from "@/app/_lib/authoring-types";

function block(partial: Partial<ContentBlock> & { type: ContentBlock["type"] }): ContentBlock {
  return { id: "b", value: "", ...partial };
}

describe("renderBlockToString", () => {
  it("renders a prose text block as <p>", () => {
    const html = renderBlockToString(block({ type: "text", value: "Hello world", blockFormat: "prose" }));
    expect(html).toBe('<p>Hello world</p>');
  });
  it("renders an h2 block as <h2>", () => {
    const html = renderBlockToString(block({ type: "text", value: "Setup", blockFormat: "h2" }));
    expect(html).toBe('<h2>Setup</h2>');
  });
  it("renders an h3 block as <h3>", () => {
    const html = renderBlockToString(block({ type: "text", value: "Detail", blockFormat: "h3" }));
    expect(html).toBe('<h3>Detail</h3>');
  });
  it("renders a bullets block as <ul><li>...", () => {
    const html = renderBlockToString(block({ type: "text", value: "alpha\nbeta\ngamma", blockFormat: "bullets" }));
    expect(html).toBe('<ul><li>alpha</li><li>beta</li><li>gamma</li></ul>');
  });
  it("renders a steps block as <ol><li>...", () => {
    const html = renderBlockToString(block({ type: "text", value: "first\nsecond", blockFormat: "steps" }));
    expect(html).toBe('<ol><li>first</li><li>second</li></ol>');
  });
  it("renders an image block with caption as <figure>", () => {
    const html = renderBlockToString(block({
      type: "image",
      value: "https://example.com/x.jpg",
      imageCaption: "A castle at dusk",
    }));
    expect(html).toContain('<figure>');
    expect(html).toContain('<img src="https://example.com/x.jpg" alt="A castle at dusk"');
    expect(html).toContain('<figcaption>A castle at dusk</figcaption>');
  });
  it("uses empty alt when no caption", () => {
    const html = renderBlockToString(block({ type: "image", value: "https://example.com/x.jpg" }));
    expect(html).toContain('alt=""');
    expect(html).not.toContain('<figcaption>');
  });
  it("escapes HTML in user-supplied text", () => {
    const html = renderBlockToString(block({ type: "text", value: "<script>x</script>", blockFormat: "prose" }));
    expect(html).toBe('<p>&lt;script&gt;x&lt;/script&gt;</p>');
  });
  it("returns empty string for unsupported block types", () => {
    expect(renderBlockToString(block({ type: "carousel", value: "" }))).toBe("");
    expect(renderBlockToString(block({ type: "video", value: "https://yt/x" }))).toBe("");
    expect(renderBlockToString(block({ type: "tabs", value: "" }))).toBe("");
  });
  it("skips blank list items", () => {
    const html = renderBlockToString(block({ type: "text", value: "alpha\n\nbeta\n", blockFormat: "bullets" }));
    expect(html).toBe('<ul><li>alpha</li><li>beta</li></ul>');
  });
  it("blocks image blocks with unsafe src protocols", () => {
    expect(renderBlockToString(block({ type: "image", value: "javascript:alert(1)" }))).toBe("");
    expect(renderBlockToString(block({ type: "image", value: "vbscript:x" }))).toBe("");
    expect(renderBlockToString(block({ type: "image", value: "file:///etc/passwd" }))).toBe("");
  });
  it("allows http, https, data:image, and root-relative image src", () => {
    expect(renderBlockToString(block({ type: "image", value: "http://example.com/a.jpg" }))).toContain("<figure>");
    expect(renderBlockToString(block({ type: "image", value: "https://example.com/a.jpg" }))).toContain("<figure>");
    expect(renderBlockToString(block({ type: "image", value: "data:image/png;base64,iVBORw0KGgo=" }))).toContain("<figure>");
    expect(renderBlockToString(block({ type: "image", value: "/local/path.jpg" }))).toContain("<figure>");
  });
});
