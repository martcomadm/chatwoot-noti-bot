require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 👤 MAPEO AGENTES (AJUSTA ESTO)
const AGENTES_MAP = {
  12: "whatsapp:+5215543739673",
  2: "whatsapp:+5215522222222"
};

// 🧠 CONTROL
const conversacionesAsignadas = new Set();
const ultimaNotificacionMensaje = new Map();

const COOLDOWN = 2 * 60 * 1000;

// 🔹 ENVIAR TEMPLATE
async function sendTemplate(to, contentSid, variables) {
  try {
    console.log("📦 Enviando a Twilio...");
    console.log("➡️ TO:", to);
    console.log("➡️ FROM:", process.env.TWILIO_FROM);

    const params = new URLSearchParams();
    params.append("To", to);
    params.append("From", process.env.TWILIO_FROM);
    params.append("ContentSid", contentSid);
    params.append("ContentVariables", JSON.stringify(variables));

    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_SID}/Messages.json`,
      params,
      {
        auth: {
          username: process.env.TWILIO_SID,
          password: process.env.TWILIO_AUTH_TOKEN,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("✅ Twilio OK:", response.data.sid);

  } catch (error) {
    console.error("❌ ERROR TWILIO:");
    console.error(error.response?.data || error.message);
  }
}

// 🔹 WEBHOOK DEBUG TOTAL
app.post("/webhook/chatwoot", async (req, res) => {
  console.log("\n==============================");
  console.log("🔥 WEBHOOK RECIBIDO");
  console.log("==============================");

  console.log("📦 BODY COMPLETO:");
  console.log(JSON.stringify(req.body, null, 2));

  const event = req.body.event;
  const messageType = req.body.message_type;
  const conversationId = req.body.conversation?.id;

  console.log("\n📊 VARIABLES CLAVE:");
  console.log("EVENT:", event);
  console.log("MESSAGE TYPE:", messageType);
  console.log("CONVERSATION ID:", conversationId);

  // 🔍 DETECTAR AGENTE DESDE VARIOS LUGARES
  const assignee =
    req.body.meta?.assignee ||
    req.body.conversation?.assignee ||
    req.body.assignee;

  console.log("\n👤 ASSIGNEE DETECTADO:");
  console.log(assignee);

  const assigneeId = assignee?.id;
  console.log("🆔 ASSIGNEE ID:", assigneeId);

  const telefono = AGENTES_MAP[assigneeId];
  console.log("📱 TELEFONO MAP:", telefono);

  try {

    // ===============================
    // 🟡 EVENTO: ASIGNACIÓN
    // ===============================
    if (event === "conversation_updated") {
      console.log("\n🟡 EVENTO: CONVERSATION UPDATED");

      if (!assigneeId) {
        console.log("⛔ SIN AGENTE → no se notifica");
        return res.sendStatus(200);
      }

      if (!telefono) {
        console.log("⛔ AGENTE NO MAPEADO");
        return res.sendStatus(200);
      }

      if (conversacionesAsignadas.has(conversationId)) {
        console.log("⛔ YA NOTIFICADO ANTES");
        return res.sendStatus(200);
      }

      conversacionesAsignadas.add(conversationId);

      const contacto = req.body.meta?.sender?.name || "Cliente";

      console.log("📤 ENVIANDO TEMPLATE ASIGNACIÓN...");

      await sendTemplate(
        telefono,
        "HX893d4fe0222bc376845904ccb112c866",
        { 1: contacto }
      );
    }

    // ===============================
    // 🟢 EVENTO: MENSAJE
    // ===============================
    if (event === "message_created") {
      console.log("\n🟢 EVENTO: MESSAGE CREATED");

      if (messageType !== "incoming") {
        console.log("⛔ NO ES INCOMING → ignorado");
        return res.sendStatus(200);
      }

      if (!assigneeId) {
        console.log("⛔ SIN AGENTE → ignorado");
        return res.sendStatus(200);
      }

      if (!telefono) {
        console.log("⛔ AGENTE NO MAPEADO");
        return res.sendStatus(200);
      }

      const ahora = Date.now();
      const ultima = ultimaNotificacionMensaje.get(conversationId) || 0;

      console.log("⏱️ COOLDOWN CHECK:", ahora - ultima);

      if (ahora - ultima < COOLDOWN) {
        console.log("⛔ COOLDOWN ACTIVO");
        return res.sendStatus(200);
      }

      ultimaNotificacionMensaje.set(conversationId, ahora);

      const mensaje = req.body.message?.content || "Nuevo mensaje";
      const nombre = req.body.meta?.sender?.name || "Cliente";

      console.log("📤 ENVIANDO TEMPLATE MENSAJE...");

      await sendTemplate(
        telefono,
        "HX199f64110199488a4e9f8cd1d1cfe50c",
        {
          1: nombre,
          2: mensaje
        }
      );
    }

    console.log("\n✅ FIN PROCESO");
    res.sendStatus(200);

  } catch (error) {
    console.error("❌ ERROR GENERAL:", error.message);
    res.sendStatus(500);
  }
});

// 🔹 SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Bot corriendo en puerto ${PORT}`);
});
