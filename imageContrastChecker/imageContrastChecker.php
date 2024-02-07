<?php 
/** 
 * Plugin Name: Image Contrast Checker
 * Description: This plugin checks the contrast of images and displays a warning if the contrast is too low.
 * Version: 1.0
 * Author: Jeremias Rauwolf
*/

defined( 'ABSPATH' ) or exit; // Exit if accessed directly
if (!function_exists('is_plugin_active')) {
    include_once(ABSPATH . 'wp-admin/includes/plugin.php');
}

/*
* Definitions
*/
// Plugin directory
define( 'EA_DIR' , plugin_dir_path( __FILE__ ) );
define( 'EA_URL' , plugin_dir_url( __FILE__ ) );

require_once( EA_DIR . '/inc/scripts.php' );