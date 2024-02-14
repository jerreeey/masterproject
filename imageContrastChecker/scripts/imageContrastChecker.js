import { drawImage } from "canvas-object-fit";
import { drawText } from "canvas-txt";

function createCanvasFromImage(image, width, height, imageOverlay) {
  return new Promise((resolve, reject) => {
    let img = new Image();
    let canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    let ctx = canvas.getContext("2d");
    let offsetX,
      offsetY = 0.5;
    //get the focus point of the image  
    if (image.style.objectPosition) {
      [offsetX, offsetY] = image.style.objectPosition
        .split(" ")
        .map((str) => parseFloat(str) / 100.0);
    }
    img.src = image.src;
    img.onload = function () {
      //draw the image on the canvas so that it is cropped to the correct aspect ratio
      drawImage(ctx, img, 0, 0, width, height, {
        objecTFit: "cover",
        offsetX: offsetX,
        offsetY: offsetY,
      });
      //draw the overlay on the image
      const rgbValuesImageOverlay = window
        .getComputedStyle(imageOverlay, null)
        .getPropertyValue("background-color")
        .match(/\d+/g);
      const opacityImageOverlay = window
        .getComputedStyle(imageOverlay, null)
        .getPropertyValue("opacity");
      ctx.fillStyle = `rgba(${rgbValuesImageOverlay[0]}, ${rgbValuesImageOverlay[1]}, ${rgbValuesImageOverlay[2]}, ${opacityImageOverlay})`;
      ctx.fillRect(0, 0, width, height);
      //get image data to retrieve pixel values
      resolve(ctx.getImageData(0, 0, width, height));
    };
    img.onerror = reject;

    //display image on the page for debugging
    /* canvas.style.border = "1px solid green"; 
    canvas.style.position = "relative"; 
    document.body.appendChild(canvas); */
  });
}

function createTextOverlayCanvas(overlayText, width, height, position) {
  //get text properties from dom object
  const font = window
    .getComputedStyle(overlayText, null)
    .getPropertyValue("font-family");
  const fontSize = window
    .getComputedStyle(overlayText, null)
    .getPropertyValue("font-size");
  const fontSizeValue = fontSize.substring(0, fontSize.length - 2);
  const lineHeight = window
    .getComputedStyle(overlayText, null)
    .getPropertyValue("line-height");
  const lineHeightValue = lineHeight.substring(0, lineHeight.length - 2);
  const align = window
    .getComputedStyle(overlayText, null)
    .getPropertyValue("text-align");
  let canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  let ctx = canvas.getContext("2d");
  ctx.fillStyle = window
    .getComputedStyle(overlayText, null)
    .getPropertyValue("color");
  //draw the text on the canvas with according properties
  drawText(ctx, overlayText.textContent, {
    x: position.left,
    y: position.top,
    width: overlayText.getBoundingClientRect().width,
    height: overlayText.getBoundingClientRect().height,
    font: font,
    fontSize: parseInt(fontSizeValue),
    align: align,
    lineHeight: parseInt(lineHeightValue),
  });

  //display canvas on the page for debugging
  /* canvas.style.border = "1px solid green";
  canvas.style.position = "relative";
  document.body.appendChild(canvas); */
  return ctx.getImageData(0, 0, width, height);
}

function createBackgroundOverlayCanvas(overlay, width, height, position) {
  let canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  let ctx = canvas.getContext("2d");
  ctx.fillStyle = window
    .getComputedStyle(overlay, null)
    .getPropertyValue("background-color");
  ctx.fillRect(
    position.left,
    position.top,
    overlay.getBoundingClientRect().width,
    overlay.getBoundingClientRect().height
  );

  //display canvas on the page for debugging
  /* canvas.style.border = "1px solid green";
  canvas.style.position = "relative";
  document.body.appendChild(canvas); */
  return ctx.getImageData(0, 0, width, height);
}

//iterate over the 8 neighboring pixels of a pixel and check if they are within the bounds of the canvas. Save the coordinates and return them
function getNeighbors(x, y, width, height) {
  let neighbors = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      let nx = x + dx;
      let ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        neighbors.push({ x: nx, y: ny });
      }
    }
  }
  return neighbors;
}

