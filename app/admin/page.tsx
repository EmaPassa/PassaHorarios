"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, GraduationCap, Settings, BookOpen, Wrench, RefreshCw } from "lucide-react"
import Link from "next/link"

interface ScheduleEntry {
  id: string
  grade: string
  day: string
  time: string
  subject: string
  teacher: string
  type: "teoria" | "taller"
  teacherType: string
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]

const DEFAULT_TIMES = [
  "07:40 - 08:40",
  "08:40 - 09:40",
  "09:40 - 09:50", // Recreo
  "09:50 - 10:50",
  "10:50 - 11:50", 
  "11:55 - 12:55",
  "13:00 - 14:00",
  "14:00 - 15:00",
  "15:00 - 15:10", // Recreo
  "15:10 - 16:10",
  "16:10 - 17:10",
  "17:10 - 18:10",
  "18:10 - 18:20", // Recreo
  "18:20 - 19:20",
  "19:20 - 20:20",
  "20:20 - 20:30", // Recreo
  "20:30 - 21:30",
  "21:30 - 22:30",
]

// Definir los horarios de recreo
const RECREO_TIMES = [
  "09:40 - 09:50",
  "15:00 - 15:10", 
  "18:10 - 18:20",
  "20:20 - 20:30"
]

// URL de tu Google Sheet en formato CSV
// Reemplaza SHEET_ID con tu ID real y SHEET_NAME con el nombre de la hoja
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1C1st8qO7UEYZPQZUR39g6mR8GR-BrEWr/export?format=csv&gid=0"

