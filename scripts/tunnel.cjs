require("dotenv").config();
const ngrok = require("@ngrok/ngrok");

const authtoken = process.env.NGROK_AUTHTOKEN;
const port = parseInt(process.env.PORT || "3000", 10);

if (!authtoken) {
  console.error("❌ Error: NGROK_AUTHTOKEN is missing in your .env file. Please add it to start the tunnel.");
  process.exit(1);
}

async function start() {
  try {
    const listener = await ngrok.forward({
      addr: port,
      authtoken: authtoken,
    });
    const url = listener.url();
    console.log("====================================================");
    console.log("🚀 NGROK TUNNEL ONLINE");
    console.log(`📡 Base URL    : ${url}`);
    console.log(`🔗 Webhook URL : ${url}/api/payment/webhook`);
    console.log("====================================================");
  } catch (err) {
    console.error("❌ Failed to start ngrok tunnel:", err);
    process.exit(1);
  }
}

start();

// Keep event loop alive
setInterval(() => {}, 1000 * 60 * 60);

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
