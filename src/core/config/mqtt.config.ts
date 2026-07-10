import { registerAs } from '@nestjs/config';

export interface IMqttConfig {
  url: string;
  username: string | null;
  password: string | null;
  clientId: string;
}

export const mqttConfig = registerAs('mqtt', (): IMqttConfig => {
  const username = process.env.MQTT_USERNAME?.trim();
  const password = process.env.MQTT_PASSWORD?.trim();

  return {
    url: process.env.MQTT_URL?.trim() || 'mqtt://localhost:1883',
    username: username || null,
    password: password || null,
    clientId: process.env.MQTT_CLIENT_ID?.trim() || 'gardenia-bridge',
  };
});
