const { select, dispatch } = wp.data;
import {
  createCanvasFromImage,
  createTextOverlayCanvas,
  createBackgroundOverlayCanvas,
  calculateContrast,
  isLargeText,
} from "./imageContrastChecker.js";
import { optimizeContrast } from "./contrastOptimizer.js";

function createBlockNotice(blockClientId, result) {
  const noticeId =
    result.compliance == "AA"
      ? `low-contrast-AA-${blockClientId}`
      : `low-contrast-AAA-${blockClientId}`;
  let message = "";
  if (result.compliance === "AA") {
    if (result.size === "large") {
      message = `The text in the block ${blockClientId} does not comply with WCAG AA. The current contrast ratio is ${result.contrast.toFixed(
        2
      )}. For the current text size (more than or equal to 18pt or 14pt bold), the contrast ratio should be at least 3:1.`;
    } else {
      message = `The text in the block ${blockClientId} does not comply with WCAG AA. The contrast ratio is ${result.contrast.toFixed(
        2
      )}. For the current text size (less than 18pt or 14pt bold), the contrast ratio should be at least 4.5:1.`;
    }
  } else if (result.compliance === "AAA") {
    if (result.size === "large") {
      message = `The text in the block ${blockClientId} does not comply with WCAG AAA. The current contrast ratio is ${result.contrast.toFixed(
        2
      )}. For the current text size (more than or equal to 18pt or 14pt bold), the contrast ratio should be at least 4.5:1.`;
    } else {
      message = `The text in the block ${blockClientId} does not comply with WCAG AAA. The contrast ratio is ${result.contrast.toFixed(
        2
      )}. For the current text size (less than 18pt or 14pt bold), the contrast ratio should be at least 7:1.`;
    }
  }

  dispatch("core/notices").createNotice(
    result.compliance === "AAA" ? "warning" : "error",
    message,
    {
      id: noticeId,
      isDismissible: true,
      actions: [
        {
          url: `#block-${blockClientId}`,
          label: "Go to block",
        },
        {
          label: "Automatically optimize contrast",
          onClick: () => {
            optimizeContrast(
              wp.data.select("core/block-editor").getBlock(blockClientId)
            );
          },
        },
      ],
    }
  );
}

function createSuccessNotice() {
  const noticeId = `low-contrast-success`;

  dispatch("core/notices").createNotice(
    "success",
    `All blocks comply with the Web Content Accessibility Guidelines.`,
    {
      id: noticeId,
      isDismissible: true,
    }
  );
}

function createWarningNotice(compliance) {
  const noticeId = `low-contrast-warning`;

  dispatch("core/notices").createNotice(
    compliance === "AAA" ? "warning" : "error",
    `Some blocks do not comply with WCAG ${compliance}. Please check the blocks and change the appearence of the text or the image, by changing the position or size of the text or adding a text background. For more information to conforming to the Web Content Accessibility Guidelines click on the links below.`,
    {
      id: noticeId,
      isDismissible: true,
      actions: [
        {
          url: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html",
          label: "More infomations to WCAG AA compliance",
        },
        {
          url: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html",
          label: "More infomations to WCAG AAA compliance",
        },
      ],
    }
  );
}

async function checkBlocks() {
  const blocks = wp.data.select("core/block-editor").getBlocks();
  const notices = wp.data.select("core/notices").getNotices();
  let fail = false;
  let leastCompliance = "";
  //Lösche alle notices
  notices.forEach((notice) => {
    wp.data.dispatch("core/notices").removeNotice(notice.id);
  });
  //Iteriere über alle Cover Blöcke mit Bildhintergrund
  await Promise.all(
    blocks.map(async (block) => {
      if (block.name === "core/cover" && block.attributes.id) {
        const blockElement = document.querySelector(
          `[data-block="${block.clientId}"]`
        );
        const result = await checkBlock(blockElement);
        if (result.fail) {
          fail = true;
          leastCompliance = leastCompliance == "AA" ? "AA" : result.compliance;
          createBlockNotice(block.clientId, result);
        }
      }
    })
  );
  //Gib Erfolgsmeldung/Warning aus basierend auf alle Blöcke

  if (!fail) {
    createSuccessNotice();
  } else {
    createWarningNotice(leastCompliance);
  }
}

async function isContrastSufficient(block) {
  const result = await checkBlock(
    document.querySelector(`[data-block="${block.clientId}"]`)
  );

  return !result.fail;
}

