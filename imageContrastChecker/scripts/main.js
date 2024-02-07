const { select, dispatch } = wp.data;
import {
  checkBlocks
} from "./wordpressService.js";

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
console.log("Jsdsdssassss")
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
