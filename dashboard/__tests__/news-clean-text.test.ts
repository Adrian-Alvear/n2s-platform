import { describe, expect, it } from "vitest";
import { cleanText } from "@/app/api/news/route";

// cleanText() is the two-pass HTML/entity stripper described in CLAUDE.md: it
// strips tags, decodes entities, then strips again to catch tags that were
// hiding behind entities (Google News escapes HTML instead of using CDATA).
// These tests describe what it does today, quirks included.

describe("cleanText — pass 1 (plain HTML)", () => {
  it("strips plain tags and keeps the text", () => {
    expect(cleanText("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("removes script blocks including their contents", () => {
    expect(cleanText('<script>alert("hi")</script>Real text')).toBe("Real text");
  });

  it("removes style blocks including their contents", () => {
    expect(cleanText("<style>.a{color:red}</style>Body")).toBe("Body");
  });

  it("turns <br> variants into spaces", () => {
    expect(cleanText("Line one<br>Line two<br/>Line three<br />Line four")).toBe(
      "Line one Line two Line three Line four",
    );
  });

  it("turns closing block tags into spaces so words do not run together", () => {
    expect(cleanText("<li>a</li><li>b</li>")).toBe("a b");
    expect(cleanText("<p>one</p><p>two</p>")).toBe("one two");
    expect(cleanText("<tr>x</tr><tr>y</tr>")).toBe("x y");
  });

  it("unwraps nested tags", () => {
    expect(cleanText("<div><p>Deep <span><b>text</b></span></p></div>")).toBe("Deep text");
  });

  it("is case-insensitive about tag names", () => {
    expect(cleanText("<SCRIPT>bad()</SCRIPT><P>ok</P>")).toBe("ok");
  });
});

describe("cleanText — entity decoding", () => {
  it("decodes the named entities it knows", () => {
    expect(cleanText("Tom &amp; Jerry &quot;quoted&quot; &#39;a&#39; &apos;b&apos;&nbsp;end")).toBe(
      `Tom & Jerry "quoted" 'a' 'b' end`,
    );
  });

  it("replaces other numeric entities with a space rather than decoding them", () => {
    // Quirk: only &#39; is decoded by name; every other &#NN; becomes a space,
    // so accented characters written as numeric entities are lost.
    expect(cleanText("caf&#233;")).toBe("caf");
    expect(cleanText("it&#8217;s here")).toBe("it s here");
  });

  it("leaves unknown named entities alone", () => {
    expect(cleanText("a &copy; b")).toBe("a &copy; b");
  });
});

describe("cleanText — pass 2 (tags hiding behind entities)", () => {
  it("strips tags that only appear after entity decoding", () => {
    expect(cleanText("&lt;a href=&quot;http://x.com&quot;&gt;Click&lt;/a&gt; here")).toBe(
      "Click here",
    );
  });

  it("also strips double-escaped tags, because &amp; is decoded first", () => {
    // &amp;lt; -> &lt; -> < , so a second layer of escaping is stripped too.
    expect(cleanText("&amp;lt;b&amp;gt;bold&amp;lt;/b&amp;gt;")).toBe("bold");
  });

  it("does NOT remove the body of a script that was entity-escaped", () => {
    // Quirk: the script/style block removal only runs in pass 1, so an escaped
    // <script> loses its tags but keeps its contents as plain text.
    expect(cleanText("&lt;script&gt;evil()&lt;/script&gt;Safe")).toBe("evil()Safe");
  });

  it("strips an unclosed script tag but keeps the text after it", () => {
    // The block regex needs a closing tag; the generic tag strip catches the rest.
    expect(cleanText("<script>oops")).toBe("oops");
  });
});

describe("cleanText — final cleanup", () => {
  it("removes bare URLs", () => {
    expect(cleanText("Read more at https://example.com/article?x=1 now")).toBe("Read more at now");
    expect(cleanText("http://plain.example.com")).toBe("");
  });

  it("collapses whitespace and trims", () => {
    expect(cleanText("  a \n\n\t  b  ")).toBe("a b");
  });

  it("returns an empty string for empty input", () => {
    expect(cleanText("")).toBe("");
  });

  it("eats text between stray angle brackets, treating it as a tag", () => {
    // Quirk: `<[^>]*>` cannot tell a comparison from markup.
    expect(cleanText("5 < 10 and 20 > 15")).toBe("5 15");
  });
});
