# Shareflix

## Author

I'm Adib Abuslaiman, the creator of Shareflix. I developed this extension as a learning project to deepen my understanding of the WebRTC protocol. For more information, you can visit [my website here](https://adibus.dev).

## Demo

![Demo](https://raw.githubusercontent.com/emmab30/shareflix/main/misc/demo.gif)

-   Image is black because netflix does not allow to record video while you're watching a movie.
-   You can download the entire demo video here: [GitHub](https://raw.githubusercontent.com/emmab30/shareflix/main/misc/demo.mp4)

## Overview

Shareflix is a platform that allows you to watch Netflix with your friends remotely. The project includes a backend built with Express and a frontend for a Chrome extension client using React JS. Shareflix uses WebRTC for participant communication.

## Features

1. Camera activation feature.
2. User-controlled camera adjustment, allowing each camera view to be resized and repositioned.
3. Microphone activation.
4. Individual participant volume control.
5. Voice detection highlights the speaking user’s name in yellow (only if their microphone is active).

## Installation

### Frontend (Chrome Extension)

Navigate to the `extension` folder and run the following commands:

```bash
npm run build   # Compiles the project
npm run watch   # Watches for file changes
npm run dev     # Sets up a development environment
```

### Backend (Server)

Navigate to the `server` folder and run the following commands:

```bash
npm run build   # Builds the server
npm run start   # Starts the server
```

Go to `shared/constants.js` file and set backend URL in `module.exports.WS_URL` (ex: 127.0.0.1:3011)

## Usage

When you access a series or movie on Netflix with the extension enabled, it automatically opens a screen with a 6-digit access code. This code can be shared with up to 4 people to watch a movie together!

Once the backend is set up and npm run build is executed for the frontend:

-   Navigate to `chrome://extensions`
-   Click on 'Load unpacked'
-   Select the `build/` folder

As shown in the following video:

![Demo](https://raw.githubusercontent.com/emmab30/shareflix/main/misc/loading_extension.gif)

## Credits

I started working on this project based on the following repository: [LongDistance](https://github.com/jonnylin13/LongDistance)