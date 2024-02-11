import { isContrastSufficient, dismissNotice } from "./wordpressService.js";
const { select, dispatch } = wp.data;

async function optimizeContrast(block) {
  const optimizationFunctions = [
    adjustOverlay,
    adjustTextSize,
    adjustTextColor,
    adjustBackgroundColor,
  ];

  for (const optimize of optimizationFunctions) {
    const optimized = await optimize(block);
    if (optimized) {
      dismissNotice(block.clientId);
      return;
    }
  }

  // If none of the optimizations worked, show notice
  dispatch("core/notices").createNotice(
    "error",
    `Contrast for block with id ${block.clientId} could not be optimized. Please adjust manually.`,
    {
      id: block.clientId,
      isDismissible: true,
      actions: [
        {
          label: "Go to block",
          url: `#block-${block.clientId}`,
        },
      ],
    }
  );
}

async function adjustBackgroundColor(block) {
  const innerBlocks = select("core/block-editor").getBlocks(block.clientId);
  const colors = ["contrast", "base"];

  for (const color of colors) {
    for (let i = 0; i < innerBlocks.length; i++) {
      await dispatch("core/block-editor").selectBlock(innerBlocks[i].clientId);
      await dispatch("core/block-editor").updateBlockAttributes(
        innerBlocks[i].clientId,
        {
          backgroundColor: color,
        }
      );
    }
    const updatedBlock = select("core/block-editor").getBlock(block.clientId);
    const isSufficient = await isContrastSufficient(updatedBlock);
    if (isSufficient) {
      return true;
    }
  }

  await dispatch("core/block-editor").replaceBlock(block.clientId, block);
  return false;
}

async function adjustTextSize(block) {
  const innerBlocks = select("core/block-editor").getBlocks(block.clientId);

  for (let i = 0; i < innerBlocks.length; i++) {
    if (innerBlocks[i].innerBlocks.length > 0) {
      adjustTextSize(innerBlocks[i]);
    }
    if (innerBlocks[i].attributes.content) {
      const innerBlockElement = document.getElementById(
        `block-${innerBlocks[i].clientId}`
      );
      const fontSize = window
        .getComputedStyle(innerBlockElement, null)
        .getPropertyValue("font-size");
      const fontSizeValue = fontSize.substring(0, fontSize.length - 2);
      const fontWeight = window
        .getComputedStyle(innerBlockElement, null)
        .getPropertyValue("font-weight");

      if (fontSizeValue < 18.66 || (fontSizeValue < 24 && fontWeight < 700)) {
        const content = innerBlocks[i].attributes.content.replace(
          /(<([^>]+)>)/gi,
          ""
        );
        dispatch("core/block-editor").selectBlock(innerBlocks[i].clientId);
        await dispatch("core/block-editor").updateBlockAttributes(
          innerBlocks[i].clientId,
          { fontSize: "large", content: content }
        );
      }
    }
  }

  const updatedBlock = select("core/block-editor").getBlock(block.clientId);
  const isSufficient = await isContrastSufficient(updatedBlock);

  if (!isSufficient) {
    await dispatch("core/block-editor").replaceBlock(block.clientId, block);
  }

  return isSufficient;
}

async function adjustTextColor(block) {
  const innerBlocks = select("core/block-editor").getBlocks(block.clientId);
  const colors = ["contrast", "base"];

  for (let i = 0; i < innerBlocks.length; i++) {
    if (innerBlocks[i].innerBlocks.length > 0) {
      adjustTextColor(innerBlocks[i]);
    }
    if (innerBlocks[i].attributes.content) {
      dispatch("core/block-editor").selectBlock(innerBlocks[i].clientId);

      for (const color of colors) {
        await dispatch("core/block-editor").updateBlockAttributes(
          innerBlocks[i].clientId,
          { textColor: color }
        );
      }
    }
  }

  const updatedBlock = select("core/block-editor").getBlock(block.clientId);
  const isSufficient = await isContrastSufficient(updatedBlock);

  if (!isSufficient) {
    await dispatch("core/block-editor").replaceBlock(block.clientId, block);
  }

  return isSufficient;
}

async function adjustOverlay(block) {
  const newOverlaySettings = [
    {
      overlayColor: "black",
      dimRatio: 30,
    },
    {
      overlayColor: "white",
      dimRatio: 30,
    },
    {
      overlayColor: "black",
      dimRatio: 50,
    },
    {
      overlayColor: "white",
      dimRatio: 50,
    },
  ];

  for (let i = 0; i < newOverlaySettings.length; i++) {
      dispatch("core/block-editor").selectBlock(block.clientId);
      await dispatch("core/block-editor").updateBlockAttributes(block.clientId, newOverlaySettings[i]);
      const updatedBlock = select("core/block-editor").getBlock(block.clientId);
      const isSufficient = await isContrastSufficient(updatedBlock);
      if (isSufficient) {
        return true;
      }
  }

  dispatch("core/block-editor").updateBlockAttributes(block.clientId, block.attributes);
  return false;
}

export { optimizeContrast };
