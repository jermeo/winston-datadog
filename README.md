# Winston Datadog TCP secure
[![npm](https://img.shields.io/npm/v/@jermeo/winston-datadog.svg)](https://www.npmjs.com/package/@jermeo/winston-datadog) 
[![JavaScript Standard Style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://standardjs.com/)

> TCP transport for [Datadog](https://www.datadoghq.com/) with [Winston](https://github.com/winstonjs/winston)

![npm](https://img.shields.io/npm/dm/@jermeo/winston-datadog)

* Use with Winston 3+
* Typescript support
* Initially forked from [winston-tcp](https://github.com/ahmadnassri/winston-tcp)

## Install

```bash
npm i @jermeo/winston-datadog
```

## API

### Typescript

```typescript

import * as logger from "winston";
import DatadogTcpTransport from "@jermeo/winston-datadog";
const {combine, timestamp } = logger.format;

logger.configure({
    level: 'info',
    format: combine(
        timestamp()
    ),
    transports: [
        new DatadogTcpTransport({
            level: 'info',
            host: 'intake.logs.datadoghq.com',
            port: 10516,
            apiKey : 'DATADOG_API_KEY',
            tags: {
              app: 'my-service',
              env: 'dev'
            }
        })
    ]
});

const greeting = (person: string) => {
    logger.info('Good day ' + person, {service: 'my-service'});
};

greeting('Daniel')

```

### js

```js
const { createLogger, transports } = require('winston');
const winstonTcpDatadog = require('@jermeo/winston-datadog');

const options = {
  console: {
    level: 'debug',
    handleExceptions: true,
    json: true
  },
  datadogOptions: {
    level: 'info',
    host: 'datadog_secure_tcp_endpoint',
    port: datadog_secure_tcp_port, 
    apiKey : 'DATADOG_API_KEY',
    tags: {
      app: 'my-service',
      env: 'dev'
    }
  }
};

const logger = new createLogger({
  transports: [
    new transports.Console(options.console),
    new winstonTcpDatadog(options.datadogOptions)
  ],
  exitOnError: false, // do not exit on handled exceptions
});

// logs needs to be in json
logger.info('message', {service: "service-name", ...})

```

## Options

Name                | Description                                                                   | Default
------------------- | ----------------------------------------------------------------------------- | -------
`host`              | The host to connect to                                                        | none
`port`              | The server port to connect to                                                 | none
`apiKey`            | Your datadog API Key                                                          | none
`reconnectInterval` | Time to pause between disconnect and reconnect (in ms)                        | `1000`
`bufferLength`      | Number of messages to buffer while disconnected, set to `false` for unlimited | `10000`
`tags`              | Tags to send to Datadog                                                       | none

---
> License: [ISC][license-url]  · 

[license-url]: http://choosealicense.com/licenses/isc/

[npm-url]: https://www.npmjs.com/package/@jermeo/winston-datadog
[npm-version]: https://img.shields.io/npm/v/@jermeo/winston-datadog.svg?style=flat-square
[npm-downloads]: https://img.shields.io/npm/dm/@jermeo/winston-datadog.svg?style=flat-square

[dependencyci-url]: https://dependencyci.com/github/jermeo/winston-datadog
[dependencyci-image]: https://dependencyci.com/github/jermeo/winston-datadog/badge?style=flat-square
