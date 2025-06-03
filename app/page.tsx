"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, GraduationCap, Settings, BookOpen, Wrench } from "lucide-react"
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

export default function HomePage() {
  const [customTimes, setCustomTimes] = useState<string[]>([])
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([])
  const [selectedGrade, setSelectedGrade] = useState<string>("")
  const [availableGrades, setAvailableGrades] = useState<string[]>([])

  const generateId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  useEffect(() => {
    // Cargar horarios desde localStorage
    const savedSchedules = localStorage.getItem("schoolSchedules")
    if (savedSchedules) {
      const parsedSchedules = JSON.parse(savedSchedules)
      // Asegurar compatibilidad con datos antiguos
      const schedulesWithType = parsedSchedules.map((s: any) => ({
        ...s,
        id: s.id || generateId(),
        type: s.type || "teoria", // Valor por defecto para datos existentes
        teacherType: s.teacherType || "titular", // Agregar tipo de docente
      }))
      setSchedules(schedulesWithType)

      // Extraer grados únicos
      const grades = [...new Set(schedulesWithType.map((s: ScheduleEntry) => s.grade))]
      setAvailableGrades(grades)
      if (grades.length > 0 && !selectedGrade) {
        setSelectedGrade(grades[0])
      }
    } else {
      // Datos de ejemplo si no hay horarios cargados - actualizar con teacherType
      const sampleData: ScheduleEntry[] = [
        {
          id: "1",
          grade: "1° A",
          day: "Lunes",
          time: "08:00 - 08:45",
          subject: "Matemáticas",
          teacher: "Prof. García",
          type: "teoria",
          teacherType: "titular",
        },
        {
          id: "2",
          grade: "1° A",
          day: "Lunes",
          time: "08:45 - 09:30",
          subject: "Lengua",
          teacher: "Prof. Martínez",
          type: "teoria",
          teacherType: "titular",
        },
        {
          id: "3",
          grade: "1° A",
          day: "Lunes",
          time: "09:30 - 10:15",
          subject: "Taller de Electrónica",
          teacher: "Prof. López",
          type: "taller",
          teacherType: "suplente",
        },
        {
          id: "4",
          grade: "1° A",
          day: "Martes",
          time: "08:00 - 08:45",
          subject: "Historia",
          teacher: "Prof. Rodríguez",
          type: "teoria",
          teacherType: "titular",
        },
        {
          id: "5",
          grade: "1° A",
          day: "Martes",
          time: "08:45 - 09:30",
          subject: "Taller de Mecánica",
          teacher: "Prof. Fernández",
          type: "taller",
          teacherType: "provisional",
        },
        {
          id: "6",
          grade: "2° B",
          day: "Lunes",
          time: "08:00 - 08:45",
          subject: "Física",
          teacher: "Prof. Silva",
          type: "teoria",
          teacherType: "titular",
        },
        {
          id: "7",
          grade: "2° B",
          day: "Lunes",
          time: "08:45 - 09:30",
          subject: "Taller de Programación",
          teacher: "Prof. Morales",
          type: "taller",
          teacherType: "suplente",
        },
      ]
      setSchedules(sampleData)
      setAvailableGrades(["1° A", "2° B"])
      setSelectedGrade("1° A")
    }

    // Cargar horarios personalizados
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
  }, [])

  const getScheduleForGradeAndDay = (grade: string, day: string, time: string) => {
    return schedules.find((s) => s.grade === grade && s.day === day && s.time === time)
  }

 const getSubjectStyles = (entry: ScheduleEntry | undefined, time: string) => {
  const breakTimes = [
    "09:40 - 09:50",
    "15:00 - 15:10",
    "18:10 - 18:20",
    "20:20 - 20:30",
  ]

  if (breakTimes.includes(time)) {
    // Recreo
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
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No hay horarios cargados</h3>
                  <p className="text-slate-600 mb-4">
                    Para comenzar, sube un archivo Excel con los horarios desde el panel de administración.
                  </p>
                  <Link href="/admin">
                    <Button className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white shadow-lg">
                      Ir a Administración
                    </Button>
                  </Link>
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
                Horario semanal del curso seleccionado
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

                          return (
                            <td key={`${day}-${time}`} className="p-2">
                              {entry || time === "11:00 - 11:15" ? (
                                <div
                                  className={`p-3 rounded-lg shadow-sm border-2 ${styles.border} transition-all duration-200 hover:shadow-md`}
                                  style={{
                                    background: styles.background,
                                  }}
                                >
                                  {time === "11:00 - 11:15" ? (
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
