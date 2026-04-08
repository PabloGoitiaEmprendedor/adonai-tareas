## Plan: Adonai AI-Powered + Google Calendar

### Fase 1: Contexto del usuario (base de datos)
- Crear tabla `user_context` para almacenar el perfil contextual del usuario (rol, industria, horarios, prioridades, estilo de trabajo, etc.)
- Agregar flujo de onboarding extendido donde el usuario responde preguntas clave sobre su vida/trabajo
- Opción de importar contexto desde otra IA (campo de texto libre)

### Fase 2: Motor de IA para clasificación automática
- Crear edge function `classify-task` que usa Lovable AI (Gemini) para:
  - Recibir: título de la tarea + contexto del usuario + tareas existentes + eventos del calendario
  - Devolver: importancia, urgencia, prioridad, tiempo estimado, contexto sugerido
- Aplicar metodologías: Eisenhower, "Eat the Frog" (Brian Tracy), time-blocking, Pareto
- El usuario solo dice la tarea y la fecha → la IA hace el resto

### Fase 3: Nuevo flujo de captura
- Simplificar: usuario dicta tarea → IA clasifica → se guarda
- Solo preguntar fecha si no se mencionó en la voz
- Eliminar preguntas manuales de importancia/urgencia
- Mostrar al usuario la clasificación de la IA con opción de ajustar

### Fase 4: Google Calendar (bidireccional)
- Usar Google connector del workspace para OAuth
- Crear edge function para leer eventos del calendario
- Crear edge function para escribir eventos al calendario
- Sincronizar: eventos con hora fija son bloques inamovibles
- Las tareas de Adonai se agendan alrededor de los bloques fijos

### Orden de implementación
1. Tabla user_context + onboarding de contexto
2. Edge function classify-task con Lovable AI
3. Rediseñar flujo de captura (sin preguntas manuales)
4. Integración Google Calendar
