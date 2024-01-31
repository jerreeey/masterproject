import {drawImage} from '../node_modules/canvas-object-fit/src/index.js';
import {drawText} from '../node_modules/canvas-txt/dist/canvas-txt.mjs';


function createCanvasFromImage(image, width, height) {
    return new Promise((resolve, reject) => {
        let img = new Image();
        console.log(img)
        let canvas = document.createElement('canvas');
        canvas.width = width
        canvas.height = height
        let ctx = canvas.getContext('2d');
        let offsetX, offsetY = 0.5
        if (image.style.objectPosition) {
            [offsetX, offsetY] = image.style.objectPosition.split(' ').map(str => parseFloat(str) / 100.0);
        }
        img.src = image.src;
        img.onload = function() {
            drawImage(ctx, img, 0, 0, width, height, {objecTFit: 'cover', offsetX: offsetX, offsetY: offsetY});
            resolve(ctx.getImageData(0, 0, width, height));
        }
        img.onerror = reject;
        canvas.style.border = '1px solid green'; // Remove this later
        canvas.style.position = 'relative'; //Remove this later
        document.body.appendChild(canvas) //Remove this later
    })
}

function createOverlayCanvas(overlayText, width, height, position) {
    const font = window.getComputedStyle(overlayText, null).getPropertyValue('font-family')
    const fontSize = window.getComputedStyle(overlayText, null).getPropertyValue('font-size')
    const fontSizeValue = fontSize.substring(0, fontSize.length - 2)
    const lineHeight = window.getComputedStyle(overlayText, null).getPropertyValue('line-height')
    const lineHeightValue = lineHeight.substring(0, lineHeight.length - 2)
    const align = window.getComputedStyle(overlayText, null).getPropertyValue('text-align')
    let canvas = document.createElement('canvas');
    canvas.width = width
    canvas.height = height
    let ctx = canvas.getContext('2d');
    ctx.fillStyle = window.getComputedStyle(overlayText, null).getPropertyValue('color');
    console.log(ctx.fillStyle)
    drawText(ctx, overlayText.textContent, {x: position.left, y: position.top, width: overlayText.getBoundingClientRect().width, height: overlayText.getBoundingClientRect().height, font: font, fontSize: parseInt(fontSizeValue), align: align, lineHeight: parseInt(lineHeightValue)});
    canvas.style.border = '1px solid green'; // Remove this later
    canvas.style.position = 'relative'; //Remove this later
    document.body.appendChild(canvas)
    return ctx.getImageData(0, 0, width, height);
}


function getNeighbors(x, y, width, height) {
  let neighbors = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      let nx = x + dx;
      let ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        neighbors.push({x: nx, y: ny});
      }
    }
  }
  return neighbors;
}

function isLargeText(overlayText) {
  const fontSize = window.getComputedStyle(overlayText, null).getPropertyValue('font-size')
  const fontSizeValue = fontSize.substring(0, fontSize.length - 2)
  const fontWeight = window.getComputedStyle(overlayText, null).getPropertyValue('font-weight')

  console.log(fontSize)

  if((fontWeight >= 700 && fontSizeValue >=18.66) || fontSizeValue >= 24) {
    return true;
  } else {
    return false;
  }
}


function calculateContrast(imageData, overlayImageData, isLargeText) {
    let counter7 = 0;
    let counter45 = 0;
    let counter3 = 0;
    // Iterate over the pixels in the overlay image data
    for (let y = 0; y < overlayImageData.height; y++) {
      for (let x = 0; x < overlayImageData.width; x++) {
        let i = (y * overlayImageData.width + x) * 4;
  
        // If the pixel is not (0,0,0,0), get its neighbors
        if (!(overlayImageData.data[i] === 0 && overlayImageData.data[i+1] === 0 && overlayImageData.data[i+2] === 0 && overlayImageData.data[i+3] === 0)) {
          let neighbors = getNeighbors(x, y, overlayImageData.width, overlayImageData.height);
  
          // For each neighboring pixel that is (0,0,0,0), get the corresponding pixel from the image canvas
          for (let neighbor of neighbors) {
            let j = (neighbor.y * overlayImageData.width + neighbor.x) * 4;
            if (overlayImageData.data[j] === 0 && overlayImageData.data[j+1] === 0 && overlayImageData.data[j+2] === 0 && overlayImageData.data[j+3] === 0) {
                if (!(imageData.data[j] === 0 && imageData.data[j+1] === 0 && imageData.data[j+2] === 0 && imageData.data[j+3] === 0)) {
                // Calculate the contrast ratio
                let overlayLuminance = calculateLuminance(overlayImageData.data[i], overlayImageData.data[i+1], overlayImageData.data[i+2]);
                let imageLuminance = calculateLuminance(imageData.data[j], imageData.data[j+1], imageData.data[j+2]);
                let contrastRatio = overlayLuminance > imageLuminance ? (overlayLuminance + 0.05) / (imageLuminance + 0.05) : (imageLuminance + 0.05) / (overlayLuminance + 0.05);
                //console.log(contrastRatio)

                if (contrastRatio < 3) {
                  counter3++;
                } else if (contrastRatio < 4.5) {
                  counter45++;
                }
                else if (contrastRatio < 7) {
                  counter7++;
                }
              }
            }
          }
        }
      }
    }

    if (!isLargeText) {
      if (counter3 > 0 || counter45 > 0) {
          console.log('The contrast ratio is less than 4.5:1 at pixel. This does not comply with WCAG AA.');

      } else if (counter7 > 0) {
          console.log('The contrast ratio is less than 7:1 at pixel. This does not comply with WCAG AAA but with WCAG AA.');

      } else {
          console.log('The contrast ratio is greater than or equal to 7:1 for all pixels. This complies with WCAG AAA.');
      }
    } else {
      if (counter3 > 0) {
        console.log('The contrast ratio is less than 3:1 at pixel. This does not comply with WCAG AA.');

      } else if (counter45 > 0) {
        console.log('The contrast ratio is less than 4.5:1 at pixel. This does not comply with WCAG AAA but with WCAG AA.');

      } else {
        console.log('The contrast ratio is greater than or equal to 4.5:1 for all pixels. This complies with WCAG AAA.');
      }
    }
  }
  
  function calculateLuminance(r, g, b) {
    r /= 255;
    r <= 0.3928 ? r = r / 12.92 : r = Math.pow((r + 0.055) / 1.055, 2.4);
    g /= 255;
    g <= 0.3928 ? g = g / 12.92 : g = Math.pow((g + 0.055) / 1.055, 2.4);
    b /= 255;
    b <= 0.3928 ? b = b / 12.92 : b = Math.pow((b + 0.055) / 1.055, 2.4);
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  export {createCanvasFromImage, createOverlayCanvas, calculateContrast, isLargeText}