/**
 * Scroll state for the film, shared between the DOM and the 3D scene.
 *
 * A plain mutable object on purpose: it changes every frame, and routing it
 * through React state would re-render the page 60 times a second.
 *
 * `chapter` is a float: 0 while the first section is centred on screen, 1 at
 * the second, 2.5 halfway between the third and fourth, and so on. The scene
 * keys everything off it, so reordering sections re-times the film for free.
 */
export const film = {
  chapter: 0,
  /** 0..1 over the whole page. */
  progress: 0,
  /** Scroll velocity from Lenis, for motion that reacts to how fast you move. */
  velocity: 0,
};

/** Recompute `chapter` from where the [data-film] sections sit right now. */
export function measureChapter() {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-film]"));
  if (sections.length === 0) return;
  const probe = window.scrollY + window.innerHeight * 0.5;
  const centres = sections.map((el) => {
    const r = el.getBoundingClientRect();
    return r.top + window.scrollY + r.height * 0.5;
  });
  if (probe <= centres[0]) {
    film.chapter = 0;
  } else if (probe >= centres[centres.length - 1]) {
    film.chapter = centres.length - 1;
  } else {
    for (let i = 0; i < centres.length - 1; i++) {
      if (probe < centres[i + 1]) {
        film.chapter = i + (probe - centres[i]) / (centres[i + 1] - centres[i]);
        break;
      }
    }
  }
  const max = document.documentElement.scrollHeight - window.innerHeight;
  film.progress = max > 0 ? window.scrollY / max : 0;
}
