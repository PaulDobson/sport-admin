## Why

La administracion actual mezcla un listado tabular con un formulario extenso al final, obliga a desplazamiento horizontal en movil y presenta el archivado como eliminacion. El flujo necesita separar consulta, alta, ficha y edicion para facilitar la operacion diaria sin debilitar permisos, privacidad ni historial.

## What Changes

- Listado mobile-first: tarjetas compactas en movil y tabla legible en desktop, con identidad, contacto, estado y acceso a ficha.
- Encabezado breve con academia y rol en el shell existente; una accion primaria "Nuevo alumno" y exportacion secundaria con alcance explicito de pagina actual.
- Navegacion de estados Activos / Archivados / Todos, busqueda por nombre, filtros persistidos en URL y paginacion consistente.
- Alta en una pagina propia, con datos esenciales primero y secciones opcionales desplegables para emergencia, perfil y salud; no se elimina ningun campo existente.
- Ficha con identidad y estado visibles, navegacion por Resumen, Membresia, Salud y Privacidad, mostrando solo secciones autorizadas.
- Edicion con los mismos bloques de datos basicos del alta y acciones Guardar / Cancelar; salud y privacidad mantienen flujos separados.
- Sustituir "Eliminar" por "Archivar", con confirmacion accesible, explicacion de conservacion del historial y errores visibles.
- Conservar permisos actuales: owner, admin e instructor administran; assistant consulta dentro de los limites actuales. No agregar restauracion ni borrado definitivo.
- Estados de carga, vacio, error y exito, controles tactiles y regreso al listado conservando filtros y pagina.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `instructor-operations`: listado responsive, acciones CRUD con archivado explicito, alta independiente, ficha organizada, edicion coherente y exportacion de pagina actual claramente comunicada.

## Impact

- Paginas y componentes de `src/app/dashboard/students/`, incluidas ficha, edicion y nueva ruta de alta.
- Enlaces hacia alta en shell, acciones rapidas y navegacion contextual; pruebas asociadas.
- Reutilizacion de primitives, tokens semanticos, acciones de servidor y casos de uso existentes.
- API Excel conserva formato y filtros actuales; posibles ajustes coordinados de paginacion entre consulta y exportacion.
- Sin migraciones, nuevas dependencias, cambios de roles o ampliacion del acceso a datos sensibles. Sin indicadores financieros o de salud inventados en el listado.
- Se trabajara sobre el estado actual del repositorio, preservando cambios previos y sin alterar propuestas de finanzas o moneda.
