const { select, dispatch } = wp.data;
import { checkBlocks } from "./wordpressService.js";

const { registerPlugin } = wp.plugins;
const { PluginPostStatusInfo } = wp.editPost;
const { Button } = wp.components;

//add checkContrastButton to the post sidebar and register it as a plugin
const CheckContrastButton = function () {
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
registerPlugin("image-contrast-checker", { render: CheckContrastButton });

wp.domReady(function () {
  addSavingListener();
});

//check contrast after manually saving or autosaving
function addSavingListener() {
  const { isSavingPost } = select("core/editor");
  let checked = true;
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
