<?php

function icc_load_scripts() {
    $currentScreen = get_current_screen();
    if($currentScreen->base === "post") {
        wp_enqueue_script( 'contrastChecker', EA_URL . '/dist/main.js', ['wp-i18n', 'wp-blocks', 'wp-dom-ready', 'wp-edit-post' ], '1.0.4', array( 'strategy' => 'defer'));
    }
}

add_action( 'admin_enqueue_scripts', 'icc_load_scripts' );

// Scripts that import modules must use a script tag with type="module"/
add_filter( 'script_loader_tag', function ( $tag, $handle, $src ) {
    switch ( $handle ) {
        case 'contrastChecker':
            return '<script type="module" src="' . esc_url( $src ) . '"></script>';
            break;
        default:
            return $tag;
            break;
    }
}, 10, 3 );
