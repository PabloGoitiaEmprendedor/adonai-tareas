const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-[700px] mx-auto px-6 py-12 space-y-8">
        <h1 className="text-2xl font-bold">Política de Privacidad</h1>
        <p className="text-sm text-muted-foreground">Última actualización: 11 de mayo de 2026</p>
        <p className="text-sm text-muted-foreground">Esta política aplica a la aplicación de escritorio Adonai para Windows y Mac.</p>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">1. Información que recopilamos</h2>
          <p>Adonai recopila la siguiente información para ofrecer una experiencia personalizada de productividad:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Datos de cuenta:</strong> nombre, correo electrónico y foto de perfil proporcionados a través de Google Sign-In.</li>
            <li><strong>Datos de Google Calendar:</strong> eventos de tu calendario para ayudarte a planificar tu día. Accedemos con permisos de lectura y escritura que autorizas explícitamente.</li>
            <li><strong>Datos de contexto personal:</strong> información que proporcionas voluntariamente durante el registro (ocupación, industria, metas, nivel de estrés, etc.) para personalizar las recomendaciones de la IA.</li>
            <li><strong>Tareas y metas:</strong> las tareas, objetivos y prioridades que creas dentro de la aplicación.</li>
            <li><strong>Entradas de voz:</strong> transcripciones de comandos de voz para crear y gestionar tareas. El audio no se almacena; solo se procesa la transcripción.</li>
            <li><strong>Archivos subidos:</strong> documentos de contexto que subes voluntariamente (PDF, DOC, TXT, etc.) con un límite de 5MB.</li>
            <li><strong>Datos de uso:</strong> métricas anónimas de uso como rachas de actividad y patrones de uso para mejorar el servicio.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">2. Cómo usamos tu información</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Personalizar recomendaciones y priorización inteligente de tareas mediante IA.</li>
            <li>Sincronizar y mostrar eventos de tu Google Calendar dentro de la app.</li>
            <li>Generar resúmenes diarios y semanales de productividad.</li>
            <li>Mejorar la precisión del asistente de voz.</li>
            <li>Enviar notificaciones y recordatorios (si los activas).</li>
            <li>Analizar patrones de uso agregados para mejorar el producto.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">3. Uso de datos de Google</h2>
          <p>El uso y la transferencia a cualquier otra aplicación de la información recibida de las API de Google se adhiere a la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Política de datos de usuario de los servicios de API de Google</a>, incluidos los requisitos de uso limitado.</p>
          <p>Específicamente:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Solo accedemos a los datos de Google Calendar necesarios para la funcionalidad de la app.</li>
            <li>No vendemos datos de Google a terceros.</li>
            <li>No usamos datos de Google para publicidad.</li>
            <li>No transferimos datos de Google a terceros sin tu consentimiento explícito.</li>
            <li>Los datos de calendario solo se almacenan mientras sean necesarios para mostrar tu agenda.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">4. Almacenamiento y seguridad</h2>
          <p>Tus datos se almacenan de forma segura en servidores protegidos con cifrado en tránsito (TLS) y en reposo. Implementamos políticas de seguridad a nivel de fila (RLS) en nuestra base de datos para garantizar que solo tú puedas acceder a tus datos. Retenemos tus datos mientras mantengas una cuenta activa. Si eliminas tu cuenta, todos tus datos se borran en un plazo de 30 días.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">5. Base legal y cumplimiento (GDPR / CCPA)</h2>
          <p>Si resides en el Espacio Económico Europeo, procesamos tus datos bajo las siguientes bases legales:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Consentimiento:</strong> para el uso de Google Calendar, entrada de voz y recomendaciones personalizadas.</li>
            <li><strong>Interés legítimo:</strong> para mejorar el servicio mediante análisis de uso agregado.</li>
            <li><strong>Ejecución de un contrato:</strong> para proveer el servicio que solicitaste al registrarte.</li>
          </ul>
          <p>Si resides en California (EE.UU.), tienes derecho a solicitar la eliminación de tus datos y a optar por no vender tu información personal. No vendemos información personal de ningún usuario.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">6. Compartir información</h2>
          <p>No vendemos, alquilamos ni compartimos tu información personal con terceros, excepto:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Proveedores de servicios necesarios para operar la app (Supabase para almacenamiento, Google para autenticación y calendario, proveedor de IA para recomendaciones).</li>
            <li>Cuando lo requiera la ley o una orden judicial.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">7. Tus derechos</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Acceder, corregir o eliminar tus datos personales en cualquier momento desde la sección de Perfil.</li>
            <li>Revocar el acceso a Google Calendar desde la configuración de tu cuenta de Google.</li>
            <li>Solicitar la exportación de tus datos en formato portable.</li>
            <li>Eliminar tu cuenta y todos los datos asociados.</li>
            <li>Desactivar notificaciones y entrada de voz desde la configuración.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">8. Cookies y tecnologías similares</h2>
          <p>Utilizamos almacenamiento local del navegador únicamente para mantener tu sesión activa y tus preferencias. No utilizamos cookies de seguimiento, cookies de terceros ni herramientas de análisis externo que recopilen datos personales.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">9. Datos de niños</h2>
          <p>Adonai no está dirigida a menores de 13 años. No recopilamos intencionadamente información de niños. Si descubrimos que un menor nos ha proporcionado datos personales, los eliminaremos inmediatamente.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">10. Cambios a esta política</h2>
          <p>Notificaremos cualquier cambio significativo a través de la aplicación y actualizaremos la fecha de "Última actualización" al inicio de esta página.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">11. Contacto</h2>
          <p>Si tienes preguntas sobre esta política de privacidad, puedes contactarnos en:</p>
          <p className="mt-2">
            Email: <a href="mailto:support@adonai-app.com" className="text-primary underline">support@adonai-app.com</a>
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
