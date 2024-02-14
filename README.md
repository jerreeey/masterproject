# Image Contrast Checker - WP Plugin
This is a WordPress plugin to check contrasts between image and text. Contrasts are checked according to the Web Content Accessibility Guidelines Conformance Level 2.2. In addition there is an option available to automatically optimize the contrast via the plugin.

## How to install
- Download zip file "imageContrastChecker.zip"
- Click on "Plugins" and "Add new" within your WordPress Interface
- Upload zip File "imageContrastChecker.zip"

## How to develop
There are multiple ways to develop a WordPress Plugin. I will simply describe my chosen environment.

### Prerequisites 
- Docker
- node/npm

### Setup
- clone repo
- add .env file into the root folder with following params and fill in values
    - MYSQL_DATABASE=
    - MYSQL_USER=
    - MYSQL_PASSWORD=
    - MYSQL_ROOT_PASSWORD=
- run npm install within "imageContrastChecker" directory
- run docker compose build

### Local development (at the first start up you will need to configure WordPress)
- run docker compose up
- run npm watch within "imageContrastChecker" directory 
- open localhost:8080 to open WordPress Interface
- Activate Plugin under "Plugins"

## Features
- Automatic Contrast Checking of "cover" blocks on Post/Page saving action
- "Check contrast" Button on Post/Page sidebar to manually trigger the checking process
- Error/Warning/Success Notices depending on violation of WCAG 2.2 Success Criterion 1.4.3 and 1.4.11
- Highlight violating block
- Autmatically fixing contrast issues through either
    - adding or adjusting an image overlay 
    - increasing the text size
    - adjusting the text color
    - adjusting the background color of the text