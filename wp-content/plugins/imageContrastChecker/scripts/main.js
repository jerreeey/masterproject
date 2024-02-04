const { select, dispatch } = wp.data;
import {
  createCanvasFromImage,
  createTextOverlayCanvas,
  createBackgroundOverlayCanvas,
  calculateContrast,
  isLargeText,
} from "./imageContrastChecker.js";

const { registerPlugin } = wp.plugins;
const { PluginPostStatusInfo } = wp.editPost;
const { Button } = wp.components;

const MyPlugin = function () {
  return wp.element.createElement(
    PluginPostStatusInfo,
    {},
    wp.element.createElement(
      Button,
      { isPrimary: true, onClick: checkBlocks },
      "Check contrast"
    )
  );
};
registerPlugin("my-plugin", { render: MyPlugin });

wp.domReady(function () {
  test();
});
function test() {
  const { isSavingPost } = wp.data.select("core/editor");
  let checked = true; // Start in a checked state.
  wp.data.subscribe(() => {
    if (isSavingPost()) {
      checked = false;
    } else {
      if (!checked) {
        checkBlocks();
        checked = true;
      }
    }
  });
}

function createBlockNotice(blockClientId, result) {
  const noticeId = `low-contrast-warning-${blockClientId}`;
  console.log(result);
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
          label: "Go to Block",
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
  const blocks = wp.data.select("core/editor").getBlocks();
  const notices = wp.data.select("core/notices").getNotices();
  const editorSettings = wp.data.select("core/editor").getEditorSettings();
  let fail = false;
  let leastCompliance = "";

  notices.forEach((notice) => {
    wp.data.dispatch("core/notices").removeNotice(notice.id);
  });

  await Promise.all(
    blocks.map(async (block) => {
      if (block.name === "core/cover" && block.attributes.id) {
        const blockElement = document.querySelector(
          `[data-block="${block.clientId}"]`
        );
        const blockElementBoundingRect = blockElement.getBoundingClientRect();
        const img = blockElement.querySelector("img");
        const overlayContainer = blockElement.querySelector(
          ".wp-block-cover__inner-container"
        );
        const overlayElement = overlayContainer.firstChild;
        const overlayElementBoundingRect =
          overlayElement.getBoundingClientRect();
        const position = {
          top: overlayElementBoundingRect.top - blockElementBoundingRect.top,
          left: overlayElementBoundingRect.left - blockElementBoundingRect.left,
        };
        try {
          const imgData = await createCanvasFromImage(
            img,
            img.width,
            img.height
          );
          let overlayData;
          let color;
          console.log(
            window
              .getComputedStyle(overlayElement)
              .getPropertyValue("background-color")
          );
          const backgroundColor = window
            .getComputedStyle(overlayElement, null)
            .getPropertyValue("background-color")
            .replace(/[^\d,]/g, "")
            .split(",");
          if (backgroundColor[3] !== "0") {
            overlayData = createBackgroundOverlayCanvas(
              overlayElement,
              img.width,
              img.height,
              position
            );
            color = backgroundColor;
          } else if (overlayElement.textContent) {
            overlayData = createTextOverlayCanvas(
              overlayElement,
              img.width,
              img.height,
              position
            );
            color = window
              .getComputedStyle(overlayElement, null)
              .getPropertyValue("color")
              .replace(/[^\d,]/g, "")
              .split(",");
          }

          const result = calculateContrast(
            imgData,
            overlayData,
            isLargeText(overlayElement),
            color
          );

          if (result.fail) {
            fail = true;
            leastCompliance =
              leastCompliance == "AA" ? "AA" : result.compliance;
            createBlockNotice(block.clientId, result);
          }
        } catch (error) {
          console.log(error);
        }
      }
    })
  );

  if (!fail) {
    createSuccessNotice();
  } else {
    createWarningNotice(leastCompliance);
  }
}
