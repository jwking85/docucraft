# DocuCraft

**AI-Powered Documentary Creation Studio**

Transform your documentary scripts into professional video productions.

DocuCraft is a professional web application that streamlines documentary video production using Google's Gemini AI. Create visual storyboards, sync audio timelines, and export production-ready content.

## Features

- **Script Analysis** - AI breaks down documentary scripts into visual scenes with optimal pacing
- **AI Image Generation** - Generate cinematic images using Gemini 2.5 Flash Image or Imagen 4
- **AI Video Generation** - Create video clips with Veo 3.1 (paid tier required, falls back to images)
- **AI Voiceover** - Generate natural narrator voices using Gemini TTS
- **Smart Audio Sync** - Automatically align script segments with audio timestamps
- **Visual Storyboard** - Drag-and-drop interface for scene management
- **Timeline Export** - Export detailed timelines with motion effects and transitions
- **Project Save/Load** - Save entire projects (images, audio, timeline) as portable JSON files

## Tech Stack

- **Frontend:** React 19 + TypeScript
- **Build Tool:** Vite
- **AI:** Google Gemini API (2.0 Flash, 2.5 Flash Image, Imagen 4, Veo 3.1, TTS)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Google Gemini API Key ([Get one here](https://aistudio.google.com/apikey))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jwking85/docucraft.git
   cd docucraft
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file and add your Gemini API key:
   ```
   API_KEY=your_gemini_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## Usage

1. **Add Script** - Paste your documentary script in the left panel
2. **Generate Audio** - Create AI voiceover or upload your own audio file
3. **Analyze & Visualize** - AI breaks down the script into visual scenes
4. **Generate Visuals** - Create AI images/videos or upload your own media for each scene
5. **Sync Audio** - Use Smart Sync to align scenes with audio timestamps
6. **Adjust Timing** - Fine-tune scene durations and transitions
7. **Export Timeline** - Generate production data for video editing software

## File Size Limits

- Maximum upload size: 50MB per file (images, videos, audio)

## API Notes

- **Imagen 4 Ultra**: Requires enabling Imagen API on your Google Cloud project
- **Veo Video Generation**: Requires paid Google Cloud tier (free users fall back to images)

## Contributing

Issues and pull requests welcome! Please report bugs at [GitHub Issues](https://github.com/jwking85/docucraft/issues).

## License

MIT License - feel free to use this project for personal or commercial purposes.
