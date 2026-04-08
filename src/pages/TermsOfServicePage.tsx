const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-[700px] mx-auto px-6 py-12 space-y-8">
        <h1 className="text-2xl font-bold">Términos y Condiciones de Servicio</h1>
        <p className="text-sm text-on-surface-variant">Última actualización: 8 de abril de 2026</p>

        <section className="space-y-3 text-sm leading-relaxed text-on-surface-variant">
          <h2 className="text-lg font-semibold text-foreground">1. Aceptación de los términos</h2>
          <p>Al acceder y utilizar Adonai ("la Aplicación"), aceptas estar sujeto a estos Términos y Condiciones de Servicio. Si no estás de acuerdo con alguno de estos términos, no debes utilizar la Aplicación.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-on-surface-variant">
          <h2 className="text-lg font-semibold text-foreground">2. Descripción del servicio</h2>
          <p>Adonai es una aplicación de productividad contextual diseñada para emprendedores que ofrece:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Gestión inteligente de tareas con priorización asistida por IA.</li>
            <li>Captura de tareas por voz.</li>
            <li>Integración con Google Calendar para sincronizar eventos.</li>
            <li>Planificación diaria y semanal con seguimiento de metas.</li>
            <li>Análisis de patrones de productividad personalizados.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-on-surface-variant">
          <h2 className="text-lg font-semibold text-foreground">3. Registro y cuenta</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Debes proporcionar información veraz y actualizada al registrarte.</li>
            <li>Eres responsable de mantener la confidencialidad de tu cuenta.</li>
            <li>Debes tener al menos 13 años de edad para usar el servicio.</li>
            <li>Una cuenta por persona. No se permiten cuentas compartidas.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-on-surface-variant">
          <h2 className="text-lg font-semibold text-foreground">4. Uso aceptable</h2>
          <p>Te comprometes a no:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Usar la Aplicación para fines ilegales o no autorizados.</li>
            <li>Intentar acceder a datos de otros usuarios.</li>
            <li>Interferir con el funcionamiento normal del servicio.</li>
            <li>Subir contenido malicioso o archivos que contengan virus.</li>
            <li>Revender o redistribuir el servicio sin autorización.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-on-surface-variant">
          <h2 className="text-lg font-semibold text-foreground">5. Propiedad intelectual</h2>
          <p>Todo el contenido de la Aplicación, incluyendo diseño, código, algoritmos de IA y marca, es propiedad de Adonai. Los datos y contenido que creas (tareas, metas, notas) te pertenecen.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-on-surface-variant">
          <h2 className="text-lg font-semibold text-foreground">6. Integración con Google</h2>
          <p>Al conectar tu cuenta de Google:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Autorizas a Adonai a acceder a tu Google Calendar con los permisos que otorgues.</li>
            <li>Puedes revocar estos permisos en cualquier momento desde la configuración de tu cuenta de Google.</li>
            <li>Adonai cumple con la Política de datos de usuario de los servicios de API de Google.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-on-surface-variant">
          <h2 className="text-lg font-semibold text-foreground">7. Servicio de IA</h2>
          <p>La Aplicación utiliza inteligencia artificial para ofrecer recomendaciones y priorización de tareas. Estas sugerencias son orientativas y no constituyen asesoramiento profesional. El usuario es responsable de las decisiones finales sobre su productividad y gestión del tiempo.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-on-surface-variant">
          <h2 className="text-lg font-semibold text-foreground">8. Limitación de responsabilidad</h2>
          <p>Adonai se proporciona "tal cual" sin garantías de ningún tipo. No nos hacemos responsables de:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Pérdida de datos debido a circunstancias fuera de nuestro control.</li>
            <li>Interrupciones temporales del servicio.</li>
            <li>Decisiones tomadas basándose en las sugerencias de la IA.</li>
            <li>Problemas derivados de la integración con servicios de terceros.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-on-surface-variant">
          <h2 className="text-lg font-semibold text-foreground">9. Modificaciones</h2>
          <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios significativos serán notificados a través de la Aplicación. El uso continuado después de los cambios constituye aceptación de los nuevos términos.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-on-surface-variant">
          <h2 className="text-lg font-semibold text-foreground">10. Cancelación</h2>
          <p>Puedes dejar de usar la Aplicación en cualquier momento. Puedes solicitar la eliminación completa de tu cuenta y datos asociados contactándonos a través de la aplicación.</p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-on-surface-variant">
          <h2 className="text-lg font-semibold text-foreground">11. Contacto</h2>
          <p>Para consultas sobre estos términos, puedes contactarnos a través de la aplicación.</p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
