const Sentry = require("@sentry/node");
const { ProfilingIntegration } = require("@sentry/profiling-node");
const TelegramBot = require("node-telegram-bot-api");
const {
  getMaintenanceModeStatus,
  getMessages,
} = require("./snapshotListeners");
const axios = require("axios");
require("dotenv").config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [new ProfilingIntegration()],
  tracesSampleRate: 0,
  profilesSampleRate: 0,
});

const token = process.env.TELEGRAM_TOKEN;
const app_url = process.env.APP_URL;

const bot = new TelegramBot(token, {
  webHook: { port: process.env.PORT },
});
bot.setWebHook(`${app_url}/bot${token}`);

const etaEngineBaseURL = process.env.ENGINE_URL;

// Array to store chat_id of user that has ongoing process
let generating = [];

const forwardToEtaEngine = async (data, endpoint, retries = 3) => {
  const chat_id = endpoint === "process_message" ? data.chat.id : data.from.id;
  try {
    if (retries === 3 && generating.includes(chat_id)) {
      bot.sendMessage(chat_id, getMessages().multitasking_error.english);
      return;
    }

    if (retries === 3) generating.push(chat_id);

    const response = await axios.post(etaEngineBaseURL + endpoint, data);
    if (response.data && response.data.message === "Processed.") {
      console.log("Processed.");
      generating = generating.filter((item) => item !== chat_id);
      return true;
    }
    throw new Error("Failed to process");
  } catch (error) {
    if (process.env.ENVIRONMENT == "production") {
      Sentry.captureException(error);
    }
    if (error.code === "ECONNRESET") {
      if (retries > 0) {
        console.log("Retrying, attempts left: ", retries);
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return forwardToEtaEngine(data, retries - 1);
      } else {
        bot.sendMessage(chat_id, getMessages().processing_error.english);
        generating = generating.filter((item) => item !== chat_id);
        return false;
      }
    } else {
      console.log(error.message);
      bot.sendMessage(chat_id, getMessages().processing_error.english);
      generating = generating.filter((item) => item !== chat_id);
      return false;
    }
  }
};

console.log(`WhisperBridgeTG is listening on port ${process.env.PORT}.`);

bot.on("message", async (msg) => {
  if (getMaintenanceModeStatus())
    return bot.sendMessage(msg.chat.id, getMessages().maintenance_mode.english);
  forwardToEtaEngine(msg, "process_message");
});

bot.on("callback_query", async (callbackQuery) => {
  if (getMaintenanceModeStatus())
    return bot.sendMessage(
      callbackQuery.from.id,
      getMessages().maintenance_mode.english
    );
  forwardToEtaEngine(callbackQuery, "process_callback_query");
});
