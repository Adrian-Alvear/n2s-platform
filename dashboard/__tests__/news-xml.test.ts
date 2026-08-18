import { describe, expect, it } from "vitest";
import { extractImage, extractLink, extractTag, parseItems } from "@/app/api/news/route";

// The hand-rolled RSS/Atom XML helpers that sit next to cleanText(). These are
// regex-based, not a real parser, so several of their limits are load-bearing
// quirks — documented here rather than fixed.

describe("extractTag", () => {
  it("reads a plain tag body", () => {
    expect(extractTag("<title>Hello</title>", "title")).toBe("Hello");
  });

  it("prefers the CDATA body and unwraps it", () => {
    expect(extractTag("<title><![CDATA[ Hello ]]></title>", "title")).toBe("Hello");
  });

  it("ignores attributes on the opening tag", () => {
    expect(extractTag('<title type="text">Hi</title>', "title")).toBe("Hi");
  });

  it("trims surrounding whitespace", () => {
    expect(extractTag("<title>\n  Spaced  \n</title>", "title")).toBe("Spaced");
  });

  it("reads namespaced tags", () => {
    expect(extractTag("<dc:creator>Ada</dc:creator>", "dc:creator")).toBe("Ada");
    expect(extractTag("<content:encoded><![CDATA[body]]></content:encoded>", "content:encoded")).toBe(
      "body",
    );
  });

  it("returns the first match when the tag repeats", () => {
    expect(extractTag("<title>A</title><title>B</title>", "title")).toBe("A");
  });

  it("is case-insensitive", () => {
    expect(extractTag("<TITLE>A</TITLE>", "title")).toBe("A");
  });

  it("returns an empty string when the tag is absent", () => {
    expect(extractTag("<other>x</other>", "title")).toBe("");
  });

  it("does not match a tag that merely ends with the name", () => {
    expect(extractTag("<subtitle>x</subtitle>", "title")).toBe("");
  });
});

describe("extractLink", () => {
  it("prefers an Atom href attribute", () => {
    expect(extractLink('<link rel="alternate" href="https://a.example.com/x"/>')).toBe(
      "https://a.example.com/x",
    );
  });

  it("falls back to feedburner:origLink", () => {
    expect(extractLink("<feedburner:origLink>https://b.example.com/y</feedburner:origLink>")).toBe(
      "https://b.example.com/y",
    );
  });

  it("reads a standard RSS <link> body", () => {
    expect(extractLink("<link>https://c.example.com/z</link>")).toBe("https://c.example.com/z");
  });

  it("reads a <link> body that starts on the next line", () => {
    expect(extractLink("<link>\n  https://d.example.com/w\n</link>")).toBe(
      "https://d.example.com/w",
    );
  });

  it("falls back to an http guid when the link is empty", () => {
    expect(extractLink('<link></link><guid isPermaLink="true">https://e.example.com/1</guid>')).toBe(
      "https://e.example.com/1",
    );
  });

  it("ignores a guid that is not a URL", () => {
    expect(extractLink("<guid>tag:example.com,2026:1</guid>")).toBe("");
  });

  it("returns an empty string when there is nothing to find", () => {
    expect(extractLink("<item><title>no link</title></item>")).toBe("");
  });

  it("prefers the Atom href over an RSS <link> body", () => {
    const xml = '<link href="https://atom.example.com/a"/><link>https://rss.example.com/b</link>';
    expect(extractLink(xml)).toBe("https://atom.example.com/a");
  });
});

describe("extractImage", () => {
  it("prefers media:content", () => {
    const xml =
      '<media:content url="https://img.example.com/a.jpg"/><media:thumbnail url="https://img.example.com/b.jpg"/>';
    expect(extractImage(xml)).toBe("https://img.example.com/a.jpg");
  });

  it("falls back to media:thumbnail", () => {
    expect(extractImage('<media:thumbnail url="https://img.example.com/b.jpg"/>')).toBe(
      "https://img.example.com/b.jpg",
    );
  });

  it("reads an enclosure when url comes before type", () => {
    expect(
      extractImage('<enclosure url="https://img.example.com/c.jpg" type="image/jpeg"/>'),
    ).toBe("https://img.example.com/c.jpg");
  });

  it("misses an enclosure whose type attribute comes before url", () => {
    // Quirk: the regex hard-codes the url-then-type attribute order.
    expect(
      extractImage('<enclosure type="image/jpeg" url="https://img.example.com/c.jpg"/>'),
    ).toBe("");
  });

  it("falls back to an absolute <img> src", () => {
    expect(extractImage('<p><img src="https://img.example.com/d.jpg" alt="x"></p>')).toBe(
      "https://img.example.com/d.jpg",
    );
  });

  it("ignores a relative <img> src", () => {
    expect(extractImage('<img src="/local/e.jpg">')).toBe("");
  });

  it("returns an empty string when there is no image", () => {
    expect(extractImage("<item><title>no image</title></item>")).toBe("");
  });
});

