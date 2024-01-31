const {select,dispatch} = wp.data
import {createCanvasFromImage, createOverlayCanvas, calculateContrast, isLargeText} from './imageContrastChecker.js'

const { registerPlugin } = wp.plugins;
const { PluginPostStatusInfo } = wp.editPost;
const { Button } = wp.components;

const MyPlugin = function() {
    return wp.element.createElement(
        PluginPostStatusInfo,
        {},
        wp.element.createElement(
            Button,
            { isPrimary: true, onClick: checkBlocks },
            'Check contrast'
        )
    );
};
registerPlugin( 'my-plugin', { render: MyPlugin } );
  
wp.domReady(function(){
    test()
});
function test() { 
    const { isSavingPost } = wp.data.select( 'core/editor' );
    let checked = true; // Start in a checked state.
    wp.data.subscribe( () => {
        if (isSavingPost()) {
            checked = false;
        } else {
            if (!checked) {
                checkBlocks()
                checked = true;
            }
        }
    });
}

function checkBlocks() {
    const blocks = wp.data.select('core/editor').getBlocks()
    const editorSettings = wp.data.select("core/editor").getEditorSettings()
    const { createWarningNotice } = wp.data.dispatch('core/notices');

    console.log(editorSettings)

    // wp.data.dispatch( 'core/editor' ).updateEditorSettings( {colors: [{name: 'test', slug: 'test', color: '#00FF00'}]} );
    blocks.forEach(async block => {
        if(block.name === "core/cover" && block.attributes.id) {
            // cover block with image detected
            console.log(block)

            // get dom element via "data-block" or "id" ('block-{clientId}')
            const blockElement = document.querySelector(`[data-block="${block.clientId}"]`);
            const blockElementBoundingRect = blockElement.getBoundingClientRect()
            const img = blockElement.querySelector('img');
            const overlayContainer = blockElement.querySelector('.wp-block-cover__inner-container')
            const overlayText = overlayContainer.firstChild
            const overlayTextBoundingRect = overlayText.getBoundingClientRect()
            const position = {
                top: overlayTextBoundingRect.top - blockElementBoundingRect.top,
                left: overlayTextBoundingRect.left - blockElementBoundingRect.left,
            };
            try {
                const imgData = await createCanvasFromImage(img, img.width, img.height)
                const overlayData = createOverlayCanvas(overlayText, img.width, img.height, position)
                calculateContrast(imgData, overlayData, isLargeText(overlayText))

                let contrast = 3

                if (contrast < 4.5) { // Replace 4.5 with the minimum acceptable contrast
                    createWarningNotice(`The contrast for block ${block.clientId} is too low.`, {
                        id: `low-contrast-warning-${block.clientId}`,
                        isDismissible: true,
                    });
                }
            } catch (error) {
                console.log(error)
            }
        }
    })
}