//check if the text is considered large or small according to WCAG 2.2
function isLargeText(overlayText) {
  const fontSize = window
    .getComputedStyle(overlayText, null)
    .getPropertyValue("font-size");
  const fontSizeValue = fontSize.substring(0, fontSize.length - 2);
  const fontWeight = window
    .getComputedStyle(overlayText, null)
    .getPropertyValue("font-weight");

  if ((fontWeight >= 700 && fontSizeValue >= 18.66) || fontSizeValue >= 24) {
    return true;
  } else {
    return false;
  }
}

function calculateContrast(
  imageData,
  overlayImageData,
  isLargeText,
  textColor
) {
  let counter7 = 0;
  let counter45 = 0;
  let counter3 = 0;
  let minContrastRatio = Infinity;
  // Iterate over the pixels in the overlay image data
  for (let y = 0; y < overlayImageData.height; y++) {
    for (let x = 0; x < overlayImageData.width; x++) {
      let i = (y * overlayImageData.width + x) * 4;

      // If the pixel is not (0,0,0,0), get its neighbors
      if (
        !(
          overlayImageData.data[i] === 0 &&
          overlayImageData.data[i + 1] === 0 &&
          overlayImageData.data[i + 2] === 0 &&
          overlayImageData.data[i + 3] === 0
        )
      ) {
        let neighbors = getNeighbors(
          x,
          y,
          overlayImageData.width,
          overlayImageData.height
        );

        // For each neighboring pixel that is (0,0,0,0), get the corresponding pixel from the image canvas
        for (let neighbor of neighbors) {
          let j = (neighbor.y * overlayImageData.width + neighbor.x) * 4;
          if (
            overlayImageData.data[j] === 0 &&
            overlayImageData.data[j + 1] === 0 &&
            overlayImageData.data[j + 2] === 0 &&
            overlayImageData.data[j + 3] === 0
          ) {
            if (
              !(
                imageData.data[j] === 0 &&
                imageData.data[j + 1] === 0 &&
                imageData.data[j + 2] === 0 &&
                imageData.data[j + 3] === 0
              )
            ) {
              // Calculate the contrast ratio

              //Cant use the overlayImageData to calculate the luminance, because it contains subpixel antialiasing
              // let overlayLuminance = calculateLuminance(
              //   overlayImageData.data[i],
              //   overlayImageData.data[i + 1],
              //   overlayImageData.data[i + 2]
              // );

              let overlayLuminance = calculateLuminance(
                textColor[0],
                textColor[1],
                textColor[2]
              );

              let imageLuminance = calculateLuminance(
                imageData.data[j],
                imageData.data[j + 1],
                imageData.data[j + 2]
              );
              let contrastRatio =
                overlayLuminance > imageLuminance
                  ? (overlayLuminance + 0.05) / (imageLuminance + 0.05)
                  : (imageLuminance + 0.05) / (overlayLuminance + 0.05);

              if (contrastRatio < minContrastRatio) {
                minContrastRatio = contrastRatio;
              }

              if (contrastRatio < 3) {
                counter3++;
              } else if (contrastRatio < 4.5) {
                counter45++;
              } else if (contrastRatio < 7) {
                counter7++;
              }
            }
          }
        }
      }
    }
  }

  //return the result according to the WCAG 2.2 guidelines

  if (!isLargeText) {
    if (counter3 > 0 || counter45 > 0) {
      return {
        fail: true,
        size: "small",
        compliance: "AA",
        contrast: minContrastRatio,
      };
    } else if (counter7 > 0) {
      return {
        fail: true,
        size: "small",
        compliance: "AAA",
        contrast: minContrastRatio,
      };
    } else {
      return {
        fail: false,
        size: "small",
        compliance: "AAA",
        contrast: minContrastRatio,
      };
    }
  } else {
    if (counter3 > 0) {
      return {
        fail: true,
        size: "large",
        compliance: "AA",
        contrast: minContrastRatio,
      };
    } else if (counter45 > 0) {
      return {
        fail: true,
        size: "large",
        compliance: "AAA",
        contrast: minContrastRatio,
      };
    } else {
      return {
        fail: false,
        size: "large",
        compliance: "AAA",
        contrast: minContrastRatio,
      };
    }
  }
}

//calculate the luminance of a color, formular can be found here: https://www.w3.org/WAI/GL/wiki/Contrast_ratio
function calculateLuminance(r, g, b) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export {
  createCanvasFromImage,
  createTextOverlayCanvas,
  createBackgroundOverlayCanvas,
  calculateContrast,
  isLargeText,
};
