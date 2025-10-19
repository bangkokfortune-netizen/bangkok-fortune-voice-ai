import 'dotenv/config';

export interface VoiceGatewayConfig {
  openai: {
    apiKey: string;
    model: string;
    useRealtime: boolean;
  };
  elevenlabs: {
    apiKey: string;
    voiceId: string;
    model: string;
  };
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  audio: {
    sampleRate: number;
    encoding: string;
    channels: number;
  };
  server: {
    port: number;
    host: string;
  };
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

function getEnvVarOptional(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export const config: VoiceGatewayConfig = {
  openai: {
    apiKey: getEnvVar('OPENAI_API_KEY'),
    model: getEnvVarOptional('OPENAI_MODEL', 'gpt-4-turbo-preview'),
    useRealtime: getEnvVarOptional('USE_OPENAI_REALTIME', 'true') === 'true',
  },
  elevenlabs: {
    apiKey: getEnvVar('ELEVENLABS_API_KEY'),
    voiceId: getEnvVarOptional(
      'ELEVENLABS_VOICE_ID',
      'EXAVITQu4vr4xnSDxMaL' // Default: Sarah (US Female)
    ),
    model: getEnvVarOptional('ELEVENLABS_MODEL', 'eleven_turbo_v2'),
  },
  twilio: {
    accountSid: getEnvVar('TWILIO_ACCOUNT_SID'),
    authToken: getEnvVar('TWILIO_AUTH_TOKEN'),
    phoneNumber: getEnvVar('TWILIO_PHONE_NUMBER'),
  },
  audio: {
    sampleRate: parseInt(getEnvVarOptional('AUDIO_SAMPLE_RATE', '8000'), 10),
    encoding: getEnvVarOptional('AUDIO_ENCODING', 'audio/x-mulaw'),
    channels: 1,
  },
  server: {
    port: parseInt(getEnvVarOptional('PORT', '3000'), 10),
    host: getEnvVarOptional('HOST', '0.0.0.0'),
  },
};

// Validate critical configuration on startup
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.openai.apiKey) {
    errors.push('OPENAI_API_KEY is required');
  }

  if (!config.elevenlabs.apiKey) {
    errors.push('ELEVENLABS_API_KEY is required');
  }

  if (!config.twilio.accountSid) {
    errors.push('TWILIO_ACCOUNT_SID is required');
  }

  if (!config.twilio.authToken) {
    errors.push('TWILIO_AUTH_TOKEN is required');
  }

  if (!config.twilio.phoneNumber) {
    errors.push('TWILIO_PHONE_NUMBER is required');
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors.join('\n')}`
    );
  }
}
