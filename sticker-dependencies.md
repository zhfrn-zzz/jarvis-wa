# Dependencies Required for Sticker Command

## Install Required Packages

```bash
# Image processing
npm install sharp

# Video processing (requires FFmpeg installed on system)
npm install fluent-ffmpeg
npm install @types/fluent-ffmpeg --save-dev

# File system utilities (already included in Node.js)
# - fs/promises
# - path
# - os
# - crypto
```

## System Requirements

### FFmpeg Installation

**Windows:**
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to system PATH
4. Restart terminal/IDE

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

### Verify Installation

```bash
# Check FFmpeg
ffmpeg -version

# Check Sharp (after npm install)
node -e "console.log(require('sharp'))"
```

## Package.json Updates

Add these to your `package.json`:

```json
{
  "dependencies": {
    "sharp": "^0.32.6",
    "fluent-ffmpeg": "^2.1.2"
  },
  "devDependencies": {
    "@types/fluent-ffmpeg": "^2.1.24"
  }
}
```

## Memory Considerations

Sticker processing can be memory-intensive. Consider:

1. **Process Limits**: Limit concurrent sticker processing
2. **File Size Limits**: Already implemented (1MB images, 2MB videos)
3. **Cleanup**: Temporary files are automatically cleaned up
4. **Error Handling**: Comprehensive error handling prevents crashes

## Performance Tips

1. **Image Quality**: Default 80% quality balances size and quality
2. **Video Duration**: 7-second limit prevents large files
3. **Concurrent Processing**: Consider queuing for high-traffic bots
4. **Caching**: Consider caching processed stickers for repeated requests