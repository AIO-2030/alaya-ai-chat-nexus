# ElevenLabs Integration Setup Guide

## Overview

This project integrates with ElevenLabs Conversational AI for voice chat functionality. Users can have real-time voice conversations with AI agents.

## Setup Requirements

### 1. ElevenLabs Account
- Create an account at [ElevenLabs](https://elevenlabs.io/)
- Navigate to Conversational AI section
- Create or select an AI Agent

### 2. Environment Variables

Create a `.env.local` file in the project root with:

```env
VITE_ELEVENLABS_API_KEY=your_api_key_here
```

**Note**: The API key is required for private agents. For public agents, you can leave this empty.

### 3. Agent Configuration

#### Public Agent (Recommended for Testing)
- Set Agent to public in ElevenLabs dashboard
- Copy the Agent ID (starts with `agent_`)
- Update the `agentId` prop in `ElevenLabsVoiceChat` component

#### Private Agent
- Configure authentication settings in ElevenLabs dashboard
- Ensure API key is properly set in environment variables
- Test the agent in ElevenLabs dashboard first

## Usage

### Basic Implementation

```tsx
import ElevenLabsVoiceChat from '@/components/ElevenLabsVoiceChat';

function App() {
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  const handleVoiceMessageReceived = (message: string) => {
    console.log('User message:', message);
  };

  const handleAgentMessage = (message: string) => {
    console.log('AI response:', message);
  };

  return (
    <ElevenLabsVoiceChat 
      agentId="agent_your_agent_id_here"
      onMessageReceived={handleVoiceMessageReceived}
      onAgentMessage={handleAgentMessage}
      isVoiceMode={isVoiceMode}
      onVoiceModeChange={setIsVoiceMode}
    />
  );
}
```

### Features

- **Voice Chat**: Real-time voice conversation with AI agent
- **Text Chat**: Fallback text messaging option
- **Session Management**: Start/stop voice sessions
- **Message History**: Persistent chat history
- **Status Monitoring**: Real-time connection and speaking status

## Troubleshooting

### Common Issues

#### 1. Connection Immediately Disconnects
**Cause**: Usually a configuration issue
**Solutions**:
- Verify Agent ID is correct and starts with `agent_`
- Check if Agent is properly configured in ElevenLabs
- Ensure Agent status is "active"
- Test Agent in ElevenLabs dashboard first

#### 2. Microphone Permission Denied
**Cause**: Browser permission denied
**Solutions**:
- Allow microphone permission in browser settings
- Ensure using HTTPS or localhost
- Check browser console for permission errors

#### 3. API Key Issues
**Cause**: Missing or incorrect API key
**Solutions**:
- Verify `VITE_ELEVENLABS_API_KEY` is set correctly
- Check API key validity in ElevenLabs dashboard
- Ensure API key has proper permissions

#### 4. Network Connection Issues
**Cause**: WebSocket connection problems
**Solutions**:
- Check network connectivity
- Verify no firewall/proxy blocking WebSocket connections
- Check browser console for network errors

### Debug Steps

1. Open browser developer tools
2. Check Console tab for error messages
3. Check Network tab for WebSocket connections
4. Verify all configuration parameters
5. Test with ElevenLabs dashboard first

## API Reference

### Props

- `agentId`: ElevenLabs Agent ID (required)
- `className`: Additional CSS classes
- `onMessageReceived`: Callback for user messages
- `onAgentMessage`: Callback for AI agent responses
- `isVoiceMode`: Current voice mode state
- `onVoiceModeChange`: Callback for voice mode changes

### Methods

- `startSession()`: Begin voice conversation
- `endSession()`: End voice conversation
- `clearChatHistory()`: Clear message history

### Events

- `onConnect`: Fired when connected to agent
- `onDisconnect`: Fired when disconnected
- `onMessage`: Fired when message received
- `onError`: Fired when error occurs
- `onStatusChange`: Fired when status changes

## Performance Considerations

- Voice sessions maintain WebSocket connections
- Messages are stored in component state
- Auto-scroll ensures latest messages are visible
- Efficient re-rendering with React hooks

## Security Notes

- API keys should never be committed to version control
- Use environment variables for sensitive configuration
- Private agents require proper authentication
- Public agents are accessible without API keys

## Getting Help

If issues persist:
- Check ElevenLabs official documentation
- Contact ElevenLabs support
- Review browser console for detailed error messages
- Test with minimal configuration first 