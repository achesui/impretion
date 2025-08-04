import { GetAssistantByIdResponse } from "@core-service/types";

const traitPrompts = {
  friendliness: [
    "No uses expresiones amistosas ni cercanas.",
    "Sé cordial pero muy reservado.",
    "Mantén un tono amable y respetuoso.",
    "Muestra calidez sin exagerar.",
    "Sé claramente cercano y acogedor.",
    "Exprésate con gran cercanía y afecto.",
  ],
  seriousness: [
    "Usa un lenguaje muy informal y relajado.",
    "Habla de manera casual, con tono ligero.",
    "Mantén equilibrio entre lo informal y lo profesional.",
    "Sé predominantemente serio y profesional.",
    "Usa un tono muy formal y solemne.",
    "Muéstrate extremadamente riguroso y sobrio.",
  ],
  empathy: [
    "Entrega respuestas directas, sin reconocer emociones.",
    "Reacciona brevemente ante sentimientos.",
    "Muestra empatía básica, valida emociones.",
    "Reconoce y comenta sentimientos con atención.",
    "Refleja emociones y ofrece comprensión profunda.",
    "Demuestra empatía plena, anticipándote emocionalmente.",
  ],
  confidence: [
    "Expresa dudas frecuentemente.",
    "Seguro, pero con ciertas reservas.",
    "Tono fiable, pero abierto a revisión.",
    "Seguro y convincente en tus afirmaciones.",
    "Muy seguro, casi sin titubeos.",
    "Totalmente seguro, transmite máxima convicción.",
  ],
  professionalism: [
    "Lenguaje completamente informal.",
    "Profesional mínimo, con tono relajado.",
    "Nivel medio-alto de profesionalismo.",
    "Formal y corporativo en tus frases.",
    "Muy corporativo, preciso y técnico.",
    "Máximo estándar profesional, sin coloquialismos.",
  ],
  patience: [
    "Impaciente, respuestas cortas.",
    "Puede esperar, pero evita repeticiones.",
    "Paciencia moderada, explicas bien.",
    "Paciente, puedes repetir con calma.",
    "Muy paciente, dispuesto a explicar varias veces.",
    "Extremadamente paciente y tolerante a errores.",
  ],
  curiosity: [
    "No haces preguntas al cliente.",
    "Solo preguntas si es estrictamente necesario.",
    "Haces preguntas ocasionales para clarificar.",
    "Interrogas al cliente para entender mejor.",
    "Formulas preguntas abiertas y exploratorias.",
    "Visiblemente inquisitivo, profundizas activamente.",
  ],
  emojis: [
    "No uses emojis.",
    "Usa emojis muy ocasionalmente.",
    "Emoji moderado, no siempre.",
    "Emoji frecuente pero comedido.",
    "Usa emojis casi en cada respuesta.",
    "Emoji constante, en cada frase.",
  ],
} as const;

const verbosityPrompts = {
  brief: "Responde de forma muy concisa, solo lo esencial.",
  normal: "Responde con longitud equilibrada, cubriendo lo necesario.",
  detailed: "Responde con explicaciones completas y detalladas.",
} as const;

const compliancePrompts = {
  standard: "Usa lenguaje empresarial apropiado.",
  high: "Usa lenguaje muy formal, evita afirmaciones sin respaldo.",
  critical: "Sé extremadamente cauteloso, prioriza seguridad y legalidad.",
} as const;

const buildPersonalityContext = (
  personalities: GetAssistantByIdResponse["configuration"]["personalities"]
): string => {
  const traits = [
    traitPrompts.friendliness[personalities.friendliness as number],
    traitPrompts.seriousness[personalities.seriousness as number],
    traitPrompts.empathy[personalities.empathy as number],
    traitPrompts.confidence[personalities.confidence as number],
    traitPrompts.professionalism[personalities.professionalism as number],
    traitPrompts.patience[personalities.patience as number],
    traitPrompts.curiosity[personalities.curiosity as number],
    traitPrompts.emojis[personalities.emojis as number],
    verbosityPrompts[personalities.verbosity as keyof typeof verbosityPrompts],
    compliancePrompts[
      personalities.complianceLevel as keyof typeof compliancePrompts
    ],
  ];

  return traits.join(" ");
};

const buildActionContext = (
  actionType: string,
  configuration: Record<string, any> | undefined
): string => {
  switch (actionType) {
    case "appointment":
      const config = configuration || {};
      let context = `**Gestión de Citas:**
- Agenda, consulta, modifica y cancela citas eficientemente
- Confirma siempre fecha y hora`;

      if (config.schedule?.value) {
        const schedule = config.schedule.value;
        const days = [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ];
        const dayNames = [
          "Lunes",
          "Martes",
          "Miércoles",
          "Jueves",
          "Viernes",
          "Sábado",
          "Domingo",
        ];

        const workingDays = days
          .map((day, index) =>
            schedule[day]?.isEnabled
              ? `${dayNames[index]} ${schedule[day].startTime}-${schedule[day].endTime}`
              : null
          )
          .filter(Boolean);

        if (workingDays.length > 0) {
          context += `\n- Horario de atención: ${workingDays.join(", ")}`;
        }
      }

      // Zona horaria
      if (config.timeZone?.value) {
        context += `\n- Zona horaria: ${config.timeZone.value} (No decirselo al usuario a menos que el lo pregunte explicitamente.)`;
      }

      return context;

    default:
      return "";
  }
};

const buildActionsContext = (
  actions: GetAssistantByIdResponse["linkedActions"]
): string => {
  if (!actions || actions.length === 0) {
    return "";
  }

  const contexts = actions
    .map((actionItem) =>
      buildActionContext(
        actionItem.action.type,
        actionItem.action.configuration?.configuration
      )
    )
    .filter(Boolean);

  return contexts.length > 0 ? contexts.join("\n\n") : "";
};

export function organizationalPrompt(
  basePrompt: string,
  actions: GetAssistantByIdResponse["linkedActions"],
  personalities: GetAssistantByIdResponse["configuration"]["personalities"]
): string {
  const personalityContext = buildPersonalityContext(personalities);
  const actionsContext = buildActionsContext(actions);

  return `**PERSONALIDAD Y COMPORTAMIENTO:**
${personalityContext}

**CONTEXTO ORGANIZACIONAL:**
${basePrompt.trim()}${
    actionsContext
      ? `

**CAPACIDADES Y ACCIONES DISPONIBLES:**
${actionsContext}`
      : ""
  }

**DIRECTRICES OPERATIVAS:**
• Ejecuta acciones apropiadas según el contexto de la conversación
• Solicita confirmación para acciones críticas o irreversibles
• Proporciona feedback claro sobre el resultado de cada acción ejecutada

**PROTOCOLO DE INTERACCIÓN:**
• Ofrece alternativas cuando la acción solicitada no esté disponible
• Finaliza cada interacción confirmando si se necesita algo más`;
}
