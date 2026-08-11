/**
 * Client-side PDF capture for estimates and invoices.
 *
 * Rasterises a DOM subtree with html2canvas and pages it into an A4 PDF. Both
 * libraries are imported dynamically because neither works during SSR.
 */

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/** Content that reads as UI rather than as part of the document. */
const ACTION_CARD_HEADINGS = ["action", "linked job"];
const ACTION_LINK_LABELS = [
  "view",
  "edit",
  "download",
  "save",
  "send",
  "cancel",
];

/**
 * Color forms that the html2canvas CSS parser cannot handle (Tailwind v4 /
 * modern browsers). Matches lab()/oklch()/etc including inside color-mix().
 */
const UNSUPPORTED_COLOR_RE =
  /oklch|oklab|\blab\(|\blch\(|color-mix|\bcolor\(/i;

const COLOR_STYLE_PROPS = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
  "caretColor",
  "columnRuleColor",
  "fill",
  "stroke",
] as const;

const COMPOSITE_STYLE_PROPS = [
  "boxShadow",
  "textShadow",
  "backgroundImage",
  "borderImageSource",
  "filter",
] as const;

function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasUnsupportedColor(value: string): boolean {
  return Boolean(value) && UNSUPPORTED_COLOR_RE.test(value);
}

/** Convert a CSS color to a form html2canvas understands via Canvas 2D. */
function toCanvasSafeColor(value: string, fallback: string): string {
  if (!value || value === "transparent" || value === "none") return fallback;
  if (!hasUnsupportedColor(value)) {
    // Still normalise transparent-ish backgrounds when requested as fallback white.
    if (value === "rgba(0, 0, 0, 0)" || value === "rgba(0,0,0,0)") {
      return fallback;
    }
    return value;
  }
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fallback;
    ctx.fillStyle = "#000000";
    ctx.fillStyle = value;
    const out = ctx.fillStyle;
    if (
      typeof out === "string" &&
      !hasUnsupportedColor(out) &&
      (out.startsWith("#") || out.startsWith("rgb") || out.startsWith("hsl"))
    ) {
      return out;
    }
  } catch {
    // fall through
  }
  return fallback;
}

/**
 * html2canvas cannot parse lab()/oklch()/color-mix() which modern browsers and
 * Tailwind v4 emit. Force every node (including the clone root) onto sRGB-safe
 * literals before capture.
 */
function replaceUnsupportedColors(root: HTMLElement): void {
  const nodes: HTMLElement[] = [
    root,
    ...Array.from(root.querySelectorAll<HTMLElement>("*")),
  ];

  for (const node of nodes) {
    const computed = window.getComputedStyle(node);

    for (const prop of COLOR_STYLE_PROPS) {
      const value = computed[prop];
      if (!value) continue;

      if (prop === "backgroundColor") {
        if (
          hasUnsupportedColor(value) ||
          value === "rgba(0, 0, 0, 0)" ||
          value === "rgba(0,0,0,0)"
        ) {
          node.style.backgroundColor = toCanvasSafeColor(value, "#ffffff");
        }
        continue;
      }

      if (prop === "color") {
        if (hasUnsupportedColor(value)) {
          node.style.color = toCanvasSafeColor(value, "#000000");
        }
        continue;
      }

      if (prop.startsWith("border") && prop.endsWith("Color")) {
        if (hasUnsupportedColor(value)) {
          const safe = toCanvasSafeColor(value, "#e5e7eb");
          node.style[prop] = safe;
        }
        continue;
      }

      if (hasUnsupportedColor(value)) {
        const safe = toCanvasSafeColor(
          value,
          prop === "fill" || prop === "stroke" ? "#000000" : "transparent",
        );
        // CSSStyleDeclaration indexing for remaining props
        (node.style as CSSStyleDeclaration & Record<string, string>)[prop] =
          safe;
      }
    }

    // Drop composites that often embed unsupported color functions in gradients/shadows.
    for (const prop of COMPOSITE_STYLE_PROPS) {
      const value = computed[prop];
      if (value && hasUnsupportedColor(value)) {
        if (prop === "boxShadow" || prop === "textShadow") {
          node.style[prop] = "none";
        } else if (prop === "backgroundImage") {
          node.style.backgroundImage = "none";
        } else if (prop === "filter") {
          node.style.filter = "none";
        } else if (prop === "borderImageSource") {
          node.style.borderImageSource = "none";
        }
      }
    }
  }
}

/** Strip interactive chrome and flatten edit-mode inputs to their values. */
function stripInteractiveChrome(clone: HTMLElement): void {
  for (const card of clone.querySelectorAll<HTMLElement>('[class*="Card"]')) {
    const heading =
      card.querySelector('[class*="CardHeader"]')?.textContent?.toLowerCase() ??
      "";
    if (ACTION_CARD_HEADINGS.some((label) => heading.includes(label))) {
      card.remove();
    }
  }

  for (const button of clone.querySelectorAll('button, [role="button"]')) {
    button.remove();
  }

  for (const link of clone.querySelectorAll<HTMLElement>("a[href]")) {
    const label = link.textContent?.toLowerCase().trim() ?? "";
    if (ACTION_LINK_LABELS.some((keyword) => label.includes(keyword))) {
      link.remove();
    }
  }

  const editableFields = clone.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement
  >('input[type="text"], input[type="number"], textarea');
  for (const field of editableFields) {
    const asText = document.createElement("div");
    asText.textContent = field.value || "";
    asText.className = "text-gray-900";
    asText.style.padding = "0.5rem 0";
    field.parentElement?.replaceChild(asText, field);
  }

  for (const table of clone.querySelectorAll("table")) {
    for (const cell of table.querySelectorAll<HTMLElement>("th, td")) {
      const label = cell.textContent?.toLowerCase().trim() ?? "";
      if (label === "actions" || cell.querySelector("button")) {
        cell.remove();
      }
    }
  }
}

/**
 * Renders `element` off-screen so that removing chrome and overriding colours
 * never flickers in front of the user.
 */
async function captureOffscreen(element: HTMLElement) {
  const html2canvas = (await import("html2canvas")).default;

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = "absolute";
  clone.style.left = "-9999px";
  clone.style.top = "0";
  clone.style.width = `${element.scrollWidth}px`;
  clone.style.backgroundColor = "#ffffff";
  clone.style.color = "#000000";
  document.body.appendChild(clone);

  try {
    stripInteractiveChrome(clone);
    replaceUnsupportedColors(clone);
    await waitFor(300);

    return await html2canvas(clone, {
      // @ts-expect-error html2canvas types omit scale
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      allowTaint: false,
      removeContainer: true,
      imageTimeout: 15000,
      foreignObjectRendering: false,
    });
  } finally {
    clone.remove();
  }
}

/** Sanitise a client or document name for use in a download filename. */
export function pdfFilenameSegment(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "_");
}

