import { isContrastSufficient, dismissNotice } from "./wordpressService.js";
const { select, dispatch } = wp.data;

async function optimizeContrast(block) {
  let optimized = false;
  //try to increase contrast by adjusting overlay of image
  optimized = await adjustOverlay(block)
  if (optimized) {
    dismissNotice(block.clientId);
    return;
  }

  /*
  //if contrast is still not enough, try to adjust the inner blocks by increasing text size
  adjustTextSize(block);
  //if contrast is still not enough, try to adjust the inner blocks by changing position
  adjustPosition(block);*/
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
    try {
      const isSufficient = await new Promise((resolve, reject) => {
        wp.data
          .dispatch("core/block-editor")
          .updateBlockAttributes(block.clientId, newOverlaySettings[i])
          .then(() => {
            setTimeout(async () => {
              const updatedBlock = wp.data
                .select("core/block-editor")
                .getBlock(block.clientId);

              try {
                const isSufficient = await isContrastSufficient(updatedBlock);
                resolve(isSufficient);
              } catch (error) {
                reject(error);
              }
            }, 250);
          })
          .catch((error) => reject(error));
      });

      if (isSufficient) {
        return true;
      }
    } catch (error) {
      console.error("Error updating block:", error);
    }
  }

  wp.data
    .dispatch("core/block-editor")
    .updateBlockAttributes(block.clientId, block.attributes);

  return false;
}

export { optimizeContrast };
