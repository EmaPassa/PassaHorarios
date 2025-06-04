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
  RefreshCw,
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
  "07:40 - 08:40",
  "08:40 - 09:40",
  "09:40 - 09:50",
  "09:50 - 10:50",
  "10:50 - 11:50", 
  "11:55 - 12:55",
  "13:00 - 14:00",
  "14:00 - 15:00",
  "15:00 - 15:10",
  "15:10 - 16:10",
  "16:10 - 17:10", 
  "17:15 - 18:15",
  "17:20 - 18:20",
  "18:20 - 19:20",
  "19:20 - 19:30",
  "19:30 - 20:30", 
  "20:30 - 21:30",
  "21:30 - 22:30",
]

// URL de tu Google Sheet en formato CSV
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1C1st8qO7UEYZPQZUR39g6mR8GR-BrEWr/export?format=csv&gid=0"

export default function AdminPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null)
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const router = useRouter()
}
  const generateId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  const parseCSV = (csvText: string): ScheduleEntry[] => {
    try {
      const lines = csvText.split('\n').map(line => line.trim()).filter(line => line)
      if (lines.length === 0) throw new Error("CSV vacío")
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'))
      const scheduleEntries: ScheduleEntry[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        if (!line) continue
        
        const values = line.split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'))
        
        if (values.length >= 6) {
          const entry: ScheduleEntry = {
            id: generateId(),
            grade: values[0]?.toString().trim() || '',
            day: values[1]?.toString().trim() || '',
            time: values[2]?.toString().trim() || '',
            subject: values[3]?.toString().trim() || '',
            teacher: values[4]?.toString().trim() || '',
            type: (values[5]?.toString().toLowerCase().trim() === 'taller' ? 'taller' : 'teoria') as "teoria" | "taller",
            teacherType: (values[6]?.toString().toLowerCase().trim() as "titular" | "suplente" | "provisional") || 'titular'
          }
          
          if (entry.grade && entry.day && entry.time && entry.subject) {
            scheduleEntries.push(entry)
          }
        }
      }
      
      return scheduleEntries
    } catch (error) {
      console.error("Error parseando CSV:", error)
      throw error
    }
  }

  const loadFromGoogleSheets = async () => {
    setLoading(true)
    setMessage(null)
    
    try {
      const response = await fetch(GOOGLE_SHEET_CSV_URL, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
        cache: 'no-store'
      })
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const csvText = await response.text()
      if (!csvText) throw new Error('El archivo CSV está vacío')
      
      const parsedSchedules = parseCSV(csvText)
      
      // Combinar con datos locales (si existen)
      const localSchedules = localStorage.getItem("schoolSchedules")
      let allSchedules = [...parsedSchedules]
      
      if (localSchedules) {
        try {
          const localParsed = JSON.parse(localSchedules)
          // Evitar duplicados
          localParsed.forEach((localEntry: ScheduleEntry) => {
            if (!parsedSchedules.some(e => 
              e.grade === localEntry.grade && 
              e.day === localEntry.day && 
              e.time === localEntry.time &&
              e.subject === localEntry.subject
            )) {
              allSchedules.push(localEntry)
            }
          })
        } catch (e) {
          console.error("Error al parsear datos locales:", e)
        }
      }
      
      setSchedules(allSchedules)
      
      // Actualizar listas de grados y materias
      const uniqueGrades = [...new Set(allSchedules.map(s => s.grade))].sort()
      setGrades(uniqueGrades)
      if (uniqueGrades.length > 0 && !selectedGrade) {
        setSelectedGrade(uniqueGrades[0])
      }
      
      const uniqueSubjects = [...new Set(allSchedules.map(s => s.subject))].sort()
      setAvailableSubjects(uniqueSubjects)
      
      setLastUpdated(new Date())
      
      setMessage({
        type: "success",
        text: `Datos cargados desde Google Sheets (${parsedSchedules.length} entradas)`
      })
      
    } catch (err) {
      console.error("Error loading from Google Sheets:", err)
      setMessage({
        type: "error",
        text: "Error al cargar desde Google Sheets. Usando datos locales."
      })
      // Cargar solo datos locales si falla
      loadSchedules()
    } finally {
      setLoading(false)
    }
  }

  const loadSchedules = () => {
    const savedSchedules = localStorage.getItem("schoolSchedules")
    if (savedSchedules) {
      try {
        const parsed = JSON.parse(savedSchedules)
        const schedulesWithIds = parsed.map((entry: any) => ({
          ...entry,
          id: entry.id || generateId(),
          type: entry.type || "teoria",
          teacherType: entry.teacherType || "titular"
        }))
        setSchedules(schedulesWithIds)

        const uniqueGrades = [...new Set(schedulesWithIds.map((s: ScheduleEntry) => s.grade))].sort()
        setGrades(uniqueGrades)
        if (uniqueGrades.length > 0 && selectedGrade === "Todos los cursos") {
          setSelectedGrade(uniqueGrades[0])
        }

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

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("adminAuthenticated")
    const loginTime = localStorage.getItem("adminLoginTime")

    if (!isAuthenticated || !loginTime) {
      router.push("/admin/login")
      return
    }

    const now = Date.now()
    const loginTimestamp = Number.parseInt(loginTime)
    const twentyFourHours = 24 * 60 * 60 * 1000

    if (now - loginTimestamp > twentyFourHours) {
      localStorage.removeItem("adminAuthenticated")
      localStorage.removeItem("adminLoginTime")
      router.push("/admin/login")
      return
    }

    loadFromGoogleSheets()
    loadCustomTimes()
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

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[]
            if (row.length >= 5 && row[0]) {
              const teacherTypeValue = String(row[6] || "").trim().toLowerCase()
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
                type: (String(row[5] || "").trim().toLowerCase() === "taller" ? "taller" : "teoria",
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

      localStorage.setItem("schoolSchedules", JSON.stringify(processedSchedules))
      setSchedules(processedSchedules)

      const uniqueGrades = [...new Set(processedSchedules.map((s) => s.grade))].sort()
      setGrades(uniqueGrades)
      if (uniqueGrades.length > 0 && selectedGrade === "Todos los cursos") {
        setSelectedGrade(uniqueGrades[0])
      }

      const uniqueSubjects = [...new Set(processedSchedules.map((s) => s.subject))].sort()
      setAvailableSubjects(uniqueSubjects)

      setMessage({
        type: "success",
        text: `Horarios cargados exitosamente. Se procesaron ${processedSchedules.length} entradas.`,
      })

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

    if (!grades.includes(entry.grade)) {
      const updatedGrades = [...grades, entry.grade].sort()
      setGrades(updatedGrades)
      if (selectedGrade === "Todos los cursos") {
        setSelectedGrade(entry.grade)
      }
    }

    if (!availableSubjects.includes(entry.subject)) {
      const updatedSubjects = [...availableSubjects, entry.subject].sort()
      setAvailableSubjects(updatedSubjects)
    }

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

      const remainingGrades = [...new Set(updatedSchedules.map((s) => s.grade))].sort()
      setGrades(remainingGrades)
      if (remainingGrades.length > 0 && !remainingGrades.includes(selectedGrade)) {
        setSelectedGrade(remainingGrades[0])
      }

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
        {lastUpdated && (
          <div className="mb-4 text-sm text-slate-600 bg-green-50 p-2 rounded border border-green-200 flex justify-between items-center">
            <span>✅ Última actualización: {lastUpdated.toLocaleString()}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadFromGoogleSheets}
              disabled={loading}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>
        )}

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

          {/* Resto del código de las pestañas se mantiene igual */}
          {/* ... (el resto del código de las pestañas permanece igual) ... */}
        </Tabs>
      </main>
    </div>
  )
}
