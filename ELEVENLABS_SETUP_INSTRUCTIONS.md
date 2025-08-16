# ElevenLabs Integration Setup Instructions

## Overview

This project has integrated ElevenLabs Conversational AI to provide real voice and text conversation capabilities. Users can have real-time conversations with AI agents.

## Setup Steps

### 1. Get ElevenLabs API Key

1. Visit [ElevenLabs](https://elevenlabs.io/) and create an account
2. Navigate to the Conversational AI section
3. Create or select an AI agent
4. Get the API key from settings

### 2. Configure Environment Variables

1. Copy the `env.example` file to `.env.local`:
   ```bash
   cp env.example .env.local
   ```

2. Edit the `.env.local` file and add your API key:
   ```env
   VITE_ELEVENLABS_API_KEY=your_actual_api_key_here
   ```

### 3. Verify Configuration

After starting the development server, the chat popup header will display the ElevenLabs status:
- 🟢 **Green dot** + "ElevenLabs Ready" = Configuration correct
- 🔴 **Red dot** + "ElevenLabs Not Configured" = API key configuration needed

## Features

### ✅ Implemented
- Real ElevenLabs API calls
- Text message sending to ElevenLabs
- Voice message sending to ElevenLabs
- Configuration status checking
- Error handling and user feedback

### 🔄 To Be Improved
- Parse real AI responses from ElevenLabs
- Streaming response handling
- Conversation history synchronization

## Testing

1. Ensure the correct API key is set
2. Start the development server: `npm run dev`
3. Click "Start Chat" to open the chat popup
4. Check the ElevenLabs status indicator in the header
5. Try sending text or voice messages

## Troubleshooting

### Common Issues

#### 1. "ElevenLabs Not Configured" Error
**Cause**: API key not set
**Solutions**:
- Check if `.env.local` file exists
- Confirm `VITE_ELEVENLABS_API_KEY` is correctly set
- Restart the development server

#### 2. API Call Failure
**Cause**: Invalid API key or network issues
**Solutions**:
- Verify API key validity in ElevenLabs console
- Check network connection
- View error messages in browser console

#### 3. Voice Recording Issues
**Cause**: Browser permissions or device issues
**Solutions**:
- Allow browser microphone access
- Check if audio devices are working properly
- Ensure using HTTPS or localhost

## Technical Architecture

```
Index.tsx (Main Page)
├── ChatBox (Chat Interface)
├── ElevenLabsService (API Service)
└── ElevenLabsVoiceChat (Voice Component)
```

- **ElevenLabsService**: Handles all ElevenLabs API calls
- **ChatBox**: Provides user interface and message display
- **Index.tsx**: Coordinates components and state management

## Next Steps Development

1. Implement real AI response parsing
2. Add streaming response support
3. Integrate conversation history management
4. Optimize error handling and retry mechanisms
5. Add voice synthesis functionality

## Support

If you encounter issues:
1. Check error messages in browser console
2. Verify ElevenLabs configuration
3. Refer to ElevenLabs official documentation
4. Contact project maintainers 