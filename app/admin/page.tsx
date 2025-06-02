"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ArrowLeft, Download, LogOut } from "lucide-react"
import Link from "next/link"
import * as XLSX from "xlsx"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface ScheduleEntry {
  grade: string
  day: string
  time: string
  subject: string
  teacher: string
}

export default function AdminPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const router = useRouter()

  useEffect(() => {
    // Verificar autenticación
    const isAuthenticated = localStorage.getItem("adminAuthenticated")
    const loginTime = localStorage.getItem("adminLoginTime")

    if (!isAuthenticated || !loginTime) {
      router.push("/admin/login")
      return
    }

    // Verificar si la sesión ha expirado (24 horas)
    const now = Date.now()
    const loginTimestamp = Number.parseInt(loginTime)
    const twentyFourHours = 24 * 60 * 60 * 1000

    if (now - loginTimestamp > twentyFourHours) {
      localStorage.removeItem("adminAuthenticated")
      localStorage.removeItem("adminLoginTime")
      router.push("/admin/login")
      return
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("adminAuthenticated")
    localStorage.removeItem("adminLoginTime")
    router.push("/admin/login")
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setMessage(null)
    }
  }

  const processExcelFile = async (file: File): Promise<ScheduleEntry[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: "array" })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

          const scheduleEntries: ScheduleEntry[] = []

          // Asumiendo que la primera fila contiene los encabezados
          // Formato esperado: Curso | Día | Horario | Materia | Profesor
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[]
            if (row.length >= 5 && row[0]) {
              scheduleEntries.push({
                grade: String(row[0] || "").trim(),
                day: String(row[1] || "").trim(),
                time: String(row[2] || "").trim(),
                subject: String(row[3] || "").trim(),
                teacher: String(row[4] || "").trim(),
              })
            }
          }

          resolve(scheduleEntries)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error("Error al leer el archivo"))
      reader.readAsArrayBuffer(file)
    })
  }

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: "error", text: "Por favor selecciona un archivo Excel" })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const processedSchedules = await processExcelFile(file)

      if (processedSchedules.length === 0) {
        setMessage({ type: "error", text: "No se encontraron datos válidos en el archivo Excel" })
        return
      }

      // Guardar en localStorage
      localStorage.setItem("schoolSchedules", JSON.stringify(processedSchedules))
      setSchedules(processedSchedules)

      setMessage({
        type: "success",
        text: `Horarios cargados exitosamente. Se procesaron ${processedSchedules.length} entradas.`,
      })

      // Limpiar el input
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Error processing file:", error)
      setMessage({
        type: "error",
        text: "Error al procesar el archivo. Verifica que sea un archivo Excel válido con el formato correcto.",
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const templateData = [
      ["Curso", "Día", "Horario", "Materia", "Profesor"],
      ["1° A", "Lunes", "08:00 - 08:45", "Matemáticas", "Prof. García"],
      ["1° A", "Lunes", "08:45 - 09:30", "Lengua", "Prof. Martínez"],
      ["1° A", "Martes", "08:00 - 08:45", "Historia", "Prof. Rodríguez"],
      ["2° B", "Lunes", "08:00 - 08:45", "Física", "Prof. Fernández"],
    ]

    const ws = XLSX.utils.aoa_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Horarios")
    XLSX.writeFile(wb, "plantilla_horarios.xlsx")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <img src="/logo.png" alt="Logo EEST Nº6" className="h-16 w-16" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">ESCUELA TECNICA Nº6</h1>
                <p className="text-lg text-gray-700">"ING. JUAN V. PASSALACQUA"</p>
                <p className="text-sm text-gray-600">Panel de Administración</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
              <Link href="/">
                <Button variant="outline" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Volver a Horarios
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Cargar Horarios desde Excel
              </CardTitle>
              <CardDescription>
                Sube un archivo Excel con los horarios del colegio. El archivo debe tener las columnas: Curso, Día,
                Horario, Materia, Profesor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="excel-file">Archivo Excel</Label>
                <Input id="excel-file" type="file" accept=".xlsx,.xls" onChange={handleFileChange} ref={fileInputRef} />
              </div>

              {file && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileSpreadsheet className="h-4 w-4" />
                  {file.name}
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleUpload} disabled={!file || loading} className="flex items-center gap-2">
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Cargar Horarios
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Descargar Plantilla
                </Button>
              </div>

              {message && (
                <Alert
                  className={message.type === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}
                >
                  {message.type === "error" ? (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  <AlertDescription className={message.type === "error" ? "text-red-800" : "text-green-800"}>
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Formato del Archivo Excel</CardTitle>
              <CardDescription>El archivo Excel debe tener las siguientes columnas en este orden:</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-2 text-left">Columna A</th>
                      <th className="border border-gray-300 p-2 text-left">Columna B</th>
                      <th className="border border-gray-300 p-2 text-left">Columna C</th>
                      <th className="border border-gray-300 p-2 text-left">Columna D</th>
                      <th className="border border-gray-300 p-2 text-left">Columna E</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-2 font-medium">Curso</td>
                      <td className="border border-gray-300 p-2 font-medium">Día</td>
                      <td className="border border-gray-300 p-2 font-medium">Horario</td>
                      <td className="border border-gray-300 p-2 font-medium">Materia</td>
                      <td className="border border-gray-300 p-2 font-medium">Profesor</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-2 text-sm">1° A</td>
                      <td className="border border-gray-300 p-2 text-sm">Lunes</td>
                      <td className="border border-gray-300 p-2 text-sm">08:00 - 08:45</td>
                      <td className="border border-gray-300 p-2 text-sm">Matemáticas</td>
                      <td className="border border-gray-300 p-2 text-sm">Prof. García</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p>
                  <strong>Nota:</strong> La primera fila debe contener los encabezados como se muestra arriba.
                </p>
                <p>Los días deben escribirse como: Lunes, Martes, Miércoles, Jueves, Viernes</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
