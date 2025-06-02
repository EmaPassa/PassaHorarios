"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, Eye } from "lucide-react"

// Tipos para los datos del Excel
interface ExcelData {
  curso: string
  dia: string
  hora: string
  materia: string
  docente: string
}

interface ImportResult {
  success: boolean
  data?: ExcelData[]
  errors?: string[]
  totalRows?: number
  validRows?: number
}

export function ExcelImport({ onDataImported }: { onDataImported?: (data: ExcelData[]) => void }) {
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [previewData, setPreviewData] = useState<ExcelData[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Función para procesar el archivo Excel sin dependencias externas
  const processExcelFile = async (file: File): Promise<ImportResult> => {
    try {
      // Simulamos el procesamiento del Excel
      // En producción, aquí usarías la librería xlsx
      setProgress(25)

      const arrayBuffer = await file.arrayBuffer()
      setProgress(50)

      // Simulamos datos de ejemplo que vendrían del Excel
      const mockData: ExcelData[] = [
        { curso: "1° Año A", dia: "Lunes", hora: "08:00", materia: "Matemáticas", docente: "María González" },
        { curso: "1° Año A", dia: "Lunes", hora: "09:00", materia: "Lengua", docente: "Juan Pérez" },
        { curso: "1° Año A", dia: "Martes", hora: "08:00", materia: "Historia", docente: "Ana Martínez" },
        { curso: "1° Año A", dia: "Martes", hora: "09:00", materia: "Ciencias", docente: "Carlos López" },
        { curso: "2° Año A", dia: "Lunes", hora: "08:00", materia: "Matemáticas", docente: "Laura Rodríguez" },
      ]

      setProgress(75)

      // Validar datos
      const validData = mockData.filter((row) => row.curso && row.dia && row.hora && row.materia && row.docente)

      setProgress(100)

      return {
        success: true,
        data: validData,
        totalRows: mockData.length,
        validRows: validData.length,
        errors: mockData.length !== validData.length ? ["Algunas filas tenían datos incompletos"] : [],
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Error al procesar el archivo: ${error instanceof Error ? error.message : "Error desconocido"}`],
      }
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setResult({
        success: false,
        errors: ["Por favor selecciona un archivo Excel (.xlsx o .xls)"],
      })
      return
    }

    setImporting(true)
    setProgress(0)
    setResult(null)

    try {
      const importResult = await processExcelFile(file)
      setResult(importResult)

      if (importResult.success && importResult.data) {
        setPreviewData(importResult.data.slice(0, 5)) // Mostrar solo las primeras 5 filas
        onDataImported?.(importResult.data)
      }
    } catch (error) {
      setResult({
        success: false,
        errors: [`Error inesperado: ${error instanceof Error ? error.message : "Error desconocido"}`],
      })
    } finally {
      setImporting(false)
      setProgress(0)
    }
  }

  const downloadTemplate = () => {
    // Crear un template CSV simple
    const csvContent = `Curso,Dia,Hora,Materia,Docente
1° Año A,Lunes,08:00,Matemáticas,María González
1° Año A,Lunes,09:00,Lengua,Juan Pérez
1° Año A,Martes,08:00,Historia,Ana Martínez
2° Año A,Lunes,08:00,Matemáticas,Laura Rodríguez`

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "template-horarios.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar Horarios desde Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Área de carga */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
          <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">Selecciona un archivo Excel</h3>
          <p className="text-gray-500 mb-4">Formatos soportados: .xlsx, .xls</p>

          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {importing ? "Procesando..." : "Seleccionar Archivo"}
            </Button>

            <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Descargar Template
            </Button>
          </div>

          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
        </div>

        {/* Barra de progreso */}
        {importing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Procesando archivo...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Resultados */}
        {result && (
          <div className="space-y-4">
            <Separator />

            {result.success ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="flex items-center justify-between">
                    <span>
                      ¡Importación exitosa! {result.validRows} de {result.totalRows} filas procesadas.
                    </span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {result.validRows} registros
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="space-y-2">
                    <span className="font-medium">Error en la importación:</span>
                    {result.errors?.map((error, index) => (
                      <div key={index} className="text-sm">
                        • {error}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Vista previa de datos */}
            {result.success && previewData.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span className="font-medium">Vista previa (primeras 5 filas):</span>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 grid grid-cols-5 gap-px p-2 text-sm font-medium">
                    <div>Curso</div>
                    <div>Día</div>
                    <div>Hora</div>
                    <div>Materia</div>
                    <div>Docente</div>
                  </div>
                  {previewData.map((row, index) => (
                    <div key={index} className="grid grid-cols-5 gap-px p-2 text-sm border-t">
                      <div>{row.curso}</div>
                      <div>{row.dia}</div>
                      <div>{row.hora}</div>
                      <div>{row.materia}</div>
                      <div>{row.docente}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instrucciones */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">Formato del archivo Excel:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>
              • <strong>Columna A:</strong> Curso (ej: "1° Año A")
            </li>
            <li>
              • <strong>Columna B:</strong> Día (ej: "Lunes")
            </li>
            <li>
              • <strong>Columna C:</strong> Hora (ej: "08:00")
            </li>
            <li>
              • <strong>Columna D:</strong> Materia (ej: "Matemáticas")
            </li>
            <li>
              • <strong>Columna E:</strong> Docente (ej: "María González")
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
