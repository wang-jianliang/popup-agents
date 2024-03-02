export default interface Agent {
  identifier: string;
  name: string;
  description: string;
  engine: string;
  models: string[];
  tags: string[];
  systemPrompt?: string;
  prompts: {
    [key: string]: string;
  };
  autoSend?: boolean;
  schemaVersion: string;
}
