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
  Clock,
  Eye,
  Users,
  GraduationCap,
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
  teacherType: "titular" | "suplente" | "provisional"
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
const DEFAULT_TIMES = [
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
    teacherType: "titular",
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [customTimes, setCustomTimes] = useState<string[]>([])
  const [newTime, setNewTime] = useState("")
  const [editingTime, setEditingTime] = useState<{ index: number; value: string } | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string>("Todas las materias")
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([])

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

    // Cargar horarios existentes y horarios personalizados
    loadSchedules()
    loadCustomTimes()
  }, [router])

  const loadSchedules = () => {
    const savedSchedules = localStorage.getItem("schoolSchedules")
    if (savedSchedules) {
      try {
        const parsed = JSON.parse(savedSchedules)
        // Asegurarse de que cada entrada tenga un ID, tipo y tipo de docente
        const schedulesWithIds = parsed.map((entry: any) => ({
          ...entry,
          id: entry.id || generateId(),
          type: entry.type || "teoria",
          teacherType: entry.teacherType || "titular", // Valor por defecto para datos existentes
        }))
        setSchedules(schedulesWithIds)

        // Extraer grados únicos
        const uniqueGrades = [...new Set(schedulesWithIds.map((s: ScheduleEntry) => s.grade))].sort()
        setGrades(uniqueGrades)
        if (uniqueGrades.length > 0 && selectedGrade === "Todos los cursos") {
          setSelectedGrade(uniqueGrades[0])
        }

        // Extraer materias únicas
        const uniqueSubjects = [...new Set(schedulesWithIds.map((s: ScheduleEntry) => s.subject))].sort()
        setAvailableSubjects(uniqueSubjects)
      } catch (error) {
        console.error("Error parsing schedules:", error)
        setSchedules([])
      }
    } else {
      setSchedules([])
    }
  }

  const loadCustomTimes = () => {
    const savedTimes = localStorage.getItem("schoolTimes")
    if (savedTimes) {
      try {
        const parsed = JSON.parse(savedTimes)
        setCustomTimes(parsed)
      } catch (error) {
        console.error("Error parsing times:", error)
        setCustomTimes(DEFAULT_TIMES)
      }
    } else {
      setCustomTimes(DEFAULT_TIMES)
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

          // Formato esperado: Curso | Día | Horario | Materia | Profesor | Tipo | Tipo Docente
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[]
            if (row.length >= 5 && row[0]) {
              const teacherTypeValue = String(row[6] || "")
                .trim()
                .toLowerCase()
              let teacherType: "titular" | "suplente" | "provisional" = "titular"

              if (teacherTypeValue === "suplente") teacherType = "suplente"
              else if (teacherTypeValue === "provisional") teacherType = "provisional"

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
                teacherType,
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

      // Extraer materias únicas
      const uniqueSubjects = [...new Set(processedSchedules.map((s) => s.subject))].sort()
      setAvailableSubjects(uniqueSubjects)

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
      ["Curso", "Día", "Horario", "Materia", "Profesor", "Tipo", "Tipo Docente"],
      ["1° A", "Lunes", "08:00 - 08:45", "Matemáticas", "Prof. García", "teoria", "titular"],
      ["1° A", "Lunes", "08:45 - 09:30", "Taller de Electrónica", "Prof. Martínez", "taller", "suplente"],
      ["1° A", "Martes", "08:00 - 08:45", "Historia", "Prof. Rodríguez", "teoria", "provisional"],
      ["2° B", "Lunes", "08:00 - 08:45", "Taller de Mecánica", "Prof. Fernández", "taller", "titular"],
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
      teacherType: newEntry.teacherType || "titular",
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

    // Actualizar lista de materias si es necesario
    if (!availableSubjects.includes(entry.subject)) {
      const updatedSubjects = [...availableSubjects, entry.subject].sort()
      setAvailableSubjects(updatedSubjects)
    }

    // Limpiar el formulario
    setNewEntry({
      grade: entry.grade,
      day: "",
      time: "",
      subject: "",
      teacher: "",
      type: "teoria",
      teacherType: "titular",
    })

    setMessage({
      type: "success",
      text: "Horario agregado correctamente",
    })

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

    // Actualizar lista de materias
    const uniqueSubjects = [...new Set(updatedSchedules.map((s) => s.subject))].sort()
    setAvailableSubjects(uniqueSubjects)

    setMessage({
      type: "success",
      text: "Horario actualizado correctamente",
    })

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

      // Actualizar lista de materias
      const uniqueSubjects = [...new Set(updatedSchedules.map((s) => s.subject))].sort()
      setAvailableSubjects(uniqueSubjects)

      setMessage({
        type: "success",
        text: "Horario eliminado correctamente",
      })

      setTimeout(() => {
        setMessage(null)
      }, 3000)
    }
  }

  const handleExportToExcel = () => {
    const exportData = [
      ["Curso", "Día", "Horario", "Materia", "Profesor", "Tipo", "Tipo Docente"],
      ...schedules.map((entry) => [
        entry.grade,
        entry.day,
        entry.time,
        entry.subject,
        entry.teacher,
        entry.type,
        entry.teacherType,
      ]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Horarios")
    XLSX.writeFile(wb, "horarios_escuela.xlsx")
  }

  const handleAddTime = () => {
    if (!newTime.trim()) {
      setMessage({
        type: "error",
        text: "Por favor ingresa un horario válido",
      })
      return
    }

    if (customTimes.includes(newTime.trim())) {
      setMessage({
        type: "error",
        text: "Este horario ya existe",
      })
      return
    }

    const updatedTimes = [...customTimes, newTime.trim()].sort()
    setCustomTimes(updatedTimes)
    localStorage.setItem("schoolTimes", JSON.stringify(updatedTimes))
    setNewTime("")

    setMessage({
      type: "success",
      text: "Horario agregado correctamente",
    })

    setTimeout(() => {
      setMessage(null)
    }, 3000)
  }

  const handleEditTime = (index: number) => {
    setEditingTime({ index, value: customTimes[index] })
  }

  const handleSaveTimeEdit = () => {
    if (!editingTime || !editingTime.value.trim()) return

    const updatedTimes = [...customTimes]
    updatedTimes[editingTime.index] = editingTime.value.trim()
    updatedTimes.sort()

    setCustomTimes(updatedTimes)
    localStorage.setItem("schoolTimes", JSON.stringify(updatedTimes))
    setEditingTime(null)

    setMessage({
      type: "success",
      text: "Horario actualizado correctamente",
    })

    setTimeout(() => {
      setMessage(null)
    }, 3000)
  }

  const handleCancelTimeEdit = () => {
    setEditingTime(null)
  }

  const handleDeleteTime = (index: number) => {
    const timeToDelete = customTimes[index]
    const schedulesUsingTime = schedules.filter((s) => s.time === timeToDelete)

    if (schedulesUsingTime.length > 0) {
      if (
        !confirm(
          `Este horario está siendo usado por ${schedulesUsingTime.length} materia(s). ¿Estás seguro de que deseas eliminarlo? Esto también eliminará las materias asociadas.`,
        )
      ) {
        return
      }

      const updatedSchedules = schedules.filter((s) => s.time !== timeToDelete)
      setSchedules(updatedSchedules)
      localStorage.setItem("schoolSchedules", JSON.stringify(updatedSchedules))
    }

    const updatedTimes = customTimes.filter((_, i) => i !== index)
    setCustomTimes(updatedTimes)
    localStorage.setItem("schoolTimes", JSON.stringify(updatedTimes))

    setMessage({
      type: "success",
      text: "Horario eliminado correctamente",
    })

    setTimeout(() => {
      setMessage(null)
    }, 3000)
  }

  const resetToDefaultTimes = () => {
    if (
      confirm(
        "¿Estás seguro de que deseas restaurar los horarios por defecto? Esto eliminará todos los horarios personalizados.",
      )
    ) {
      setCustomTimes(DEFAULT_TIMES)
      localStorage.setItem("schoolTimes", JSON.stringify(DEFAULT_TIMES))

      setMessage({
        type: "success",
        text: "Horarios restaurados a los valores por defecto",
      })

      setTimeout(() => {
        setMessage(null)
      }, 3000)
    }
  }

  const getTeacherTypeStyles = (teacherType: "titular" | "suplente" | "provisional") => {
    switch (teacherType) {
      case "titular":
        return {
          background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
          border: "border-blue-200",
          text: "text-white",
          badge: "bg-blue-100 text-blue-800",
        }
      case "suplente":
        return {
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          border: "border-emerald-200",
          text: "text-white",
          badge: "bg-emerald-100 text-emerald-800",
        }
      case "provisional":
        return {
          background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          border: "border-red-200",
          text: "text-white",
          badge: "bg-red-100 text-red-800",
        }
      default:
        return {
          background: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
          border: "border-gray-200",
          text: "text-white",
          badge: "bg-gray-100 text-gray-800",
        }
    }
  }

  const getScheduleForGradeAndDay = (grade: string, day: string, time: string) => {
    return schedules.filter((s) => s.grade === grade && s.day === day && s.time === time)
  }

  const getSchedulesBySubject = (subject: string) => {
    return schedules.filter((s) => s.subject === subject)
  }

  const filteredSchedules =
    selectedGrade !== "Todos los cursos" ? schedules.filter((entry) => entry.grade === selectedGrade) : schedules

  const filteredBySubject =
    selectedSubject !== "Todas las materias"
      ? filteredSchedules.filter((entry) => entry.subject === selectedSubject)
      : filteredSchedules

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
        <Tabs defaultValue="view" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8 bg-white/70 backdrop-blur-sm">
            <TabsTrigger
              value="view"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              Vista Administrador
            </TabsTrigger>
            <TabsTrigger
              value="subject"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              Por Materia
            </TabsTrigger>
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
              Importar/Exportar
            </TabsTrigger>
            <TabsTrigger
              value="times"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              Gestionar Horarios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="view">
            <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  Vista de Administrador - Horarios por Tipo de Docente
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Vista especial para administradores con colores según el tipo de docente
                  <div className="flex items-center gap-6 mt-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-gradient-to-br from-blue-500 to-blue-600"></div>
                      <span>Titular</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-gradient-to-br from-emerald-500 to-emerald-600"></div>
                      <span>Suplente</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-gradient-to-br from-red-500 to-red-600"></div>
                      <span>Provisional</span>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-6">
                  <Label htmlFor="admin-grade-filter">Filtrar por Curso</Label>
                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                    <SelectTrigger id="admin-grade-filter" className="w-48 bg-white/70">
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

                {selectedGrade && (
                  <Card className="bg-white/50 backdrop-blur-sm shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                      <CardTitle className="flex items-center gap-2 text-slate-800">
                        <GraduationCap className="h-5 w-5" />
                        {selectedGrade === "Todos los cursos" ? "Todos los Cursos" : `Horario - ${selectedGrade}`}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left p-4 font-semibold text-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 min-w-[120px]">
                                Horario
                              </th>
                              {DAYS.map((day) => (
                                <th
                                  key={day}
                                  className="text-left p-4 font-semibold text-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 min-w-[200px]"
                                >
                                  {day}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {customTimes.map((time, index) => (
                              <tr
                                key={time}
                                className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white/50" : ""}`}
                              >
                                <td className="p-4 font-medium text-slate-700 bg-gradient-to-r from-slate-50/50 to-white/50">
                                  {time}
                                </td>
                                {DAYS.map((day) => {
                                  const entries = getScheduleForGradeAndDay(
                                    selectedGrade === "Todos los cursos" ? "" : selectedGrade,
                                    day,
                                    time,
                                  ).filter((entry) =>
                                    selectedGrade === "Todos los cursos" ? true : entry.grade === selectedGrade,
                                  )

                                  return (
                                    <td key={`${day}-${time}`} className="p-2">
                                      {time === "11:00 - 11:15" ? (
                                        <div className="p-3 rounded-lg shadow-sm border-2 border-amber-200 bg-gradient-to-br from-amber-400 to-amber-500">
                                          <div className="text-center">
                                            <div className="font-bold text-amber-900 text-sm">RECREO</div>
                                          </div>
                                        </div>
                                      ) : entries.length > 0 ? (
                                        <div className="space-y-1">
                                          {entries.map((entry) => {
                                            const styles = getTeacherTypeStyles(entry.teacherType)
                                            return (
                                              <div
                                                key={entry.id}
                                                className={`p-2 rounded-lg shadow-sm border-2 ${styles.border} transition-all duration-200 hover:shadow-md`}
                                                style={{
                                                  background: styles.background,
                                                }}
                                              >
                                                <div className="space-y-1">
                                                  <div className={`font-semibold text-xs ${styles.text}`}>
                                                    {entry.subject}
                                                  </div>
                                                  <div className={`text-xs ${styles.text} opacity-90`}>
                                                    {entry.teacher}
                                                  </div>
                                                  {selectedGrade === "Todos los cursos" && (
                                                    <div className={`text-xs ${styles.text} opacity-80`}>
                                                      {entry.grade}
                                                    </div>
                                                  )}
                                                  <div className="flex items-center gap-1">
                                                    <span className={`text-xs px-1 py-0.5 rounded ${styles.badge}`}>
                                                      {entry.teacherType.charAt(0).toUpperCase() +
                                                        entry.teacherType.slice(1)}
                                                    </span>
                                                    {entry.type === "taller" && (
                                                      <Wrench className="h-3 w-3 text-white opacity-80" />
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      ) : (
                                        <div className="p-3 rounded-lg bg-slate-50/50 border-2 border-slate-100">
                                          <div className="text-slate-300 text-center text-sm">-</div>
                                        </div>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subject">
            <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  Vista por Materia - Titulares y Suplentes
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Visualiza todos los docentes asignados a cada materia (titular, suplente, provisional)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-6">
                  <Label htmlFor="subject-filter">Filtrar por Materia</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger id="subject-filter" className="w-64 bg-white/70">
                      <SelectValue placeholder="Seleccionar materia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todas las materias">Todas las materias</SelectItem>
                      {availableSubjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4">
                  {availableSubjects
                    .filter((subject) =>
                      selectedSubject === "Todas las materias" ? true : subject === selectedSubject,
                    )
                    .map((subject) => {
                      const subjectSchedules = getSchedulesBySubject(subject)
                      const titulares = subjectSchedules.filter((s) => s.teacherType === "titular")
                      const suplentes = subjectSchedules.filter((s) => s.teacherType === "suplente")
                      const provisionales = subjectSchedules.filter((s) => s.teacherType === "provisional")

                      return (
                        <Card key={subject} className="bg-white/50 backdrop-blur-sm shadow-lg">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg text-slate-800">{subject}</CardTitle>
                            <CardDescription>
                              {subjectSchedules.length} horario(s) asignado(s) - {titulares.length} titular(es),{" "}
                              {suplentes.length} suplente(s), {provisionales.length} provisional(es)
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Titulares */}
                              <div>
                                <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                                  Titulares ({titulares.length})
                                </h4>
                                <div className="space-y-2">
                                  {titulares.map((entry) => (
                                    <div key={entry.id} className="p-2 rounded border-l-4 border-blue-500 bg-blue-50">
                                      <div className="font-medium text-sm">{entry.teacher}</div>
                                      <div className="text-xs text-slate-600">
                                        {entry.grade} - {entry.day} {entry.time}
                                      </div>
                                    </div>
                                  ))}
                                  {titulares.length === 0 && (
                                    <div className="text-sm text-slate-400 italic">Sin titulares asignados</div>
                                  )}
                                </div>
                              </div>

                              {/* Suplentes */}
                              <div>
                                <h4 className="font-semibold text-emerald-700 mb-2 flex items-center gap-2">
                                  <div className="w-3 h-3 rounded bg-emerald-500"></div>
                                  Suplentes ({suplentes.length})
                                </h4>
                                <div className="space-y-2">
                                  {suplentes.map((entry) => (
                                    <div
                                      key={entry.id}
                                      className="p-2 rounded border-l-4 border-emerald-500 bg-emerald-50"
                                    >
                                      <div className="font-medium text-sm">{entry.teacher}</div>
                                      <div className="text-xs text-slate-600">
                                        {entry.grade} - {entry.day} {entry.time}
                                      </div>
                                    </div>
                                  ))}
                                  {suplentes.length === 0 && (
                                    <div className="text-sm text-slate-400 italic">Sin suplentes asignados</div>
                                  )}
                                </div>
                              </div>

                              {/* Provisionales */}
                              <div>
                                <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                                  <div className="w-3 h-3 rounded bg-red-500"></div>
                                  Provisionales ({provisionales.length})
                                </h4>
                                <div className="space-y-2">
                                  {provisionales.map((entry) => (
                                    <div key={entry.id} className="p-2 rounded border-l-4 border-red-500 bg-red-50">
                                      <div className="font-medium text-sm">{entry.teacher}</div>
                                      <div className="text-xs text-slate-600">
                                        {entry.grade} - {entry.day} {entry.time}
                                      </div>
                                    </div>
                                  ))}
                                  {provisionales.length === 0 && (
                                    <div className="text-sm text-slate-400 italic">Sin provisionales asignados</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                            <th className="border-b px-4 py-3 text-left font-semibold text-slate-700">Tipo Docente</th>
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
                                          {customTimes.map((time) => (
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
                                    <td className="border-b px-4 py-2">
                                      <Select
                                        value={editingEntry?.teacherType || "titular"}
                                        onValueChange={(value) =>
                                          setEditingEntry({
                                            ...editingEntry!,
                                            teacherType: value as "titular" | "suplente" | "provisional",
                                          })
                                        }
                                      >
                                        <SelectTrigger className="bg-white/70">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="titular">Titular</SelectItem>
                                          <SelectItem value="suplente">Suplente</SelectItem>
                                          <SelectItem value="provisional">Provisional</SelectItem>
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
                                    <td className="border-b px-4 py-3">
                                      <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          getTeacherTypeStyles(entry.teacherType).badge
                                        }`}
                                      >
                                        {entry.teacherType.charAt(0).toUpperCase() + entry.teacherType.slice(1)}
                                      </span>
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
                              <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
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
                          {customTimes.map((time) => (
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
                        list="subject-options"
                      />
                      <datalist id="subject-options">
                        {availableSubjects.map((subject) => (
                          <option key={subject} value={subject} />
                        ))}
                      </datalist>
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
                    <div>
                      <Label htmlFor="new-teacher-type">Tipo Docente *</Label>
                      <Select
                        value={newEntry.teacherType || "titular"}
                        onValueChange={(value) =>
                          setNewEntry({ ...newEntry, teacherType: value as "titular" | "suplente" | "provisional" })
                        }
                      >
                        <SelectTrigger id="new-teacher-type" className="bg-white/70">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="titular">Titular</SelectItem>
                          <SelectItem value="suplente">Suplente</SelectItem>
                          <SelectItem value="provisional">Provisional</SelectItem>
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
                    Horario, Materia, Profesor, Tipo, Tipo Docente.
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
                          <th className="border border-slate-300 p-3 text-left font-semibold">Columna G</th>
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
                          <td className="border border-slate-300 p-3 font-medium">Tipo Docente</td>
                        </tr>
                        <tr className="bg-white/70">
                          <td className="border border-slate-300 p-3 text-sm">1° A</td>
                          <td className="border border-slate-300 p-3 text-sm">Lunes</td>
                          <td className="border border-slate-300 p-3 text-sm">08:00 - 08:45</td>
                          <td className="border border-slate-300 p-3 text-sm">Matemáticas</td>
                          <td className="border border-slate-300 p-3 text-sm">Prof. García</td>
                          <td className="border border-slate-300 p-3 text-sm">teoria</td>
                          <td className="border border-slate-300 p-3 text-sm">titular</td>
                        </tr>
                        <tr className="bg-slate-50/70">
                          <td className="border border-slate-300 p-3 text-sm">1° A</td>
                          <td className="border border-slate-300 p-3 text-sm">Lunes</td>
                          <td className="border border-slate-300 p-3 text-sm">08:45 - 09:30</td>
                          <td className="border border-slate-300 p-3 text-sm">Taller de Electrónica</td>
                          <td className="border border-slate-300 p-3 text-sm">Prof. Martínez</td>
                          <td className="border border-slate-300 p-3 text-sm">taller</td>
                          <td className="border border-slate-300 p-3 text-sm">suplente</td>
                        </tr>
                        <tr className="bg-white/70">
                          <td className="border border-slate-300 p-3 text-sm">1° A</td>
                          <td className="border border-slate-300 p-3 text-sm">Martes</td>
                          <td className="border border-slate-300 p-3 text-sm">08:00 - 08:45</td>
                          <td className="border border-slate-300 p-3 text-sm">Historia</td>
                          <td className="border border-slate-300 p-3 text-sm">Prof. Rodríguez</td>
                          <td className="border border-slate-300 p-3 text-sm">teoria</td>
                          <td className="border border-slate-300 p-3 text-sm">provisional</td>
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
                    <p>
                      El tipo de docente debe ser: <strong>titular</strong>, <strong>suplente</strong> o{" "}
                      <strong>provisional</strong>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="times">
            <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  Gestionar Horarios Personalizados
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Agrega, edita o elimina los horarios disponibles para las materias
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-6">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Label htmlFor="new-time-input">Nuevo Horario</Label>
                      <Input
                        id="new-time-input"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        placeholder="Ej: 14:15 - 15:00"
                        className="bg-white/70"
                      />
                    </div>
                    <Button
                      onClick={handleAddTime}
                      className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={resetToDefaultTimes}
                      className="border-amber-200 hover:bg-amber-50"
                    >
                      Restaurar por Defecto
                    </Button>
                  </div>

                  <div className="border rounded-lg bg-white/50 backdrop-blur-sm shadow-lg">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gradient-to-r from-slate-100 to-slate-200">
                            <th className="border-b px-4 py-3 text-left font-semibold text-slate-700">Horario</th>
                            <th className="border-b px-4 py-3 text-center font-semibold text-slate-700">
                              Materias Asignadas
                            </th>
                            <th className="border-b px-4 py-3 text-center font-semibold text-slate-700">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customTimes.map((time, index) => {
                            const materiasCount = schedules.filter((s) => s.time === time).length
                            const isRecreo = time === "11:00 - 11:15"

                            return (
                              <tr key={index} className={`hover:bg-white/70 ${index % 2 === 0 ? "bg-white/30" : ""}`}>
                                {editingTime?.index === index ? (
                                  <>
                                    <td className="border-b px-4 py-3">
                                      <Input
                                        value={editingTime.value}
                                        onChange={(e) => setEditingTime({ ...editingTime, value: e.target.value })}
                                        className="bg-white/70"
                                      />
                                    </td>
                                    <td className="border-b px-4 py-3 text-center">
                                      <span className="text-slate-600">{materiasCount} materia(s)</span>
                                    </td>
                                    <td className="border-b px-4 py-3 text-center">
                                      <div className="flex justify-center gap-2">
                                        <Button
                                          size="sm"
                                          onClick={handleSaveTimeEdit}
                                          className="h-8 px-2 bg-gradient-to-r from-emerald-500 to-emerald-600"
                                        >
                                          <Save className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={handleCancelTimeEdit}
                                          className="h-8 px-2"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="border-b px-4 py-3 font-medium">
                                      <div className="flex items-center gap-2">
                                        {time}
                                        {isRecreo && (
                                          <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                                            Recreo
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="border-b px-4 py-3 text-center">
                                      <span
                                        className={`px-2 py-1 rounded-full text-xs ${
                                          materiasCount > 0
                                            ? "bg-emerald-100 text-emerald-800"
                                            : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        {materiasCount} materia(s)
                                      </span>
                                    </td>
                                    <td className="border-b px-4 py-3 text-center">
                                      <div className="flex justify-center gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleEditTime(index)}
                                          className="h-8 px-2 border-emerald-200 hover:bg-emerald-50"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleDeleteTime(index)}
                                          className="h-8 px-2 text-red-500 hover:text-red-700 border-red-200 hover:bg-red-50"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Consejos para gestionar horarios:</h4>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Usa el formato "HH:MM - HH:MM" para mejor legibilidad</li>
                      <li>Los horarios se ordenan automáticamente</li>
                      <li>Al eliminar un horario, también se eliminan las materias asignadas</li>
                      <li>Puedes restaurar los horarios por defecto en cualquier momento</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
