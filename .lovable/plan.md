
## Plan de implementación

### Fase 1: Carpetas/Proyectos 🗂️
1. **Nueva tabla `folders`** — nombre, color, icono, user_id, visibilidad (privada/pública)
2. **Agregar `folder_id` a tasks** — una tarea puede pertenecer a una carpeta
3. **Nueva pestaña "Carpetas"** en la barra inferior con ícono de carpeta
4. **UI de carpetas** — crear, editar, eliminar carpetas; ver tareas dentro de cada carpeta
5. **IA auto-clasifica en carpetas** — el clasificador de voz detecta la carpeta adecuada. Si no existe, sugiere crear una nueva

### Fase 2: Tareas Recurrentes 🔄
1. **Nueva tabla `recurrence_rules`** — tipo (diario, semanal, mensual, anual), días específicos, intervalo (cada X), fecha inicio/fin
2. **Agregar `recurrence_id` a tasks** — vincular tarea a su regla de recurrencia
3. **Generación automática** — función que crea las instancias de tareas recurrentes cada día
4. **Detección por voz** — el parser de voz detecta patrones como "todos los lunes", "cada 2 semanas", "el 15 de cada mes"
5. **UI para configurar recurrencia** al crear/editar tarea

### Fase 3: Sistema Colaborativo 👥
1. **Tabla `friendships`** — solicitudes de amistad (pending/accepted/rejected)
2. **Perfiles públicos** — página de perfil compartible con link único
3. **Visibilidad de carpetas** — las carpetas marcadas como públicas son visibles para amigos
4. **Feed de amigos** — ver carpetas públicas y tareas de amigos
5. **Búsqueda de usuarios** — encontrar y agregar amigos por nombre/email

### Orden sugerido
Recomiendo empezar por **Fase 1 (Carpetas)** ya que es la base para las otras dos fases. Luego **Fase 2 (Recurrencia)** y finalmente **Fase 3 (Colaborativo)**.

### Preguntas antes de empezar
- ¿Empezamos con la Fase 1 (Carpetas) primero?
- ¿Las carpetas por defecto que se crean al registrarse serían "Personal" y "Trabajo"?
- Para la parte colaborativa, ¿quieres un sistema simple de amigos o algo más complejo con equipos/organizaciones?
