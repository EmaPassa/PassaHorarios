"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, GraduationCap, Settings } from "lucide-react"
import Link from "next/link"

interface ScheduleEntry {
  grade: string
  day: string
  time: string
  subject: string
  teacher: string
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

export default function HomePage() {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([])
  const [selectedGrade, setSelectedGrade] = useState<string>("")
  const [availableGrades, setAvailableGrades] = useState<string[]>([])

  useEffect(() => {
    // Cargar horarios desde localStorage
    const savedSchedules = localStorage.getItem("schoolSchedules")
    if (savedSchedules) {
      const parsedSchedules = JSON.parse(savedSchedules)
      setSchedules(parsedSchedules)

      // Extraer grados únicos
      const grades = [...new Set(parsedSchedules.map((s: ScheduleEntry) => s.grade))]
      setAvailableGrades(grades)
      if (grades.length > 0 && !selectedGrade) {
        setSelectedGrade(grades[0])
      }
    } else {
      // Datos de ejemplo si no hay horarios cargados
      const sampleData: ScheduleEntry[] = [
        {
          grade: "1° A",
          day: "Lunes",
          time: "08:00 - 08:45",
          subject: "Matemáticas",
          teacher: "Prof. García",
        },
        {
          grade: "1° A",
          day: "Lunes",
          time: "08:45 - 09:30",
          subject: "Lengua",
          teacher: "Prof. Martínez",
        },
        {
          grade: "1° A",
          day: "Lunes",
          time: "09:30 - 10:15",
          subject: "Ciencias",
          teacher: "Prof. López",
        },
        {
          grade: "1° A",
          day: "Martes",
          time: "08:00 - 08:45",
          subject: "Historia",
          teacher: "Prof. Rodríguez",
        },
        {
          grade: "1° A",
          day: "Martes",
          time: "08:45 - 09:30",
          subject: "Matemáticas",
          teacher: "Prof. García",
        },
        {
          grade: "2° B",
          day: "Lunes",
          time: "08:00 - 08:45",
          subject: "Física",
          teacher: "Prof. Fernández",
        },
        {
          grade: "2° B",
          day: "Lunes",
          time: "08:45 - 09:30",
          subject: "Química",
          teacher: "Prof. Silva",
        },
      ]
      setSchedules(sampleData)
      setAvailableGrades(["1° A", "2° B"])
      setSelectedGrade("1° A")
    }
  }, [])

  const getScheduleForGradeAndDay = (grade: string, day: string, time: string) => {
    return schedules.find((s) => s.grade === grade && s.day === day && s.time === time)
  }

  const filteredSchedules = schedules.filter((s) => s.grade === selectedGrade)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <img src="/logo.png" alt="Logo EEST Nº6" className="h-16 w-16" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ESCUELA TECNICA Nº6</h1>
                <p className="text-lg text-gray-700">"ING. JUAN V. PASSALACQUA"</p>
                <p className="text-sm text-gray-600">Horarios Académicos</p>
              </div>
            </div>
            <Link href="/admin/login">
              <Button variant="outline" className="flex items-center gap-2">
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
            <Calendar className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Horarios por Curso</h2>
          </div>

          {availableGrades.length > 0 ? (
            <div className="mb-6">
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="w-48">
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
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay horarios cargados</h3>
                  <p className="text-gray-600 mb-4">
                    Para comenzar, sube un archivo Excel con los horarios desde el panel de administración.
                  </p>
                  <Link href="/admin">
                    <Button>Ir a Administración</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {selectedGrade && filteredSchedules.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Horario - {selectedGrade}
              </CardTitle>
              <CardDescription>Horario semanal del curso seleccionado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-gray-900 bg-gray-50">Horario</th>
                      {DAYS.map((day) => (
                        <th key={day} className="text-left p-3 font-medium text-gray-900 bg-gray-50 min-w-[200px]">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIMES.map((time) => (
                      <tr key={time} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-700 bg-gray-25">{time}</td>
                        {DAYS.map((day) => {
                          const entry = getScheduleForGradeAndDay(selectedGrade, day, time)
                          return (
                            <td key={`${day}-${time}`} className="p-3 border-l">
                              {entry ? (
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-900">{entry.subject}</div>
                                  <div className="text-sm text-gray-600">{entry.teacher}</div>
                                </div>
                              ) : time === "11:00 - 11:15" ? (
                                <div className="text-center text-gray-500 font-medium">RECREO</div>
                              ) : (
                                <div className="text-gray-400">-</div>
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