const item = (inner: string) => `<rss><channel><item>${inner}</item></channel></rss>`;

describe("parseItems", () => {
  it("maps an RSS item onto a NewsItem", () => {
    const xml = item(`
      <title>Anthropic ships something</title>
      <link>https://news.example.com/1</link>
      <pubDate>Mon, 17 Aug 2026 10:00:00 GMT</pubDate>
      <description><![CDATA[<p>A <b>short</b> summary.</p>]]></description>
      <dc:creator>Ada Lovelace</dc:creator>
      <media:content url="https://img.example.com/1.jpg"/>
    `);
    expect(parseItems(xml, "Example Feed")).toEqual([
      {
        title: "Anthropic ships something",
        link: "https://news.example.com/1",
        pubDate: "Mon, 17 Aug 2026 10:00:00 GMT",
        description: "A short summary.",
        content: "A short summary.",
        source: "Example Feed",
        image: "https://img.example.com/1.jpg",
        author: "Ada Lovelace",
      },
    ]);
  });

  it("prefers an item's own <source> over the feed source", () => {
    const xml = item(
      '<title>Headline</title><source url="https://n.example.com">Reuters</source>',
    );
    expect(parseItems(xml, "Google News")[0].source).toBe("Reuters");
  });

  it("strips the trailing ' - Source' suffix Google News appends to titles", () => {
    const xml = item(
      '<title>Big story - Reuters</title><source url="https://n.example.com">Reuters</source>',
    );
    expect(parseItems(xml, "Google News")[0].title).toBe("Big story");
  });

  it("leaves the suffix alone when the item has no <source>", () => {
    const xml = item("<title>Big story - Reuters</title>");
    expect(parseItems(xml, "Google News")[0].title).toBe("Big story - Reuters");
  });

  it("skips items with no usable title", () => {
    const xml = `<channel>${item("<title></title><link>https://a.example.com</link>")}${item(
      "<title>Kept</title>",
    )}</channel>`;
    expect(parseItems(xml, "Feed").map((i) => i.title)).toEqual(["Kept"]);
  });

  it("skips titles beginning with 'http', including non-URL ones", () => {
    // Quirk: a real URL title is already emptied by cleanText, so this guard
    // only ever fires on plain words that happen to start with "http".
    const xml = `<channel>${item("<title>httpd 2.5 released</title>")}${item(
      "<title>Kept</title>",
    )}</channel>`;
    expect(parseItems(xml, "Feed").map((i) => i.title)).toEqual(["Kept"]);
  });

  it("returns at most 8 items", () => {
    const xml = Array.from({ length: 12 }, (_, i) => item(`<title>Story ${i}</title>`)).join("");
    const items = parseItems(xml, "Feed");
    expect(items).toHaveLength(8);
    expect(items[7].title).toBe("Story 7");
  });

  it("returns an empty array for XML with no items", () => {
    expect(parseItems("<rss><channel></channel></rss>", "Feed")).toEqual([]);
  });

  it("truncates the description to 220 characters", () => {
    const xml = item(`<title>Long</title><description>${"x".repeat(400)}</description>`);
    expect(parseItems(xml, "Feed")[0].description).toHaveLength(220);
  });

  it("truncates content to 3000 characters and flattens its line breaks", () => {
    // Quirk: <br> and </p> are turned into newlines, but cleanText's final
    // whitespace collapse immediately flattens them back into single spaces.
    const xml = item(
      `<title>Long</title><content:encoded><![CDATA[<p>one</p><p>two</p>]]></content:encoded>`,
    );
    const [parsed] = parseItems(xml, "Feed");
    expect(parsed.content).toBe("one two");

    const big = item(
      `<title>Big</title><content:encoded><![CDATA[${"y".repeat(4000)}]]></content:encoded>`,
    );
    expect(parseItems(big, "Feed")[0].content).toHaveLength(3000);
  });

  it("falls back to the description when there is no content", () => {
    const xml = item("<title>T</title><description>Just a summary</description>");
    const [parsed] = parseItems(xml, "Feed");
    expect(parsed.content).toBe("Just a summary");
  });

  it("drops a leading 'by ' from the author", () => {
    const xml = item("<title>T</title><author>By Ada Lovelace</author>");
    expect(parseItems(xml, "Feed")[0].author).toBe("Ada Lovelace");
  });

  it("finds an image inside the content when the item has no media tag", () => {
    const xml = item(
      '<title>T</title><content:encoded><![CDATA[<img src="https://img.example.com/in.jpg">]]></content:encoded>',
    );
    expect(parseItems(xml, "Feed")[0].image).toBe("https://img.example.com/in.jpg");
  });
});
