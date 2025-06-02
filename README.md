# Sistema de Horarios - ESCUELA TECNICA Nº6

Sistema web para gestionar y visualizar horarios académicos de la ESCUELA TECNICA Nº6 "ING. JUAN V. PASSALACQUA".

## Características

- 📅 Visualización de horarios por curso
- 📊 Carga de horarios desde archivos Excel
- 🔐 Panel de administración protegido con contraseña
- 📱 Diseño responsive
- 🎨 Interfaz moderna con el logo institucional

## Instalación Local

1. Clona o descarga el proyecto
2. Instala las dependencias:
   \`\`\`bash
   npm install
   \`\`\`
3. Ejecuta en modo desarrollo:
   \`\`\`bash
   npm run dev
   \`\`\`
4. Abre [http://localhost:3000](http://localhost:3000)

## Despliegue en Netlify

1. Construye el proyecto:
   \`\`\`bash
   npm run build
   \`\`\`
2. Sube la carpeta `out` a Netlify
3. O conecta tu repositorio de GitHub con Netlify para despliegue automático

## Uso

### Acceso Público
- Visualiza horarios por curso en la página principal
- Selecciona diferentes cursos desde el dropdown

### Panel de Administración
- Accede desde el botón "Administración"
- **Contraseña por defecto**: `admin2024`
- Sube archivos Excel con horarios
- Descarga plantilla de ejemplo

### Formato del Excel
El archivo debe tener 5 columnas:
1. **Curso** (ej: "1° A")
2. **Día** (Lunes, Martes, etc.)
3. **Horario** (ej: "08:00 - 08:45")
4. **Materia** (ej: "Matemáticas")
5. **Profesor** (ej: "Prof. García")

## Configuración

### Cambiar Contraseña de Administración
Edita el archivo `app/admin/login/page.tsx`, línea 15:
\`\`\`tsx
const ADMIN_PASSWORD = "tu_nueva_contraseña"
\`\`\`

### Personalizar Horarios
Los horarios se definen en `app/page.tsx`, variable `TIMES`.

## Tecnologías

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- xlsx (para procesar Excel)

## Soporte

Para soporte técnico, contacta al administrador del sistema.
