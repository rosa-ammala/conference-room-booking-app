import { createApp } from "./app.js";
import { createContainer } from "./container.js";
import { env } from "./config/env.js";

const start = async () => {
  try {
    const container = createContainer();
    const app = createApp(container);

    await app.listen({ port: env.port, host: env.host });
    app.log.info(`Server listening on http://${env.host}:${env.port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
