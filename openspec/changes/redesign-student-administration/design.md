## Context

Ver [proposal.md](./proposal.md) para motivacion y alcance. El modulo usa paginas de servidor Next.js, acciones de servidor y puertos/casos de uso separados de Supabase. La tabla lista contactos principales, busca solo por nombre y pagina en servidor. Excel exporta una pagina, no todos los resultados.

El alta contiene identidad, perfil fisico, emergencia, contacto y alergias. La ficha combina membresias, restricciones y privacidad en una superficie larga. El shell ya muestra academia y rol; su enlace de regreso a alumnos esta oculto en movil. Existen primitives reutilizables para superficies, avatar, botones, campos, estados y carga.

La interfaz y las acciones actuales permiten administrar a owner, admin e instructor; assistant no muta ni exporta. Salud requiere politica activa y consentimiento. El repositorio tiene cambios previos que deben preservarse.

## Goals / Non-Goals

**Goals:**

- Reducir decisiones simultaneas: buscar, abrir ficha, crear o editar sin formularios permanentes en el listado.
- Separar presentacion responsive de datos, autorizacion y operaciones de dominio.
- Conservar acceso a toda funcionalidad actual, con resultados verificables y contexto recuperable.
- Mantener SSR para consultas y limitar componentes cliente a interacciones.

**Non-Goals:**

- Nuevos roles, permisos, restauracion, importacion masiva o borrado definitivo.
- Nuevos campos obligatorios, carga de archivos para fotos o cambio del modelo de datos.
- Dashboard estadistico global, filtros financieros, busqueda por contacto o historial de asistencia nuevo.
- Redisenar finanzas, cambiar moneda o implementar funcionamiento offline con sincronizacion.

## Decisions

### 1. Un listado, dos representaciones

Una sola consulta entrega tarjetas por debajo de `md` y tabla a partir de `md`. Ambas usan las mismas filas, etiquetas y capacidades. No consultar por alumno ni agregar indicadores de salud/membresia que el contrato de listado no provee.

Preferir esta composicion a una tabla desplazable en movil: permite lectura rapida y acciones de una mano. La tabla conserva eficiencia desktop. El punto de corte debe verificarse especialmente a 768 px; ajustar distribucion de columnas si no cabe.

```text
MOVIL                          DESKTOP
Alumnos         [Nuevo]        Alumnos        [Exportar pagina] [Nuevo alumno]
[Buscar por nombre     ]       [Buscar por nombre                  ]
[Activos|Archivados|Todos]      [Activos|Archivados|Todos]       [Filas]
11 resultados                  11 resultados
+-----------------------+      Nombre        Contacto    Estado    Acciones
| AB Ana Bravo   Activo |      AB Ana Bravo  tel/email   Activo    Ver / ...
| Telefono / correo     |
| Ver ficha  Editar ... |      Mostrando 1-10 de 11        Anterior Siguiente
+-----------------------+
[Anterior] 1/2 [Siguiente]
```

Reducir el hero actual a encabezado de tarea; reutilizar academia/rol del shell sin duplicar un panel contextual. Una accion primaria "Nuevo alumno". "Exportar pagina a Excel" es secundaria y no se oculta completamente en movil.

No agregar widgets decorativos: el conteo filtrado y el rango de resultados ya orientan la operacion. No confundir este conteo con alumnos totales.

### 2. Estado de consulta y retorno explicitos

Mantener `search`, `status`, `page` y `pageSize` en URL. La busqueda continua siendo por nombre; enviar con Enter o boton accesible, sin introducir autosubmit inesperado. Los enlaces de estados preservan busqueda y tamano y reinician pagina.

Propagar contexto de retorno mediante parametros permitidos reconstruidos por un helper local compartido; no aceptar URLs externas ni redirecciones arbitrarias. Los accesos directos vuelven al listado activo por defecto. Validar destinos del listado, ficha, edicion, alta y enlaces del shell.

Corregir la pagina fuera de rango antes de renderizar o exportar: preferir redireccion a URL canonica para el listado y normalizacion equivalente en exportacion. No mostrar "pagina 2" con filas consultadas de "pagina 9". Reutilizar un helper del modulo o caso de uso cuando permita una sola politica sin duplicar reglas.

### 3. Alta en ruta propia y formulario progresivo

Crear `/dashboard/students/new`, con autorizacion equivalente a edicion. Usar una pagina propia en vez de modal: acomoda formularios largos, teclado movil, enlaces directos y validacion sin encerrar la tarea en un overlay.

```text
Listado -> Nuevo alumno -> Guardar -> Confirmacion / Abrir ficha
              |                        |
           Cancelar             Resultado parcial -> Ficha creada
              |
         Listado con filtros
```

Identidad y contacto estan visibles; emergencia, perfil complementario y salud se despliegan a demanda. Mantener el nombre como requisito actual y todos los campos opcionales. No usar un wizard multipaso: seria friccion innecesaria para un alta corta.

Reutilizar grupos de campos entre alta y edicion, sin una abstraccion generica de formularios. En secciones colapsadas, abrir y enfocar el primer campo invalido antes de permitir que el navegador quede sin acceso al control. Mantener valores al fallar.

