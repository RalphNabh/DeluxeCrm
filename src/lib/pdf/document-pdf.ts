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

function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * html2canvas cannot parse oklch(), which is what Tailwind v4 emits for every
 * themed colour. Anything still expressed in oklch after cloning is replaced
 * with a print-safe literal.
 */
function replaceUnsupportedColors(root: HTMLElement): void {
  for (const node of root.querySelectorAll<HTMLElement>("*")) {
    const computed = window.getComputedStyle(node);

    if (
      computed.backgroundColor.includes("oklch") ||
      computed.backgroundColor === "rgba(0, 0, 0, 0)"
    ) {
      node.style.backgroundColor = "#ffffff";
    }
    if (computed.color.includes("oklch")) {
      node.style.color = "#000000";
    }
    if (computed.borderColor.includes("oklch")) {
      node.style.borderColor = "#e5e7eb";
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
