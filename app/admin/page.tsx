"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Download,
  LogOut,
  Plus,
  Trash2,
  Save,
  Edit,
  X,
  BookOpen,
  Wrench,
} from "lucide-react"
import Link from "next/link"
import * as XLSX from "xlsx"
import { useRouter } from "next/navigation"

interface ScheduleEntry {
  id: string
  grade: string
  day: string
  time: string
  subject: string
  teacher: string
  type: "teoria" | "taller"
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
const TIMES = [
  "08:00 - 08:45",
  "08:45 - 09:30",
  "09:30 - 10:15",
  "10:15 - 11:00",
  "11:00 - 11:15", // Recreo
  "11:15 - 12:00",
  "12:00 - 12:45",
  "12:45 - 13:30",
  "13:30 - 14:15",
]

export default function AdminPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([])
  const [grades, setGrades] = useState<string[]>([])
  const [selectedGrade, setSelectedGrade] = useState<string>("Todos los cursos")
  const [editMode, setEditMode] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null)
  const [newEntry, setNewEntry] = useState<Partial<ScheduleEntry>>({
    grade: "",
    day: "",
    time: "",
    subject: "",
    teacher: "",
    type: "teoria",
  })
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

    // Cargar horarios existentes
    loadSchedules()
  }, [router])

  const loadSchedules = () => {
    const savedSchedules = localStorage.getItem("schoolSchedules")
    if (savedSchedules) {
      try {
        const parsed = JSON.parse(savedSchedules)
        // Asegurarse de que cada entrada tenga un ID y tipo
        const schedulesWithIds = parsed.map((entry: any) => ({
          ...entry,
          id: entry.id || generateId(),
          type: entry.type || "teoria", // Valor por defecto para datos existentes
        }))
        setSchedules(schedulesWithIds)

        // Extraer grados únicos
        const uniqueGrades = [...new Set(schedulesWithIds.map((s: ScheduleEntry) => s.grade))].sort()
        setGrades(uniqueGrades)
        if (uniqueGrades.length > 0 && selectedGrade === "Todos los cursos") {
          setSelectedGrade(uniqueGrades[0])
        }
      } catch (error) {
        console.error("Error parsing schedules:", error)
        setSchedules([])
      }
    } else {
      setSchedules([])
    }
  }

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

  const generateId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
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

          // Formato esperado: Curso | Día | Horario | Materia | Profesor | Tipo
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[]
            if (row.length >= 5 && row[0]) {
              scheduleEntries.push({
                id: generateId(),
                grade: String(row[0] || "").trim(),
                day: String(row[1] || "").trim(),
                time: String(row[2] || "").trim(),
                subject: String(row[3] || "").trim(),
                teacher: String(row[4] || "").trim(),
                type: (String(row[5] || "")
                  .trim()
                  .toLowerCase() === "taller"
                  ? "taller"
                  : "teoria") as "teoria" | "taller",
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

      // Extraer grados únicos
      const uniqueGrades = [...new Set(processedSchedules.map((s) => s.grade))].sort()
      setGrades(uniqueGrades)
      if (uniqueGrades.length > 0 && selectedGrade === "Todos los cursos") {
        setSelectedGrade(uniqueGrades[0])
      }

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
      ["Curso", "Día", "Horario", "Materia", "Profesor", "Tipo"],
      ["1° A", "Lunes", "08:00 - 08:45", "Matemáticas", "Prof. García", "teoria"],
      ["1° A", "Lunes", "08:45 - 09:30", "Taller de Electrónica", "Prof. Martínez", "taller"],
      ["1° A", "Martes", "08:00 - 08:45", "Historia", "Prof. Rodríguez", "teoria"],
      ["2° B", "Lunes", "08:00 - 08:45", "Taller de Mecánica", "Prof. Fernández", "taller"],
    ]

    const ws = XLSX.utils.aoa_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Horarios")
    XLSX.writeFile(wb, "plantilla_horarios.xlsx")
  }

  const handleAddEntry = () => {
    if (!newEntry.grade || !newEntry.day || !newEntry.time || !newEntry.subject) {
      setMessage({
        type: "error",
        text: "Por favor completa todos los campos obligatorios (Curso, Día, Horario y Materia)",
      })
      return
    }

    const entry: ScheduleEntry = {
      id: generateId(),
      grade: newEntry.grade,
      day: newEntry.day,
      time: newEntry.time,
      subject: newEntry.subject,
      teacher: newEntry.teacher || "",
      type: newEntry.type || "teoria",
    }

    const updatedSchedules = [...schedules, entry]
    setSchedules(updatedSchedules)
    localStorage.setItem("schoolSchedules", JSON.stringify(updatedSchedules))

    // Actualizar lista de grados si es necesario
    if (!grades.includes(entry.grade)) {
      const updatedGrades = [...grades, entry.grade].sort()
      setGrades(updatedGrades)
      if (selectedGrade === "Todos los cursos") {
        setSelectedGrade(entry.grade)
      }
    }

    // Limpiar el formulario
    setNewEntry({
      grade: entry.grade, // Mantener el mismo grado para facilitar la entrada de datos
      day: "",
      time: "",
      subject: "",
      teacher: "",
      type: "teoria",
    })

    setMessage({
      type: "success",
      text: "Horario agregado correctamente",
    })

    // Ocultar el mensaje después de 3 segundos
    setTimeout(() => {
      setMessage(null)
    }, 3000)
  }

  const handleEditEntry = (entry: ScheduleEntry) => {
    setEditMode(entry.id)
    setEditingEntry({ ...entry })
  }

  const handleSaveEdit = () => {
    if (!editingEntry) return

    const updatedSchedules = schedules.map((entry) => (entry.id === editingEntry.id ? { ...editingEntry } : entry))

    setSchedules(updatedSchedules)
    localStorage.setItem("schoolSchedules", JSON.stringify(updatedSchedules))
    setEditMode(null)
    setEditingEntry(null)

    setMessage({
      type: "success",
      text: "Horario actualizado correctamente",
    })

    // Ocultar el mensaje después de 3 segundos
    setTimeout(() => {
      setMessage(null)
    }, 3000)
  }

  const handleCancelEdit = () => {
    setEditMode(null)
    setEditingEntry(null)
  }

  const handleDeleteEntry = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este horario?")) {
      const updatedSchedules = schedules.filter((entry) => entry.id !== id)
      setSchedules(updatedSchedules)
      localStorage.setItem("schoolSchedules", JSON.stringify(updatedSchedules))

      // Actualizar lista de grados si es necesario
      const remainingGrades = [...new Set(updatedSchedules.map((s) => s.grade))].sort()
      setGrades(remainingGrades)
      if (remainingGrades.length > 0 && !remainingGrades.includes(selectedGrade)) {
        setSelectedGrade(remainingGrades[0])
      }

      setMessage({
        type: "success",
        text: "Horario eliminado correctamente",
      })

      // Ocultar el mensaje después de 3 segundos
      setTimeout(() => {
        setMessage(null)
      }, 3000)
    }
  }

  const handleExportToExcel = () => {
    // Preparar los datos para exportar
    const exportData = [
      ["Curso", "Día", "Horario", "Materia", "Profesor", "Tipo"], // Encabezados
      ...schedules.map((entry) => [entry.grade, entry.day, entry.time, entry.subject, entry.teacher, entry.type]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Horarios")
    XLSX.writeFile(wb, "horarios_escuela.xlsx")
  }

  const getRowStyles = (entry: ScheduleEntry) => {
    if (entry.type === "teoria") {
      return "bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200"
    } else {
      return "bg-gradient-to-r from-green-50 to-green-100 border-green-200"
    }
  }

  const filteredSchedules =
    selectedGrade !== "Todos los cursos" ? schedules.filter((entry) => entry.grade === selectedGrade) : schedules

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img src="/logo.png" alt="Logo EEST Nº6" className="h-16 w-16 drop-shadow-md" />
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-blue-600/20 rounded-full blur-xl"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                  ESCUELA TECNICA Nº6
                </h1>
                <p className="text-lg font-semibold text-slate-700">"ING. JUAN V. PASSALACQUA"</p>
                <p className="text-sm text-slate-600">Panel de Administración</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center gap-2 bg-white/50 backdrop-blur-sm border-red-200 hover:bg-red-50 hover:border-red-300"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
              <Link href="/">
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-white/50 backdrop-blur-sm border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver a Horarios
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="edit" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/70 backdrop-blur-sm">
            <TabsTrigger
              value="edit"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              Editar Horarios
            </TabsTrigger>
            <TabsTrigger
              value="import"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              Importar/Exportar Excel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit">
            <div className="grid gap-6">
              <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-slate-200">
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg">
                      <Edit className="h-5 w-5 text-white" />
                    </div>
                    Gestionar Horarios
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Agrega, edita o elimina horarios directamente. Los cambios se guardan automáticamente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="filter-grade">Filtrar por Curso</Label>
                      <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                        <SelectTrigger id="filter-grade" className="bg-white/70">
                          <SelectValue placeholder="Seleccionar curso" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Todos los cursos">Todos los cursos</SelectItem>
                          {grades.map((grade) => (
                            <SelectItem key={grade} value={grade}>
                              {grade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        onClick={handleExportToExcel}
                        className="flex items-center gap-2 bg-white/70 border-emerald-200 hover:bg-emerald-50"
                      >
                        <Download className="h-4 w-4" />
                        Exportar a Excel
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-lg mt-4 bg-white/50 backdrop-blur-sm shadow-lg">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gradient-to-r from-slate-100 to-slate-200">
                            <th className="border-b px-4 py-3 text-left font-semibold text-slate-700">Curso</th>
                            <th className="border-b px-4 py-3 text-left font-semibold text-slate-700">Día</th>
                            <th className="border-b px-4 py-3 text-left font-semibold text-slate-700">Horario</th>
                            <th className="border-b px-4 py-3 text-left font-semibold text-slate-700">Materia</th>
                            <th className="border-b px-4 py-3 text-left font-semibold text-slate-700">Profesor</th>
                            <th className="border-b px-4 py-3 text-left font-semibold text-slate-700">Tipo</th>
                            <th className="border-b px-4 py-3 text-center font-semibold text-slate-700">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSchedules.length > 0 ? (
                            filteredSchedules.map((entry, index) => (
                              <tr
                                key={entry.id}
                                className={`hover:bg-white/70 ${index % 2 === 0 ? "bg-white/30" : ""}`}
                              >
                                {editMode === entry.id ? (
                                  // Modo edición
                                  <>
                                    <td className="border-b px-4 py-2">
                                      <Input
                                        value={editingEntry?.grade || ""}
                                        onChange={(e) => setEditingEntry({ ...editingEntry!, grade: e.target.value })}
                                        className="bg-white/70"
                                      />
                                    </td>
                                    <td className="border-b px-4 py-2">
                                      <Select
                                        value={editingEntry?.day || ""}
                                        onValueChange={(value) => setEditingEntry({ ...editingEntry!, day: value })}
                                      >
                                        <SelectTrigger className="bg-white/70">
                                          <SelectValue placeholder="Día" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {DAYS.map((day) => (
                                            <SelectItem key={day} value={day}>
                                              {day}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </td>
                                    <td className="border-b px-4 py-2">
                                      <Select
                                        value={editingEntry?.time || ""}
                                        onValueChange={(value) => setEditingEntry({ ...editingEntry!, time: value })}
                                      >
                                        <SelectTrigger className="bg-white/70">
                                          <SelectValue placeholder="Horario" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {TIMES.map((time) => (
                                            <SelectItem key={time} value={time}>
                                              {time}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </td>
                                    <td className="border-b px-4 py-2">
                                      <Input
                                        value={editingEntry?.subject || ""}
                                        onChange={(e) => setEditingEntry({ ...editingEntry!, subject: e.target.value })}
                                        className="bg-white/70"
                                      />
                                    </td>
                                    <td className="border-b px-4 py-2">
                                      <Input
                                        value={editingEntry?.teacher || ""}
                                        onChange={(e) => setEditingEntry({ ...editingEntry!, teacher: e.target.value })}
                                        className="bg-white/70"
                                      />
                                    </td>
                                    <td className="border-b px-4 py-2">
                                      <Select
                                        value={editingEntry?.type || "teoria"}
                                        onValueChange={(value) =>
                                          setEditingEntry({ ...editingEntry!, type: value as "teoria" | "taller" })
                                        }
                                      >
                                        <SelectTrigger className="bg-white/70">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="teoria">
                                            <div className="flex items-center gap-2">
                                              <BookOpen className="h-4 w-4" />
                                              Teoría
                                            </div>
                                          </SelectItem>
                                          <SelectItem value="taller">
                                            <div className="flex items-center gap-2">
                                              <Wrench className="h-4 w-4" />
                                              Taller
                                            </div>
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </td>
                                    <td className="border-b px-4 py-2 text-center">
                                      <div className="flex justify-center gap-2">
                                        <Button
                                          size="sm"
                                          onClick={handleSaveEdit}
                                          className="h-8 px-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                                        >
                                          <Save className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={handleCancelEdit}
                                          className="h-8 px-2"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  // Modo visualización
                                  <>
                                    <td className="border-b px-4 py-3 font-medium">{entry.grade}</td>
                                    <td className="border-b px-4 py-3">{entry.day}</td>
                                    <td className="border-b px-4 py-3">{entry.time}</td>
                                    <td className="border-b px-4 py-3 font-medium">{entry.subject}</td>
                                    <td className="border-b px-4 py-3">{entry.teacher}</td>
                                    <td className="border-b px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        {entry.type === "teoria" ? (
                                          <>
                                            <BookOpen className="h-4 w-4 text-emerald-600" />
                                            <span className="text-emerald-700 font-medium">Teoría</span>
                                          </>
                                        ) : (
                                          <>
                                            <Wrench className="h-4 w-4 text-green-600" />
                                            <span className="text-green-700 font-medium">Taller</span>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                    <td className="border-b px-4 py-3 text-center">
                                      <div className="flex justify-center gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleEditEntry(entry)}
                                          className="h-8 px-2 border-emerald-200 hover:bg-emerald-50"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleDeleteEntry(entry.id)}
                                          className="h-8 px-2 text-red-500 hover:text-red-700 border-red-200 hover:bg-red-50"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                No hay horarios para mostrar. Agrega uno nuevo o importa desde Excel.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-slate-200">
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg">
                      <Plus className="h-5 w-5 text-white" />
                    </div>
                    Agregar Nuevo Horario
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div>
                      <Label htmlFor="new-grade">Curso *</Label>
                      <Input
                        id="new-grade"
                        value={newEntry.grade || ""}
                        onChange={(e) => setNewEntry({ ...newEntry, grade: e.target.value })}
                        placeholder="Ej: 1° A"
                        list="grade-options"
                        className="bg-white/70"
                      />
                      <datalist id="grade-options">
                        {grades.map((grade) => (
                          <option key={grade} value={grade} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <Label htmlFor="new-day">Día *</Label>
                      <Select
                        value={newEntry.day || ""}
                        onValueChange={(value) => setNewEntry({ ...newEntry, day: value })}
                      >
                        <SelectTrigger id="new-day" className="bg-white/70">
                          <SelectValue placeholder="Seleccionar día" />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map((day) => (
                            <SelectItem key={day} value={day}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="new-time">Horario *</Label>
                      <Select
                        value={newEntry.time || ""}
                        onValueChange={(value) => setNewEntry({ ...newEntry, time: value })}
                      >
                        <SelectTrigger id="new-time" className="bg-white/70">
                          <SelectValue placeholder="Seleccionar horario" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMES.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="new-subject">Materia *</Label>
                      <Input
                        id="new-subject"
                        value={newEntry.subject || ""}
                        onChange={(e) => setNewEntry({ ...newEntry, subject: e.target.value })}
                        placeholder="Ej: Matemáticas"
                        className="bg-white/70"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-teacher">Profesor</Label>
                      <Input
                        id="new-teacher"
                        value={newEntry.teacher || ""}
                        onChange={(e) => setNewEntry({ ...newEntry, teacher: e.target.value })}
                        placeholder="Ej: Prof. García"
                        className="bg-white/70"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-type">Tipo *</Label>
                      <Select
                        value={newEntry.type || "teoria"}
                        onValueChange={(value) => setNewEntry({ ...newEntry, type: value as "teoria" | "taller" })}
                      >
                        <SelectTrigger id="new-type" className="bg-white/70">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="teoria">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              Teoría
                            </div>
                          </SelectItem>
                          <SelectItem value="taller">
                            <div className="flex items-center gap-2">
                              <Wrench className="h-4 w-4" />
                              Taller
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end bg-gradient-to-r from-slate-50 to-slate-100">
                  <Button
                    onClick={handleAddEntry}
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white shadow-lg"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar Horario
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="import">
            <div className="grid gap-6">
              <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-slate-200">
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg">
                      <Upload className="h-5 w-5 text-white" />
                    </div>
                    Cargar Horarios desde Excel
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Sube un archivo Excel con los horarios del colegio. El archivo debe tener las columnas: Curso, Día,
                    Horario, Materia, Profesor, Tipo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="space-y-2">
                    <Label htmlFor="excel-file">Archivo Excel</Label>
                    <Input
                      id="excel-file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      className="bg-white/70"
                    />
                  </div>

                  {file && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <FileSpreadsheet className="h-4 w-4" />
                      {file.name}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={handleUpload}
                      disabled={!file || loading}
                      className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white"
                    >
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

                    <Button
                      variant="outline"
                      onClick={downloadTemplate}
                      className="flex items-center gap-2 bg-white/70 border-emerald-200 hover:bg-emerald-50"
                    >
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

              <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-slate-200">
                  <CardTitle className="text-slate-800">Formato del Archivo Excel</CardTitle>
                  <CardDescription className="text-slate-600">
                    El archivo Excel debe tener las siguientes columnas en este orden:
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-300 bg-white/50 backdrop-blur-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-slate-100 to-slate-200">
                          <th className="border border-slate-300 p-3 text-left font-semibold">Columna A</th>
                          <th className="border border-slate-300 p-3 text-left font-semibold">Columna B</th>
                          <th className="border border-slate-300 p-3 text-left font-semibold">Columna C</th>
                          <th className="border border-slate-300 p-3 text-left font-semibold">Columna D</th>
                          <th className="border border-slate-300 p-3 text-left font-semibold">Columna E</th>
                          <th className="border border-slate-300 p-3 text-left font-semibold">Columna F</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-300 p-3 font-medium">Curso</td>
                          <td className="border border-slate-300 p-3 font-medium">Día</td>
                          <td className="border border-slate-300 p-3 font-medium">Horario</td>
                          <td className="border border-slate-300 p-3 font-medium">Materia</td>
                          <td className="border border-slate-300 p-3 font-medium">Profesor</td>
                          <td className="border border-slate-300 p-3 font-medium">Tipo</td>
                        </tr>
                        <tr className="bg-white/70">
                          <td className="border border-slate-300 p-3 text-sm">1° A</td>
                          <td className="border border-slate-300 p-3 text-sm">Lunes</td>
                          <td className="border border-slate-300 p-3 text-sm">08:00 - 08:45</td>
                          <td className="border border-slate-300 p-3 text-sm">Matemáticas</td>
                          <td className="border border-slate-300 p-3 text-sm">Prof. García</td>
                          <td className="border border-slate-300 p-3 text-sm">teoria</td>
                        </tr>
                        <tr className="bg-slate-50/70">
                          <td className="border border-slate-300 p-3 text-sm">1° A</td>
                          <td className="border border-slate-300 p-3 text-sm">Lunes</td>
                          <td className="border border-slate-300 p-3 text-sm">08:45 - 09:30</td>
                          <td className="border border-slate-300 p-3 text-sm">Taller de Electrónica</td>
                          <td className="border border-slate-300 p-3 text-sm">Prof. Martínez</td>
                          <td className="border border-slate-300 p-3 text-sm">taller</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 text-sm text-slate-600 space-y-2">
                    <p>
                      <strong>Nota:</strong> La primera fila debe contener los encabezados como se muestra arriba.
                    </p>
                    <p>Los días deben escribirse como: Lunes, Martes, Miércoles, Jueves, Viernes</p>
                    <p>
                      El tipo debe ser: <strong>teoria</strong> o <strong>taller</strong>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