La creacion devuelve el identificador tambien en exito. Un fallo posterior de salud ya puede devolverlo; en ese caso se deshabilita el reenvio del alta y se orienta a la ficha, distinguiendo creacion parcial de creacion fallida. No presentar un error parcial como exito total.

Actualizar accesos existentes a `#new-student-heading`, acciones rapidas y patrones de rutas antes de retirar el formulario embebido. La ruta estatica `new` debe resolverse como alta y no como ficha de un id.

### 4. Ficha con navegacion de secciones enlazables

Encabezado con avatar, nombre, estado y acciones autorizadas. Resumen muestra datos y contactos disponibles; Membresia conserva planes, saldos y cobros; Salud conserva alertas/restricciones; Privacidad conserva consentimiento, correccion, exportacion personal y solicitud de eliminacion.

Usar enlaces de navegacion de seccion con estado en URL y `aria-current`, no un falso widget ARIA de tabs sin su contrato de teclado. Distribucion adaptable de dos columnas en desktop y una en movil; controles de secciones que envuelven sin provocar scroll de pagina.

No mostrar secciones sensibles a assistant. Cuando salud esta bloqueada, comunicar la causa sin cargar ni serializar datos sensibles. Todas las acciones existentes mantienen su autorizacion servidor. Las secciones no convierten "sin acceso" en "sin datos".

Cambiar de seccion no debe descartar silenciosamente un formulario modificado; mantener la seccion activa durante una operacion pendiente y advertir antes de abandonar ediciones locales.

### 5. CRUD y accion destructiva separados

| Accion | Superficie | Permisos actuales |
|---|---|---|
| Crear | Pagina de alta | owner / admin / instructor |
| Consultar | Listado y ficha | Todos, con restricciones actuales |
| Editar | Pagina de edicion | owner / admin / instructor |
| Archivar | Accion secundaria y confirmacion | owner / admin / instructor |
| Exportar pagina | Listado | owner / admin / instructor |
| Salud y privacidad | Secciones de ficha | Condiciones existentes de rol, politica y consentimiento |

No implementar una nueva matriz de roles. La UI no sustituye validacion servidor ni aislamiento por tenant.

Archivar usa icono de archivo y texto, no papelera ni etiqueta Eliminar. La confirmacion accesible identifica al alumno, explica conservacion de historial, devuelve foco al cancelar y muestra error dentro del flujo. Preferir dialogo nativo si no existe componente equivalente fiable, evitando nueva dependencia solo para esta interaccion.

### 6. Responsabilidades y lenguaje visual

- Paginas de servidor: contexto, permisos, consulta y composicion.
- Componentes de listado: tabla/tarjetas y presentacion; misma entrada de datos.
- Componentes cliente: grupos desplegables, formularios, confirmacion y estados de envio.
- Acciones/casos de uso: validaciones, mutaciones, consentimiento y revalidacion existentes.
- Repositorio: consulta tenant-scoped; sin reglas de UX.

Reutilizar `Surface`, `Avatar`, `StatusBadge`, `Button`, `FieldControl` y spinner existentes. Tokens semanticos en lugar de colores nuevos, sombras contenidas, tipografia jerarquica y foco visible. Objetivos tactiles de 44 px como minimo; nombres y contactos largos con ajuste de linea. La barra de acciones del formulario debe respetar safe-area y navegacion inferior si se fija; preferir acciones en flujo si fijarlas reduce espacio de contenido.

## Risks / Trade-offs

- [Formularios extensos y teclado movil] -> Pagina dedicada y bloques opcionales; comprobar campos invalidos colapsados y scroll al foco.
- [Dos representaciones duplican markup] -> Compartir datos y contenido de acciones; ocultar la representacion inactiva del arbol accesible y probar ambas.
- [Navegacion rompe contexto o cambios sin guardar] -> Parametros de retorno permitidos y proteccion de formularios modificados; probar cancelar y regresar.
- [Privacidad confundida con archivado] -> Etiquetas y confirmaciones separadas; no ampliar permisos ni consultar datos bloqueados.
- [Conteos o pagina falsamente consistentes] -> Conteo real del filtro, normalizacion antes de consulta visible y exportacion consistente.
- [Cambios previos en archivos afectados] -> Revisar diferencias antes de implementar, integrar el estado existente y no revertir trabajo ajeno.
- [Mayor expectativa de modulo completo] -> Cubrir todos los flujos actuales sin inventar datos o ampliar reglas de negocio; restauracion y nuevas funciones requieren otra propuesta.

## Migration Plan

Sin migracion de datos. Incorporar ruta de alta y enlaces, luego reemplazar superficies existentes conservando APIs y contratos de acciones salvo retorno aditivo del identificador. Actualizar pruebas y documentacion directamente relacionadas.

Validar permisos, aislamiento, consentimiento, estado parcial, filtros, paginacion y exportacion mediante pruebas existentes ampliadas. Verificar visualmente 320, 375, 390, 768, 1280 y 1440 px con nombres/contactos largos; cubrir navegacion, teclado, focus y ausencia de scroll horizontal.

Rollback mediante reversion exclusiva de los cambios de implementacion de esta propuesta; registros e historial mantienen el mismo esquema y semantica.
