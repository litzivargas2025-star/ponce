import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import JSZip from "jszip";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.resolve(process.cwd(), "public")));

const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "mente_adolescente_db.json");

interface UsuarioAdolescente {
  id: number;
  nombre_completo: string;
  apodo: string;
  edad: number;
  correo: string;
  password_hash: string;
  emocion_frecuente: "Miedo" | "Tristeza" | "Ansiedad" | "Enojo" | "Inseguridad";
  situacion_actual: string;
  fecha_registro: string;
}

interface SesionLogin {
  id: number;
  usuario_id: number;
  correo: string;
  frase_asignada: string;
  fecha_ingreso: string;
}

interface ResultadoEmocional {
  id: number;
  usuario_id: number;
  actividad: string;
  puntos_empatia: number;
  emocion_trabajada: string;
  detalle_resultado: string;
  fecha_registro: string;
}

interface PlanBienestar {
  usuario_id: number;
  emocion_a_trabajar: string;
  situacion_resolver: string;
  estrategia_1: string;
  estrategia_2: string;
  estrategia_3: string;
  como_ser_feliz: string;
  frase_motivacional: string;
  codigo_certificado: string;
}

interface DualDatabase {
  db_registro_adolescente: {
    usuarios_adolescentes: UsuarioAdolescente[];
  };
  db_seguimiento_emocional: {
    sesiones_login: SesionLogin[];
    resultados_emocionales: ResultadoEmocional[];
    plan_bienestar: PlanBienestar[];
  };
}

function hashPassword(pwd: string): string {
  return crypto.createHash("sha256").update(pwd + "_mente_adolescente").digest("hex");
}

function obtenerPlanesPorEmocion(emocion: string) {
  const planes: Record<string, { situacion: string; e1: string; e2: string; e3: string; felicidad: string; frase: string }> = {
    Miedo: {
      situacion: "Afrontar la inseguridad y el miedo al error o al rechazo en la escuela y grupo social.",
      e1: "Practica la respiración 4-4-6 (inhala 4s, sostén 4s, exhala 6s) para bajar el ritmo cardíaco.",
      e2: "Aplica la técnica de anclaje 5-4-3-2-1 para volver al presente cuando la mente anticipe catástrofes.",
      e3: "Da un paso pequeño progresivo en lugar de evitar por completo lo que te asusta.",
      felicidad: "Puedes ser feliz entendiendo que la valentía no es ausencia de miedo, sino caminar con él a tu ritmo, celebrando tu autenticidad y pidiendo apoyo cuando lo necesites.",
      frase: "Sé tú, sin pedir permiso. El miedo te protege, pero tú decides hasta dónde avanzar."
    },
    Tristeza: {
      situacion: "Transitar momentos de desánimo, duelos afectivos o sensación de soledad sin aislarte.",
      e1: "Permítete llorar o escribir en un diario emocional durante 15 minutos sin juzgarte.",
      e2: "Comparte lo que sientes con una persona de confianza (amistad, familiar o orientador).",
      e3: "Realiza una micro-acción de autocuidado: caminata breve, música suave o hidratación.",
      felicidad: "Puedes ser feliz abrazando tus días grises con compasión, recordando que ninguna emoción es permanente y que pedir ayuda es un acto de fortaleza.",
      frase: "Eres suficiente tal como eres; hasta las nubes cargadas dejan crecer flores nuevas."
    },
    Ansiedad: {
      situacion: "Calmar la sobrecarga mental por exámenes, redes sociales y expectativas del futuro.",
      e1: "Limita la revisión de notificaciones y date pausas de 20 minutos lejos de las pantallas.",
      e2: "Escribe tus preocupaciones y sepáralas en 'lo que puedo controlar hoy' y 'lo que no'.",
      e3: "Libera tensión muscular estirando hombros, cuello y mandíbula suavemente.",
      felicidad: "Puedes ser feliz viviendo un día a la vez, desconectando tu valor personal de las calificaciones o los likes.",
      frase: "Tu valor no es un número. Respira profundo y confía en tu propio ritmo."
    },
    Enojo: {
      situacion: "Transformar la frustración o injusticia en límites claros sin herirte ni herir a otros.",
      e1: "Toma una pausa de 90 segundos antes de responder cuando sientas calor o tensión.",
      e2: "Usa mensajes en primera persona: 'Me siento frustrado cuando...' en vez de acusar.",
      e3: "Canaliza la energía física con deporte, dibujo o caminata rápida.",
      felicidad: "Puedes ser feliz usando tu fuerza emocional para defender tus valores con respeto, calma y firmeza.",
      frase: "Habla bonito de ti y defiende tu paz con respeto y claridad."
    },
    Inseguridad: {
      situacion: "Fortalecer la autoestima frente a comparaciones constantes en redes y grupos.",
      e1: "Reemplaza el diálogo interno crítico por cómo le hablarías a tu mejor amigo.",
      e2: "Anota cada noche 3 cosas reales que hiciste bien o que te gustan de tu forma de ser.",
      e3: "Deja de seguir cuentas que te generan comparación y prioriza vínculos reales.",
      felicidad: "Puedes ser feliz reconociendo que tu historia, tu cuerpo y tu mente son únicos e irrepetibles.",
      frase: "No encajes, destaca. Tu autenticidad es tu mayor superpoder."
    }
  };
  return planes[emocion] ?? planes.Miedo;
}