/**
 * Capture `element` and save it as a paginated A4 PDF named `filename`.
 *
 * Throws if the element has not been laid out yet, so callers can surface a
 * "try again" message rather than silently producing a blank page.
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  element.scrollIntoView({ behavior: "auto", block: "start" });
  await waitFor(300);

  if (element.offsetWidth === 0 || element.offsetHeight === 0) {
    await waitFor(500);
    if (element.offsetWidth === 0 || element.offsetHeight === 0) {
      throw new Error(
        "The document is still rendering. Please wait a moment and try again.",
      );
    }
  }

  const canvas = await captureOffscreen(element);
  if (!canvas || canvas.width === 0 || canvas.height === 0) {
    throw new Error("Could not capture the document content.");
  }

  const { default: JsPDF } = await import("jspdf");
  const pdf = new JsPDF("p", "mm", "a4");

  const imageHeightMm = (canvas.height * A4_WIDTH_MM) / canvas.width;
  const imageData = canvas.toDataURL("image/png", 1.0);

  let offsetMm = 0;
  let remainingMm = imageHeightMm;

  pdf.addImage(imageData, "PNG", 0, offsetMm, A4_WIDTH_MM, imageHeightMm);
  remainingMm -= A4_HEIGHT_MM;

  while (remainingMm > 0) {
    offsetMm = remainingMm - imageHeightMm;
    pdf.addPage();
    pdf.addImage(imageData, "PNG", 0, offsetMm, A4_WIDTH_MM, imageHeightMm);
    remainingMm -= A4_HEIGHT_MM;
  }

  pdf.save(filename);
}
