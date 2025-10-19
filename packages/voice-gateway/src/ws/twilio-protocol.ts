/**
 * Twilio Media Streams WebSocket protocol types
 * Reference: https://www.twilio.com/docs/voice/media-streams
 */

export namespace TwilioMediaStream {
  // Event types
  export type EventType = 'connected' | 'start' | 'media' | 'stop' | 'mark';

  // Base message structure
  export interface BaseMessage {
    event: EventType;
    sequenceNumber?: string;
    streamSid?: string;
  }

  // Connected event - sent when WebSocket connection is established
  export interface ConnectedMessage extends BaseMessage {
    event: 'connected';
    protocol: 'Call';
    version: string;
  }

  // Start event - sent when call begins
  export interface StartMessage extends BaseMessage {
    event: 'start';
    streamSid: string;
    start: {
      streamSid: string;
      accountSid: string;
      callSid: string;
      tracks: ('inbound' | 'outbound')[];
      mediaFormat: {
        encoding: 'audio/x-mulaw' | 'audio/x-pcm';
        sampleRate: number;
        channels: number;
      };
      customParameters?: Record<string, string>;
    };
  }

  // Media event - contains audio data
  export interface MediaMessage extends BaseMessage {
    event: 'media';
    streamSid: string;
    media: {
      track?: 'inbound' | 'outbound';
      chunk?: string;
      timestamp?: string;
      payload: string; // base64-encoded audio
    };
  }

  // Stop event - sent when call ends
  export interface StopMessage extends BaseMessage {
    event: 'stop';
    streamSid: string;
    stop: {
      accountSid: string;
      callSid: string;
    };
  }

  // Mark event - used for timing synchronization
  export interface MarkMessage extends BaseMessage {
    event: 'mark';
    streamSid: string;
    mark: {
      name: string;
    };
  }

  // Union type for all possible messages
  export type Message =
    | ConnectedMessage
    | StartMessage
    | MediaMessage
    | StopMessage
    | MarkMessage;

  // Outbound message types (sent from server to Twilio)
  export interface OutboundMediaMessage {
    event: 'media';
    streamSid: string;
    media: {
      payload: string; // base64-encoded μ-law audio
    };
  }

  export interface OutboundMarkMessage {
    event: 'mark';
    streamSid: string;
    mark: {
      name: string;
    };
  }

  export interface OutboundClearMessage {
    event: 'clear';
    streamSid: string;
  }

  export type OutboundMessage =
    | OutboundMediaMessage
    | OutboundMarkMessage
    | OutboundClearMessage;

  // Audio format constants
  export const AUDIO_ENCODING = {
    MULAW: 'audio/x-mulaw' as const,
    PCM: 'audio/x-pcm' as const,
  };

  export const SAMPLE_RATE = {
    MULAW: 8000,
    PCM_8K: 8000,
    PCM_16K: 16000,
  };

  export const CHANNELS = 1; // Always mono
}