function loadDb(): DualDatabase {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const initial: DualDatabase = {
      db_registro_adolescente: {
        usuarios_adolescentes: [
          {
            id: 1,
            nombre_completo: "Sofía Valentina Morales",
            apodo: "Sofi",
            edad: 16,
            correo: "sofia@mente.edu",
            password_hash: hashPassword("123456"),
            emocion_frecuente: "Miedo",
            situacion_actual: "Siento nervios intensos antes de exponer frente al salón y me preocupa qué piensen de mí.",
            fecha_registro: new Date().toISOString()
          }
        ]
      },
      db_seguimiento_emocional: {
        sesiones_login: [],
        resultados_emocionales: [
          {
            id: 1,
            usuario_id: 1,
            actividad: "Sopa de Letras",
            puntos_empatia: 25,
            emocion_trabajada: "Miedo",
            detalle_resultado: "Completó las palabras clave de regulación emocional en 100%.",
            fecha_registro: new Date().toISOString()
          },
          {
            id: 2,
            usuario_id: 1,
            actividad: "Mapa Corporal de las Emociones",
            puntos_empatia: 25,
            emocion_trabajada: "Tristeza",
            detalle_resultado: "Identificó opresión en el pecho y practicó respiración profunda.",
            fecha_registro: new Date().toISOString()
          }
        ],
        plan_bienestar: [
          {
            usuario_id: 1,
            emocion_a_trabajar: "Miedo",
            situacion_resolver: "Superar el temor al juicio social cuando expresas tus ideas en clase o con amigos.",
            estrategia_1: "Respiración 4-4-6 antes de hablar para calmar el sistema nervioso.",
            estrategia_2: "Divide el reto en pasos pequeños: primero habla con un amigo cercano.",
            estrategia_3: "Cambia el 'qué dirán' por 'qué quiero aportar hoy'.",
            como_ser_feliz: "La felicidad en la adolescencia nace cuando te permites equivocarte sin castigarte, te rodeas de personas que respetan tus límites y celebras cada paso valiente.",
            frase_motivacional: "Sé tú, sin pedir permiso. Tu voz importa incluso cuando tiembla.",
            codigo_certificado: "MA-2026-0001"
          }
        ]
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function saveDb(db: DualDatabase) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// API: Registro (db_registro_adolescente)
app.post("/api/registrar", (req, res) => {
  const { nombre_completo, apodo, edad, correo, password, emocion_frecuente, situacion_actual } = req.body ?? {};
  if (!nombre_completo || !apodo || !correo || !password || !situacion_actual) {
    return res.status(400).json({ ok: false, error: "Por favor completa todos los campos obligatorios." });
  }
  const edadNum = Number(edad);
  if (Number.isNaN(edadNum) || edadNum < 13 || edadNum > 18) {
    return res.status(400).json({ ok: false, error: "La edad debe estar entre 13 y 18 años." });
  }

  const db = loadDb();
  const exists = db.db_registro_adolescente.usuarios_adolescentes.find(
    (u) => u.correo.toLowerCase() === String(correo).trim().toLowerCase()
  );
  if (exists) {
    return res.status(409).json({ ok: false, error: "Este correo ya está registrado. Intenta iniciar sesión." });
  }

  const nextId =
    db.db_registro_adolescente.usuarios_adolescentes.reduce((max, u) => Math.max(max, u.id), 0) + 1;

  const newUser: UsuarioAdolescente = {
    id: nextId,
    nombre_completo: String(nombre_completo).trim(),
    apodo: String(apodo).trim(),
    edad: edadNum,
    correo: String(correo).trim().toLowerCase(),
    password_hash: hashPassword(String(password)),
    emocion_frecuente: emocion_frecuente || "Miedo",
    situacion_actual: String(situacion_actual).trim(),
    fecha_registro: new Date().toISOString()
  };

  db.db_registro_adolescente.usuarios_adolescentes.push(newUser);

  const planDef = obtenerPlanesPorEmocion(newUser.emocion_frecuente);
  const newPlan: PlanBienestar = {
    usuario_id: nextId,
    emocion_a_trabajar: newUser.emocion_frecuente,
    situacion_resolver: newUser.situacion_actual || planDef.situacion,
    estrategia_1: planDef.e1,
    estrategia_2: planDef.e2,
    estrategia_3: planDef.e3,
    como_ser_feliz: planDef.felicidad,
    frase_motivacional: planDef.frase,
    codigo_certificado: `MA-${new Date().getFullYear()}-${String(nextId).padStart(4, "0")}`
  };
  db.db_seguimiento_emocional.plan_bienestar.push(newPlan);
  saveDb(db);

  res.json({
    ok: true,
    mensaje: `¡Registro guardado en db_registro_adolescente para ${newUser.apodo}!`,
    usuario: {
      id: newUser.id,
      nombre_completo: newUser.nombre_completo,
      apodo: newUser.apodo,
      edad: newUser.edad,
      correo: newUser.correo,
      emocion_frecuente: newUser.emocion_frecuente
    }
  });
});

// API: Login (db_seguimiento_emocional)
app.post("/api/login", (req, res) => {
  const { correo, password } = req.body ?? {};
  if (!correo || !password) {
    return res.status(400).json({ ok: false, error: "Ingresa tu correo y contraseña." });
  }
  const db = loadDb();
  const user = db.db_registro_adolescente.usuarios_adolescentes.find(
    (u) => u.correo.toLowerCase() === String(correo).trim().toLowerCase()
  );
  if (!user || user.password_hash !== hashPassword(String(password))) {
    return res.status(401).json({ ok: false, error: "Correo o contraseña incorrectos." });
  }

  const frases = [
    "Sé tú, sin pedir permiso. Tu autenticidad vale oro.",
    "Tu valor no es un número ni la opinión de los demás.",
    "Eres suficiente tal como eres, incluso en tus días difíciles.",
    "Habla bonito de ti: tu mente escucha cada palabra que te dices.",
    "No encajes, destaca. Tu historia apenas está comenzando."
  ];
  const fraseHoy = frases[Math.floor(Math.random() * frases.length)];
  const nextLogId = db.db_seguimiento_emocional.sesiones_login.reduce((m, s) => Math.max(m, s.id), 0) + 1;

  db.db_seguimiento_emocional.sesiones_login.push({
    id: nextLogId,
    usuario_id: user.id,
    correo: user.correo,
    frase_asignada: fraseHoy,
    fecha_ingreso: new Date().toISOString()
  });
  saveDb(db);

  const plan = db.db_seguimiento_emocional.plan_bienestar.find((p) => p.usuario_id === user.id);
  const resultados = db.db_seguimiento_emocional.resultados_emocionales.filter((r) => r.usuario_id === user.id);

  res.json({
    ok: true,
    usuario: {
      id: user.id,
      nombre_completo: user.nombre_completo,
      apodo: user.apodo,
      edad: user.edad,
      correo: user.correo,
      emocion_frecuente: user.emocion_frecuente
    },
    plan,
    resultados
  });
});

// API: Panel del usuario
app.get("/api/panel/:userId", (req, res) => {
  const uid = Number(req.params.userId);
  const db = loadDb();
  const user = db.db_registro_adolescente.usuarios_adolescentes.find((u) => u.id === uid);
  if (!user) return res.status(404).json({ ok: false, error: "Usuario no encontrado." });
  const plan = db.db_seguimiento_emocional.plan_bienestar.find((p) => p.usuario_id === uid);
  const resultados = db.db_seguimiento_emocional.resultados_emocionales.filter((r) => r.usuario_id === uid);
  res.json({
    ok: true,
    usuario: {
      id: user.id,
      nombre_completo: user.nombre_completo,
      apodo: user.apodo,
      edad: user.edad,
      correo: user.correo,
      emocion_frecuente: user.emocion_frecuente
    },
    plan,
    resultados
  });
});

// API: Guardar resultado de juego/dinámica
app.post("/api/resultados", (req, res) => {
  const { usuario_id, actividad, puntos_empatia, emocion_trabajada, detalle_resultado } = req.body ?? {};
  if (!usuario_id || !actividad) {
    return res.status(400).json({ ok: false, error: "Faltan datos de actividad." });
  }
  const db = loadDb();
  const nextId = db.db_seguimiento_emocional.resultados_emocionales.reduce((m, r) => Math.max(m, r.id), 0) + 1;
  const nuevo: ResultadoEmocional = {
    id: nextId,
    usuario_id: Number(usuario_id),
    actividad: String(actividad),
    puntos_empatia: Number(puntos_empatia || 25),
    emocion_trabajada: String(emocion_trabajada || "General"),
    detalle_resultado: String(detalle_resultado || "Dinámica completada."),
    fecha_registro: new Date().toISOString()
  };
  db.db_seguimiento_emocional.resultados_emocionales.unshift(nuevo);
  saveDb(db);
  res.json({ ok: true, resultado: nuevo });
});

// API: Descargar Proyecto Completo XAMPP (PHP + MySQL + Media) en .ZIP
app.get("/api/download-xampp-zip", async (_req, res) => {
  try {
    const zip = new JSZip();
    const rootFolder = zip.folder("mente_adolescente");
    if (!rootFolder) throw new Error("No se pudo crear la carpeta del ZIP.");

    const xamppDir = path.resolve(process.cwd(), "xampp_package");
    const addFolderRecursive = (dirPath: string, zipTarget: JSZip) => {
      if (!fs.existsSync(dirPath)) return;
      for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
        const full = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          const sub = zipTarget.folder(entry.name);
          if (sub) addFolderRecursive(full, sub);
        } else {
          zipTarget.file(entry.name, fs.readFileSync(full));
        }
      }
    };

    addFolderRecursive(xamppDir, rootFolder);

    const imgFolder = rootFolder.folder("img");
    const publicImg = path.resolve(process.cwd(), "public/img");
    if (imgFolder && fs.existsSync(publicImg)) {
      addFolderRecursive(publicImg, imgFolder);
    }

    const assetsAistudioFolder = rootFolder.folder("assets")?.folder("aistudio");
    const publicAssetsAistudio = path.resolve(process.cwd(), "public/assets/aistudio");
    const neededAssets = [
      "image_e825220e.png",
      "image_24a96a09.png",
      "image_a917772b.png"
    ];
    if (assetsAistudioFolder && fs.existsSync(publicAssetsAistudio)) {
      for (const fname of neededAssets) {
        const full = path.join(publicAssetsAistudio, fname);
        if (fs.existsSync(full)) {
          assetsAistudioFolder.file(fname, fs.readFileSync(full));
        }
      }
    }

    const videoFolder = rootFolder.folder("video");
    const publicVideo = path.resolve(process.cwd(), "public/video");
    if (videoFolder && fs.existsSync(publicVideo)) {
      addFolderRecursive(publicVideo, videoFolder);
    }

    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="Mente_Adolescente_XAMPP_Completo.zip"');
    res.send(buffer);
  } catch (err) {
    console.error("Error generando ZIP:", err);
    res.status(500).json({ ok: false, error: "Error generando el archivo .zip de XAMPP." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mente Adolescente server running on http://localhost:${PORT}`);
  });
}

startServer();
