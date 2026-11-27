import 'dotenv/config';
import { validateEnv } from './utils/validateEnv.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { startSweeper } from './services/attemptSweeper.js';

const startServer = async () => {
  try {
    const env = validateEnv();
    await connectDB(env.MONGO_URI);

    const app = createApp({ corsOrigins: env.corsOrigins });
    app.listen(env.PORT, () => {
      console.log(
        `[Server] TechnoVerse backend running in ${env.NODE_ENV} mode on port ${env.PORT}`
      );
    });
    if (env.NODE_ENV !== 'test') {
      startSweeper();
    }
  } catch (error) {
    console.error(`[Server Startup Error] ${error.message}`);
    process.exit(1);
  }
};

startServer();
