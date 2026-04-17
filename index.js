require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());

// 🔐 TWILIO
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error("❌ Faltan variables de entorno de Twilio");
  process.exit(1);
}

const client = require('twilio')(accountSid, authToken);

console.log("🚀 Bot iniciado correctamente");

// 📲 NÚMERO TWILIO
const FROM = 'whatsapp:+5215535851799';

// 🧠 MAPA DE AGENTES
const agentes = {
  12: 'whatsapp:+5215543739673',
};

// 🧠 CONTROL
const notificadosMensaje = new Set();
const notificadosAsignacion = new Set();

// 🔥 WEBHOOK
app.post('/webhook/chatwoot', async (req, res) => {
  const data = req.body;

  console.log("🔥 EVENTO:");
  console.log(JSON.stringify(data, null, 2));

  try {
    if (data.event !== 'message_created') {
      return res.sendStatus(200);
    }

    if (data.message_type !== 'incoming') {
      console.log("⏭ No es mensaje entrante");
      return res.sendStatus(200);
    }

    const conversation = data.conversation;
    const agenteId = conversation?.meta?.assignee?.id;

    if (!agenteId) {
      console.log("⏭ Sin agente");
      return res.sendStatus(200);
    }

    const numeroAgente = agentes[agenteId];

    if (!numeroAgente) {
      console.log("⚠️ Agente sin número");
      return res.sendStatus(200);
    }

    const convId = conversation.id;

    // 🔥 1. NOTIFICACIÓN DE ASIGNACIÓN (UNA SOLA VEZ)
    if (!notificadosAsignacion.has(convId)) {
      console.log("👤 Enviando asignación...");

      await client.messages.create({
        from: FROM,
        to: numeroAgente,
        contentSid: 'HX893d4fe0222bc376845904ccb112c866'
      });

      notificadosAsignacion.add(convId);
      console.log("✅ Asignación enviada");
    }

    // 🔥 2. NOTIFICACIÓN DE MENSAJE (SIN DUPLICADOS)
    const claveMensaje = `${convId}-${data.id}`;

    if (notificadosMensaje.has(claveMensaje)) {
      console.log("⏭ Mensaje ya notificado");
      return res.sendStatus(200);
    }

    console.log("📩 Enviando nuevo mensaje...");

    await client.messages.create({
      from: FROM,
      to: numeroAgente,
      contentSid: 'HX199f64110199488a4e9f8cd1d1cfe50c'
    });

    notificadosMensaje.add(claveMensaje);

    console.log("✅ Mensaje enviado");

  } catch (error) {
    console.error("❌ ERROR:");
    console.error(error.message);

    if (error.code) {
      console.error("Código Twilio:", error.code);
    }
  }

  res.sendStatus(200);
});

// 🚀 SERVER
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 Bot corriendo en puerto ${PORT}`);
});