export default function HomePage() {
  const [customTimes, setCustomTimes] = useState<string[]>([])
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([])
  const [selectedGrade, setSelectedGrade] = useState<string>("")
  const [availableGrades, setAvailableGrades] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const generateId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  // Función auxiliar para parsear líneas CSV correctamente
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Comilla escapada
          current += '"'
          i++ // Saltar la siguiente comilla
        } else {
          // Cambiar estado de comillas
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        // Separador encontrado fuera de comillas
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    // Añadir el último campo
    result.push(current.trim())
    
    return result.map(field => field.replace(/^"(.*)"$/, '$1'))
  }

  // Función mejorada para parsear CSV con mejor manejo de errores
  const parseCSV = (csvText: string): ScheduleEntry[] => {
    try {
      const lines = csvText.split('\n').map(line => line.trim()).filter(line => line)
      
      if (lines.length === 0) {
        throw new Error("CSV vacío")
      }
      
      // Parsear headers - manejar comillas y espacios
      const headers = lines[0]
        .split(',')
        .map(h => h.trim().replace(/^"(.*)"$/, '$1'))
      
      console.log("Headers encontrados:", headers)
      
      const scheduleEntries: ScheduleEntry[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        if (!line) continue
        
        // Mejorar el parsing de CSV para manejar comas dentro de comillas
        const values = parseCSVLine(line)
        
        // Mapear columnas - ajustar según tu estructura
        // Asumir: Grado, Día, Horario, Materia, Profesor, Tipo, TipoDocente
        if (values.length >= 6) {
          const entry: ScheduleEntry = {
            id: generateId(),
            grade: values[0]?.toString().trim() || '',
            day: values[1]?.toString().trim() || '',
            time: values[2]?.toString().trim() || '',
            subject: values[3]?.toString().trim() || '',
            teacher: values[4]?.toString().trim() || '',
            type: (values[5]?.toString().toLowerCase().trim() === 'taller' ? 'taller' : 'teoria') as "teoria" | "taller",
            teacherType: values[6]?.toString().trim() || 'titular'
          }
          
          // Validar que tenga los campos esenciales
          if (entry.grade && entry.day && entry.time && entry.subject) {
            scheduleEntries.push(entry)
          } else {
            console.warn(`Fila ${i} tiene datos incompletos:`, entry)
          }
        } else {
          console.warn(`Fila ${i} no tiene suficientes columnas:`, values)
        }
      }
      
      console.log(`Parseados ${scheduleEntries.length} entradas de horarios`)
      return scheduleEntries
      
    } catch (error) {
      console.error("Error parseando CSV:", error)
      throw new Error(`Error al procesar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  // Función mejorada para cargar datos desde Google Sheets
  const loadFromGoogleSheets = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Usar múltiples URLs de respaldo para diferentes formatos
      const SHEET_URLS = [
        // URL principal CSV
        GOOGLE_SHEET_CSV_URL,
        // URL alternativa usando exportFormat
        GOOGLE_SHEET_CSV_URL.replace('export?format=csv', 'export?exportFormat=csv'),
        // URL usando el endpoint gviz (más compatible)
        GOOGLE_SHEET_CSV_URL.replace('/export?format=csv&gid=0', '/gviz/tq?tqx=out:csv&sheet=0')
      ]

      let lastError = null
      
      for (const url of SHEET_URLS) {
        try {
          console.log(`Intentando cargar desde: ${url}`)
          
          const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            headers: {
              'Accept': 'text/csv, text/plain, */*',
              'Cache-Control': 'no-cache'
            },
            // Añadir timestamp para evitar cache
            cache: 'no-store'
          })
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          
          const csvText = await response.text()
          
          // Verificar que el CSV no esté vacío
          if (!csvText || csvText.trim().length === 0) {
            throw new Error('El archivo CSV está vacío')
          }
          
          // Verificar que tenga contenido válido (al menos una línea con datos)
          const lines = csvText.split('\n').filter(line => line.trim())
          if (lines.length < 2) {
            throw new Error('El CSV no contiene datos suficientes')
          }
          
          const parsedSchedules = parseCSV(csvText)
          
          if (parsedSchedules.length > 0) {
            setSchedules(parsedSchedules)
            
            // Extraer grados únicos
            const grades = [...new Set(parsedSchedules.map((s: ScheduleEntry) => s.grade))]
            setAvailableGrades(grades)
            
            if (grades.length > 0 && !selectedGrade) {
              setSelectedGrade(grades[0])
            }
            
            setLastUpdated(new Date())
            
            // Guardar en localStorage como respaldo (sin usar localStorage en artifacts)
            try {
              const dataToSave = JSON.stringify({
                schedules: parsedSchedules,
                timestamp: new Date().toISOString(),
                source: 'google_sheets'
              })
              // En un entorno real, aquí usarías localStorage.setItem("schoolSchedules", dataToSave)
              console.log("Datos que se guardarían en localStorage:", dataToSave.substring(0, 200) + "...")
            } catch (storageError) {
              console.warn("No se pudo guardar en localStorage:", storageError)
            }
            
            console.log(`Datos cargados exitosamente desde: ${url}`)
            return // Salir del bucle si fue exitoso
            
          } else {
            throw new Error("No se encontraron datos válidos en la hoja de cálculo")
          }
          
        } catch (urlError) {
          console.warn(`Error con URL ${url}:`, urlError)
          lastError = urlError
          continue // Probar siguiente URL
        }
      }
      
      // Si llegamos aquí, todas las URLs fallaron
      throw lastError || new Error("No se pudo cargar desde ninguna URL")
      
    } catch (err) {
      console.error("Error loading from Google Sheets:", err)
      
      // Mensajes de error más específicos
      let errorMessage = "Error desconocido"
      if (err instanceof Error) {
        if (err.message.includes('400')) {
          errorMessage = "Error 400: Verifica que la hoja de Google Sheets sea pública y el enlace sea correcto"
        } else if (err.message.includes('403')) {
          errorMessage = "Error 403: Sin permisos para acceder a la hoja. Asegúrate de que sea pública"
        } else if (err.message.includes('404')) {
          errorMessage = "Error 404: No se encontró la hoja. Verifica el ID del documento"
        } else if (err.message.includes('CORS')) {
          errorMessage = "Error de CORS: Problema de configuración del navegador"
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
      
      // Intentar cargar datos de respaldo (simulado para el artifact)
      console.log("En un entorno real, aquí se cargarían los datos de respaldo desde localStorage")
      
      // Datos de ejemplo para que la aplicación funcione
      const exampleSchedules: ScheduleEntry[] = [
        {
          id: "example1",
          grade: "1° Año",
          day: "Lunes",
          time: "07:40 - 08:40",
          subject: "Matemática",
          teacher: "Prof. García",
          type: "teoria",
          teacherType: "titular"
        },
        {
          id: "example2",
          grade: "1° Año",
          day: "Lunes",
          time: "08:40 - 09:40",
          subject: "Lengua",
          teacher: "Prof. López",
          type: "teoria",
          teacherType: "titular"
        }
      ]
      
      setSchedules(exampleSchedules)
      const grades = [...new Set(exampleSchedules.map(s => s.grade))]
      setAvailableGrades(grades)
      if (grades.length > 0 && !selectedGrade) {
        setSelectedGrade(grades[0])
      }
      
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Cargar horarios personalizados (simulado)
    setCustomTimes(DEFAULT_TIMES)
    
    // Cargar datos desde Google Sheets
    loadFromGoogleSheets()
  }, [])

  const getScheduleForGradeAndDay = (grade: string, day: string, time: string) => {
    return schedules.find((s) => s.grade === grade && s.day === day && s.time === time)
  }

  const getSubjectStyles = (entry: ScheduleEntry | undefined, time: string) => {
    // Verificar si es hora de recreo
    if (RECREO_TIMES.includes(time)) {
      return {
        background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
        border: "border-amber-200",
        text: "text-amber-900",
        icon: null,
      }
    }

    if (!entry) {
      return {
        background: "bg-gray-50",
        border: "border-gray-200",
        text: "text-gray-400",
        icon: null,
      }
    }

    if (entry.type === "teoria") {
      return {
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        border: "border-emerald-200",
        text: "text-white",
        icon: <BookOpen className="h-3 w-3" />,
      }
    } else {
      return {
        background: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
        border: "border-green-200",
        text: "text-white",
        icon: <Wrench className="h-3 w-3" />,
      }
    }
  }

  const filteredSchedules = schedules.filter((s) => s.grade === selectedGrade)

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
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                  ESCUELA TECNICA Nº6
                </h1>
                <p className="text-lg font-semibold text-slate-700">"ING. JUAN V. PASSALACQUA"</p>
                <p className="text-sm text-slate-600">Horarios Académicos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={loadFromGoogleSheets}
                disabled={loading}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-white/50 backdrop-blur-sm border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Actualizando...' : 'Actualizar'}
              </Button>
              <Link href="/admin/login">
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-white/50 backdrop-blur-sm border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200"
                >
                  <Settings className="h-4 w-4" />
                  Administración
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mostrar estado de carga y errores */}
        {error && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="text-red-700">
                <strong>Error:</strong> {error}
                <br />
                <small className="text-red-600">
                  Instrucciones para solucionar:
                  <br />
                  1. Verifica que tu Google Sheet sea público (Compartir → "Cualquier persona con el enlaceenlace")
                  <br />
                  2. Asegúrate de que la URL esté bien formada
                  <br />
                  3. Verifica que el ID de la hoja sea correcto
                </small>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mostrar última actualización */}
        {lastUpdated && (
          <div className="mb-4 text-sm text-slate-600 bg-green-50 p-2 rounded border border-green-200">
            ✅ Última actualización exitosa: {lastUpdated.toLocaleString()}
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg shadow-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Horarios por Curso</h2>
          </div>

          {availableGrades.length > 0 ? (
            <div className="mb-6">
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="w-48 bg-white/70 backdrop-blur-sm border-slate-200 hover:bg-white/90 transition-all duration-200">
                  <SelectValue placeholder="Seleccionar curso" />
                </SelectTrigger>
                <SelectContent>
                  {availableGrades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Card className="mb-6 bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full w-fit mx-auto mb-4">
                    <Clock className="h-12 w-12 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    {loading ? 'Cargando horarios...' : 'No hay horarios cargados'}
                  </h3>
                  <p className="text-slate-600 mb-4">
                    {loading 
                      ? 'Obteniendo datos desde Google Sheets...'
                      : 'Verifica que la hoja de Google Sheets esté configurada correctamente y sea pública.'
                    }
                  </p>
                  {!loading && (
                    <div className="space-y-2">
                      <Button 
                        onClick={loadFromGoogleSheets}
                        className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white shadow-lg mr-2"
                      >
                        Intentar Cargar Datos
                      </Button>
                      <Link href="/admin">
                        <Button variant="outline">
                          Ir a Administración
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {selectedGrade && filteredSchedules.length > 0 && (
          <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                Horario - {selectedGrade}
              </CardTitle>
              <CardDescription className="text-slate-600">
                Horario semanal del curso seleccionado (Datos desde Google Sheets)
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-gradient-to-br from-emerald-500 to-emerald-600"></div>
                    <BookOpen className="h-3 w-3" />
                    <span>Teoría</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-gradient-to-br from-green-400 to-emerald-500"></div>
                    <Wrench className="h-3 w-3" />
                    <span>Taller</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-gradient-to-br from-amber-400 to-amber-500"></div>
                    <span>Recreo</span>
                  </div>
                </div>
              </CardDescription>
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
                      <tr key={time} className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white/50" : ""}`}>
                        <td className="p-4 font-medium text-slate-700 bg-gradient-to-r from-slate-50/50 to-white/50">
                          {time}
                        </td>
                        {DAYS.map((day) => {
                          const entry = getScheduleForGradeAndDay(selectedGrade, day, time)
                          const styles = getSubjectStyles(entry, time)
                          const isRecreo = RECREO_TIMES.includes(time)

                          return (
                            <td key={`${day}-${time}`} className="p-2">
                              {entry || isRecreo ? (
                                <div
                                  className={`p-3 rounded-lg shadow-sm border-2 ${styles.border} transition-all duration-200 hover:shadow-md`}
                                  style={{
                                    background: styles.background,
                                  }}
                                >
                                  {isRecreo ? (
                                    <div className="text-center">
                                      <div className="font-bold text-amber-900 text-sm">RECREO</div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <div className={`font-semibold text-sm ${styles.text} flex items-center gap-1`}>
                                        {styles.icon}
                                        {entry!.subject}
                                      </div>
                                      <div className={`text-xs ${styles.text} opacity-90`}>{entry!.teacher}</div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="p-3 rounded-lg bg-slate-50/50 border-2 border-slate-100">
                                  <div className="text-slate-300 text-center">-</div>
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
      </main>
    </div>
  )
}