async function checkBlock(blockElement) {
  //Erstelle Canvas aus Bild
  const img = blockElement.querySelector("img");
  const imageOverlay = blockElement.querySelector(
    ".wp-block-cover__background"
  );
  const overlayContainer = blockElement.querySelector(
    ".wp-block-cover__inner-container"
  );
  let contrastResults = [];
  console.log(
    window
      .getComputedStyle(imageOverlay, null)
      .getPropertyValue("background-color")
  );
  try {
    const imgData = await createCanvasFromImage(
      img,
      img.width,
      img.height,
      imageOverlay
    );
    //Iteriere über alle Elemente im Cover Block außer appender block
    Array.from(overlayContainer.children).forEach((overlayElement) => {
      if (!overlayElement.classList.contains("block-list-appender")) {
        let contrastResult = checkOverlayElement(
          overlayElement,
          imgData,
          img.width,
          img.height,
          blockElement
        );
        contrastResults.push(contrastResult);
      }
    });
  } catch (error) {
    console.log(error);
  }
  //return Ergebnis für Element mit schlechtestem Kontrast als Ergebnis für den ganzen Block
  return contrastResults.reduce(
    (min, result) => (result.contrast < min.contrast ? result : min),
    contrastResults[0]
  );
}

function checkOverlayElement(
  overlayElement,
  imgData,
  imgWidth,
  imgHeight,
  blockElement
) {
  let contrastResults = [];

  const backgroundColor = window
    .getComputedStyle(overlayElement, null)
    .getPropertyValue("background-color")
    .replace(/[^\d,]/g, "")
    .split(",");
  const textColor = window
    .getComputedStyle(overlayElement, null)
    .getPropertyValue("color")
    .replace(/[^\d,]/g, "")
    .split(",");

  let immediateTextContent;

  if (overlayElement.childNodes.length > 0) {
    //nur Textinhalt ohne  Textinhalt der Kinder
    immediateTextContent = Array.from(overlayElement.childNodes)
      .filter((node) => node.nodeType === 3) // Filter out non-text nodes
      .map((node) => node.textContent)
      .join("");
  } else {
    immediateTextContent = overlayElement.textContent;
  }

  //check ob Element Text oder Hintergrund hat
  if (backgroundColor[3] !== "0") {
    const contrastResult = checkOverlaySubElement(
      overlayElement,
      true,
      backgroundColor,
      imgData,
      imgWidth,
      imgHeight,
      blockElement
    );
    contrastResults.push(contrastResult);
  } else if (immediateTextContent !== "") {
    const contrastResult = checkOverlaySubElement(
      overlayElement,
      false,
      textColor,
      imgData,
      imgWidth,
      imgHeight,
      blockElement
    );
    contrastResults.push(contrastResult);
  } else {
    //check ob Element Kinder hat
    if (overlayElement.children) {
      Array.from(overlayElement.children).forEach((element) => {
        const childContrastResults = checkOverlayElement(
          element,
          imgData,
          imgWidth,
          imgHeight,
          blockElement
        );
        contrastResults = contrastResults.concat(childContrastResults);
      });
    }
  }
  //return schlechtestes Ergebnis für Element
  return contrastResults.reduce(
    (min, result) => (result.contrast < min.contrast ? result : min),
    contrastResults[0]
  );
}

function checkOverlaySubElement(
  overlaySubElement,
  hasBackground,
  color,
  imgData,
  imgWidth,
  imgHeight,
  blockElement
) {
  //Erstelle Canvas aus Element (Hintergrund oder Text wenn kein Hintergrund vorhanden)
  const overlaySubElementBoundingRect =
    overlaySubElement.getBoundingClientRect();
  const blockElementBoundingRect = blockElement.getBoundingClientRect();
  const position = {
    top: overlaySubElementBoundingRect.top - blockElementBoundingRect.top,
    left: overlaySubElementBoundingRect.left - blockElementBoundingRect.left,
  };
  let overlayData;
  if (hasBackground) {
    overlayData = createBackgroundOverlayCanvas(
      overlaySubElement,
      imgWidth,
      imgHeight,
      position
    );
  } else {
    overlayData = createTextOverlayCanvas(
      overlaySubElement,
      imgWidth,
      imgHeight,
      position
    );
  }
  //Berechne Kontrast
  const result = calculateContrast(
    imgData,
    overlayData,
    isLargeText(overlaySubElement),
    color
  );
  //Gib Ergebnis zurück
  return result;
}

function dismissNotice(blockClientId) {
  console.log(blockClientId);
  const allNotices = wp.data.select("core/notices").getNotices();
  let noticeId;
  let newLeastCompliance = "";
  allNotices.forEach((element) => {
    if (element.id.includes(blockClientId)) {
      noticeId = element.id;
    } else if (
      (newLeastCompliance === "" && element.id.includes("AA")) ||
      (newLeastCompliance === "" && element.id.includes("AAA")) ||
      (newLeastCompliance === "AAA" && element.id.includes("AA"))
    ) {
      newLeastCompliance = element.id.includes("AA") ? "AA" : "AAA";
    }
  });

  wp.data.dispatch("core/notices").removeNotice(noticeId);
  wp.data.dispatch("core/notices").removeNotice("low-contrast-warning");
  if (newLeastCompliance === "") {
    createSuccessNotice();
  } else {
    createWarningNotice(newLeastCompliance);
  }
}

export { checkBlocks, isContrastSufficient, dismissNotice };
