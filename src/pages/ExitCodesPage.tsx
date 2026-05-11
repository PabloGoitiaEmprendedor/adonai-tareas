import { Link } from "react-router-dom";

const ExitCodesPage = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-[700px] mx-auto px-6 py-12 space-y-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← Volver a Adonai
        </Link>

        <h1 className="text-3xl font-bold tracking-tight">Códigos de Retorno del Instalador</h1>
        <p className="text-sm text-gray-500">
          Documentación de los códigos de retorno (exit codes) del instalador <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">Adonai-Setup.exe</code>.
        </p>

        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 font-semibold text-gray-900">Código</th>
                <th className="px-5 py-3 font-semibold text-gray-900">Significado</th>
                <th className="px-5 py-3 font-semibold text-gray-900">Descripción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50">
                <td className="px-5 py-4 font-mono text-green-700 font-bold">0</td>
                <td className="px-5 py-4 font-medium text-gray-900">Éxito</td>
                <td className="px-5 py-4 text-gray-600">La instalación se completó correctamente.</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-5 py-4 font-mono text-red-700 font-bold">1</td>
                <td className="px-5 py-4 font-medium text-gray-900">Error general</td>
                <td className="px-5 py-4 text-gray-600">La instalación falló por un error inesperado. Revise los logs del sistema para más detalles.</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-5 py-4 font-mono text-yellow-700 font-bold">2</td>
                <td className="px-5 py-4 font-medium text-gray-900">Instalación cancelada</td>
                <td className="px-5 py-4 text-gray-600">El usuario canceló la instalación. El instalador oneClick no muestra interfaz, por lo que este código no debería aparecer en ejecución normal.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <section className="space-y-3 text-sm leading-relaxed text-gray-700">
          <h2 className="text-base font-semibold text-gray-900">Comportamiento del instalador</h2>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>El instalador es de tipo <strong>oneClick</strong>: se ejecuta en modo silencioso sin ventanas de configuración.</li>
            <li>No requiere modificadores de línea de comandos para instalación silenciosa.</li>
            <li>Se instala por usuario (no por máquina).</li>
            <li>Crea acceso directo en el escritorio y menú de inicio.</li>
            <li>La aplicación se inicia automáticamente al finalizar la instalación.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-gray-700">
          <h2 className="text-base font-semibold text-gray-900">Modificadores opcionales</h2>
          <p className="text-gray-600">El instalador acepta los siguientes parámetros opcionales desde la línea de comandos:</p>
          <div className="overflow-hidden border border-gray-200 rounded-xl">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 font-semibold text-gray-900">Modificador</th>
                  <th className="px-5 py-3 font-semibold text-gray-900">Efecto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono text-gray-800 font-bold">/S</td>
                  <td className="px-5 py-4 text-gray-600">Ejecuta el instalador en modo completamente silencioso (sin barra de progreso).</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono text-gray-800 font-bold">/D=C:\ruta</td>
                  <td className="px-5 py-4 text-gray-600">Especifica el directorio de instalación. Debe ser el último parámetro.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ExitCodesPage;
