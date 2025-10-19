import WebSocket from 'ws';
import { Logger } from 'pino';
import { OpenAIRealtimeClient } from '../stt/openai-realtime';
import { WhisperSTT } from '../stt/whisper';
import { ElevenLabsTTS } from '../tts/elevenlabs';
import { TwilioMediaStream } from './twilio-protocol';
import { AudioBuffer } from '../audio/buffer';
import { redactPII } from '../utils/redact';

export interface WebSocketHandlerConfig {
  callId: string;
  logger: Logger;
  config: {
    openai: {
      apiKey: string;
      model: string;
      useRealtime: boolean;
    };
    elevenlabs: {
      apiKey: string;
      voiceId: string;
    };
    audio: {
      sampleRate: number;
      encoding: string;
    };
  };
}

export class WebSocketHandler {
  private callId: string;
  private logger: Logger;
  private config: WebSocketHandlerConfig['config'];
  private sttClient?: OpenAIRealtimeClient | WhisperSTT;
  private ttsClient?: ElevenLabsTTS;
  private audioBuffer: AudioBuffer;
  private streamSid?: string;
  private callStartTime: Date;
  private transcriptBuffer: Array<{ role: string; text: string; timestamp: Date }> = [];
  private isActive = false;

  constructor(config: WebSocketHandlerConfig) {
    this.callId = config.callId;
    this.logger = config.logger;
    this.config = config.config;
    this.audioBuffer = new AudioBuffer();
    this.callStartTime = new Date();
  }

  async handleMessage(data: any, socket: WebSocket): Promise<void> {
    try {
      const event = data.event;

      switch (event) {
        case 'start':
          await this.handleStart(data, socket);
          break;
        case 'media':
          await this.handleMedia(data);
          break;
        case 'stop':
          await this.handleStop();
          break;
        case 'mark':
          this.logger.debug({ mark: data.mark }, 'Mark received');
          break;
        default:
          this.logger.warn({ event }, 'Unknown event type');
      }
    } catch (error) {
      this.logger.error({ error, data: redactPII(data) }, 'Error handling message');
    }
  }

  private async handleStart(data: any, socket: WebSocket): Promise<void> {
    this.streamSid = data.streamSid;
    this.isActive = true;

    this.logger.info(
      {
        streamSid: this.streamSid,
        callSid: data.start?.callSid,
        from: redactPII({ phone: data.start?.customParameters?.From }),
      },
      'Call started'
    );

    // Initialize STT client
    if (this.config.openai.useRealtime) {
      this.sttClient = new OpenAIRealtimeClient({
        apiKey: this.config.openai.apiKey,
        logger: this.logger.child({ component: 'openai-realtime' }),
        onTranscript: this.handleTranscript.bind(this),
        onError: this.handleSTTError.bind(this),
      });
    } else {
      this.sttClient = new WhisperSTT({
        apiKey: this.config.openai.apiKey,
        logger: this.logger.child({ component: 'whisper' }),
        onTranscript: this.handleTranscript.bind(this),
      });
    }

    // Initialize TTS client
    this.ttsClient = new ElevenLabsTTS({
      apiKey: this.config.elevenlabs.apiKey,
      voiceId: this.config.elevenlabs.voiceId,
      logger: this.logger.child({ component: 'elevenlabs' }),
      onAudio: (audioChunk: Buffer) => this.sendAudioToTwilio(audioChunk, socket),
    });

    await this.sttClient.initialize();
    await this.ttsClient.initialize();
  }

  private async handleMedia(data: any): Promise<void> {
    if (!this.isActive || !this.sttClient) {
      return;
    }

    try {
      const payload = data.media?.payload;
      if (!payload) {
        return;
      }

      // Decode μ-law audio from Twilio
      const audioBuffer = Buffer.from(payload, 'base64');
      this.audioBuffer.append(audioBuffer);

      // Send to STT in chunks
      if (this.audioBuffer.hasEnoughData()) {
        const chunk = this.audioBuffer.consume();
        await this.sttClient.processAudio(chunk);
      }
    } catch (error) {
      this.logger.error({ error }, 'Error handling media');
    }
  }

  private async handleStop(): Promise<void> {
    this.logger.info({ callId: this.callId }, 'Call stopped');
    this.isActive = false;
    await this.cleanup();
  }

  private async handleTranscript(text: string, isFinal: boolean): Promise<void> {
    if (!text.trim()) {
      return;
    }

    this.logger.info(
      {
        text: redactPII({ text }),
        isFinal,
      },
      'Transcript received'
    );

    if (isFinal) {
      this.transcriptBuffer.push({
        role: 'user',
        text,
        timestamp: new Date(),
      });

      // TODO: Send to brain for processing
      // For now, echo back as placeholder
      await this.respondToUser(text);
    }
  }

  private async respondToUser(userText: string): Promise<void> {
    if (!this.ttsClient || !this.isActive) {
      return;
    }

    try {
      // Placeholder response - will be replaced with brain integration
      const response = `I heard you say: ${userText}`;

      this.transcriptBuffer.push({
        role: 'assistant',
        text: response,
        timestamp: new Date(),
      });

      this.logger.info({ response: redactPII({ response }) }, 'Generating response');

      // Generate and stream TTS audio
      await this.ttsClient.synthesize(response);
    } catch (error) {
      this.logger.error({ error }, 'Error responding to user');
    }
  }

  private sendAudioToTwilio(audioChunk: Buffer, socket: WebSocket): void {
    if (!this.isActive || !this.streamSid) {
      return;
    }

    try {
      // Convert audio to μ-law and send to Twilio
      const payload = audioChunk.toString('base64');
      const message: TwilioMediaStream.MediaMessage = {
        event: 'media',
        streamSid: this.streamSid,
        media: {
          payload,
        },
      };

      socket.send(JSON.stringify(message));
    } catch (error) {
      this.logger.error({ error }, 'Error sending audio to Twilio');
    }
  }

  private handleSTTError(error: Error): void {
    this.logger.error({ error }, 'STT error');
    // TODO: Notify user of technical difficulty
  }

  async cleanup(): Promise<void> {
    this.isActive = false;

    try {
      // Close STT connection
      if (this.sttClient) {
        await this.sttClient.close();
        this.sttClient = undefined;
      }

      // Close TTS connection
      if (this.ttsClient) {
        await this.ttsClient.close();
        this.ttsClient = undefined;
      }

      // Save call data
      const duration = (new Date().getTime() - this.callStartTime.getTime()) / 1000;
      this.logger.info(
        {
          callId: this.callId,
          duration,
          transcriptLength: this.transcriptBuffer.length,
        },
        'Call cleanup completed'
      );

      // TODO: Persist transcript to database
    } catch (error) {
      this.logger.error({ error }, 'Error during cleanup');
    }
  }

  getTranscript(): Array<{ role: string; text: string; timestamp: Date }> {
    return [...this.transcriptBuffer];
  }
}
