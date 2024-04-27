import {calculateLuminance} from "./imageContrastChecker"
import {expect, test} from 'vitest'

test('contrastCalculation', () => {
    const white = calculateLuminance(255,255,255)
    const black = calculateLuminance(0,0,0)
    const red = calculateLuminance(174,50,49)

    function compareLuminance (color1, color2) {
        return color1 > color2
        ? (color1 + 0.05) / (color2 + 0.05)
        : (color2 + 0.05) / (color1 + 0.05);
    }

    expect(parseFloat(compareLuminance(black, white).toFixed(2))).toBe(21.00)
    expect(parseFloat(compareLuminance(black, red).toFixed(2))).toBe(3.30)
    expect(parseFloat(compareLuminance(white, red).toFixed(2))).toBe(6.36)
})