#!/bin/bash

# Script para instalar las dependencias necesarias

echo "🚀 Instalando dependencias del proyecto..."

# Instalar xlsx para procesamiento de Excel
npm install xlsx

# Instalar tipos para TypeScript
npm install --save-dev @types/xlsx

# Instalar otras dependencias que podrían faltar
npm install react-resizable-panels
npm install @radix-ui/react-scroll-area
npm install @radix-ui/react-separator
npm install @radix-ui/react-select

echo "✅ Dependencias instaladas correctamente"
echo ""
echo "📋 Dependencias instaladas:"
echo "  - xlsx: Para procesamiento de archivos Excel"
echo "  - @types/xlsx: Tipos TypeScript para xlsx"
echo "  - react-resizable-panels: Paneles redimensionables"
echo "  - @radix-ui/react-*: Componentes UI"
echo ""
echo "🔧 Próximos pasos:"
echo "  1. Ejecuta 'npm run build' para verificar que todo compile"
echo "  2. Ejecuta 'npm run dev' para iniciar el servidor de desarrollo"
echo "  3. Haz commit de los cambios en package.json"
