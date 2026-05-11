const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-[700px] mx-auto px-6 py-12 space-y-8">
        <h1 className="text-2xl font-bold">Términos y Condiciones de Servicio</h1>
        <p className="text-sm text-muted-foreground">Última actualización: 11 de mayo de 2026</p>
        <p className="text-sm text-muted-foreground">Estos términos aplican a la aplicación de escritorio Adonai para Windows y Mac.</p>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">1. Aceptación de los términos</h2>
          <p>Al descargar, instalar o utilizar Adonai ("la Aplicación"), aceptas estar sujeto a estos Términos y Condiciones de Servicio. Si no estás de acuerdo con alguno de estos términos, no debes descargar ni utilizar la Aplicación.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">2. Descripción del servicio</h2>
          <p>Adonai es una aplicación de productividad contextual de escritorio que ofrece:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Gestión inteligente de tareas con priorización asistida por IA.</li>
            <li>Captura de tareas por voz.</li>
            <li>Integración con Google Calendar para sincronizar eventos.</li>
            <li>Planificación diaria y semanal con seguimiento de metas.</li>
            <li>Análisis de patrones de productividad personalizados.</li>
          </ul>
          <p>La Aplicación se distribuye gratuitamente como software de descarga directa para los sistemas operativos Windows y macOS.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">3. Registro y cuenta</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Debes proporcionar información veraz y actualizada al registrarte.</li>
            <li>Eres responsable de mantener la confidencialidad de tu cuenta y credenciales.</li>
            <li>Debes tener al menos 13 años de edad para usar el servicio. Si tienes entre 13 y 18 años, debes tener el consentimiento de un padre o tutor.</li>
            <li>Una cuenta por persona. No se permiten cuentas compartidas.</li>
            <li>Nos reservamos el derecho de suspender cuentas que violen estos términos.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">4. Uso aceptable</h2>
          <p>Te comprometes a no:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Usar la Aplicación para fines ilegales o no autorizados.</li>
            <li>Intentar acceder a datos de otros usuarios.</li>
            <li>Interferir con el funcionamiento normal del servicio.</li>
            <li>Subir contenido malicioso o archivos que contengan virus.</li>
            <li>Ingeniería inversa, descompilar o modificar la Aplicación.</li>
            <li>Revender o redistribuir la Aplicación sin autorización.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">5. Propiedad intelectual</h2>
          <p>Todo el contenido de la Aplicación, incluyendo diseño, código fuente, algoritmos de IA, logotipos y marca Adonai, es propiedad exclusiva de Adonai y está protegido por leyes de propiedad intelectual. Los datos y contenido que tú creas dentro de la Aplicación (tareas, metas, notas) te pertenecen. Nos otorgas una licencia limitada para almacenar y procesar tus datos con el único propósito de proveer el servicio.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">6. Integración con Google</h2>
          <p>Al conectar tu cuenta de Google:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Autorizas a Adonai a acceder a tu Google Calendar con los permisos que otorgues.</li>
            <li>Puedes revocar estos permisos en cualquier momento desde la configuración de tu cuenta de Google.</li>
            <li>Adonai cumple estrictamente con la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Política de datos de usuario de los servicios de API de Google</a>.</li>
            <li>El uso que hace Adonai de los datos de Google se limita estrictamente a las funcionalidades descritas en nuestra Política de Privacidad.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">7. Servicio de IA</h2>
          <p>La Aplicación utiliza inteligencia artificial para ofrecer recomendaciones y priorización de tareas. Estas sugerencias son orientativas y no constituyen asesoramiento profesional, financiero ni de gestión empresarial. El usuario es el único responsable de las decisiones finales sobre su productividad y gestión del tiempo.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">8. Limitación de responsabilidad</h2>
          <p>Adonai se proporciona "tal cual" y "según disponibilidad", sin garantías de ningún tipo, ya sean expresas o implícitas. En la medida máxima permitida por la ley aplicable, Adonai no será responsable por:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Pérdida de datos debido a circunstancias fuera de nuestro control.</li>
            <li>Interrupciones temporales del servicio por mantenimiento o problemas técnicos.</li>
            <li>Decisiones tomadas basándose en las sugerencias generadas por la IA.</li>
            <li>Daños indirectos, incidentales o consecuentes derivados del uso o la imposibilidad de usar la Aplicación.</li>
            <li>Problemas derivados de la integración con servicios de terceros (Google, Supabase, etc.).</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">9. Modificaciones</h2>
          <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios significativos serán notificados a través de la Aplicación o por correo electrónico. El uso continuado de la Aplicación después de la notificación de cambios constituye la aceptación de los nuevos términos. Si no estás de acuerdo con los cambios, debes dejar de usar la Aplicación y eliminar tu cuenta.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">10. Cancelación y eliminación de cuenta</h2>
          <p>Puedes dejar de usar la Aplicación en cualquier momento. Puedes solicitar la eliminación completa de tu cuenta y todos los datos asociados desde la sección de Perfil dentro de la Aplicación o contactándonos al correo electrónico indicado abajo. Tras la eliminación, tus datos se borran permanentemente en un plazo máximo de 30 días.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">11. Ley aplicable</h2>
          <p>Estos términos se rigen por las leyes del país de residencia del desarrollador. Cualquier disputa relacionada con estos términos será resuelta en los tribunales competentes de dicha jurisdicción.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">12. Contacto</h2>
          <p>Para consultas sobre estos términos, puedes contactarnos en:</p>
          <p className="mt-2">
            Email: <a href="mailto:support@adonai-app.com" className="text-primary underline">support@adonai-app.com</a>
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
