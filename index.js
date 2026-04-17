require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());

// 🔐 TWILIO
const client = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM = 'whatsapp:+5215535851799';

// 🧠 MAPA DE AGENTES
const agentes = {
  12: 'whatsapp:+5215543739673',
  16: 'whatsapp:+52XXXXXXXXXX', // ← AGREGA AQUÍ
};

// 🧠 CONTROL
const notificadosMensaje = new Set();
const notificadosAsignacion = new Set();

app.post('/webhook/chatwoot', async (req, res) => {
  const data = req.body;

  console.log("🔥 EVENTO:", data.event);

  try {

    // =====================================================
    // 🔥 1. DETECTAR ASIGNACIÓN REAL
    // =====================================================
    if (data.event === 'conversation_updated') {

      const cambios = data.changed_attributes || [];

      const cambioAsignacion = cambios.find(c => c.assignee_id);

      if (cambioAsignacion) {

        const agenteId = cambioAsignacion.assignee_id.current_value;
        const numeroAgente = agentes[agenteId];
        const convId = data.id;

        if (!numeroAgente) {
          console.log("⚠️ Agente sin número:", agenteId);
          return res.sendStatus(200);
        }

        if (notificadosAsignacion.has(convId)) {
          return res.sendStatus(200);
        }

        console.log("👤 Enviando asignación a", agenteId);

        await client.messages.create({
          from: FROM,
          to: numeroAgente,
          contentSid: 'HX893d4fe0222bc376845904ccb112c866',
          contentVariables: "{}"
        });

        notificadosAsignacion.add(convId);

        console.log("✅ Asignación enviada");
      }

      return res.sendStatus(200);
    }

    // =====================================================
    // 🔥 2. MENSAJES ENTRANTES
    // =====================================================
    if (data.event === 'message_created') {

      if (data.message_type !== 'incoming') {
        return res.sendStatus(200);
      }

      const agenteId = data.conversation?.meta?.assignee?.id;
      const numeroAgente = agentes[agenteId];
      const convId = data.conversation?.id;

      if (!agenteId || !numeroAgente) {
        console.log("⚠️ Sin agente válido");
        return res.sendStatus(200);
      }

      const clave = `${convId}-${data.id}`;

      if (notificadosMensaje.has(clave)) {
        return res.sendStatus(200);
      }

      console.log("📩 Notificando mensaje a", agenteId);

      await client.messages.create({
        messagingServiceSid: process.env.TWILIO_ACCOUNT_SID,
        to: numeroAgente,
        contentSid: 'HX199f64110199488a4e9f8cd1d1cfe50c',
        contentVariables: "{}"
      });

      notificadosMensaje.add(clave);

      console.log("✅ Mensaje enviado");
    }

  } catch (error) {
    console.error("❌ ERROR:", error.message);
  }

  res.sendStatus(200);
});

// 🚀 SERVER
app.listen(3000, () => {
  console.log("🚀 Bot corriendo en puerto 3000");
});
