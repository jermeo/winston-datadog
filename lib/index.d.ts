import * as Transport from 'winston-transport'

interface DatadogTcpTransportOptions extends Transport.TransportStreamOptions {
    host: string,
    port: number,
    apiKey: string,
    level?: string,
    reconnectInterval?: number,
    reconnectAttempts?: number,
    bufferLength?: number,
    tags?: {}
}

declare class DatadogTcpTransport extends Transport {
  constructor(options: DatadogTcpTransportOptions);
}

export = DatadogTcpTransport
