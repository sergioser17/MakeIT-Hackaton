# Study Gatekeeper

A productivity Chrome Extension that prevents access to distraction websites during study sessions. When navigating to a blocked site, users are redirected to an interception screen requiring them to answer an AI-generated question based on their uploaded study material to unlock a temporary 5-minute break.

## Features

- **Automated Interception**: Instantly detects navigation to distracting domains (YouTube, Instagram, Facebook, Reddit) and redirects to a dedicated gatekeeper screen.
- **AI-Powered Knowledge Check**: Leverages Google Gemini models to generate conceptual questions directly from user-provided notes.
- **Adaptive Answer Verification**: Validates responses against the study text. Correct answers grant a 5-minute break; incorrect answers trigger feedback and require a re-attempt.
- **Break Timer UI**: An injected, floating countdown widget displays the remaining break time directly on the unblocked tab with an option to end the break early.
- **Aesthetic Dark Interface**: Built with Tailwind CSS featuring a glassmorphism theme and responsive state transitions.

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/sergioser17/MakeIT.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the `study-gatekeeper` directory.

## Project Structure

```
study-gatekeeper/
├── manifest.json       # Manifest V3 extension configuration
├── background.js       # Service worker handling navigation and temporary whitelist
├── popup.html/js       # Extension popup to input study material and toggle focus mode
├── block.html/js       # Interception screen, question generation, and answer evaluation
├── content.js          # Injected floating countdown timer
├── input.css           # Tailwind source styling
└── tailwind.css        # Compiled production styles
```
