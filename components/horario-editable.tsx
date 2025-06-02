"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Edit3, Save, X, Users, BookOpen } from "lucide-react"

// Tipos de datos
interface Materia {
  id: string
  nombre: string
  color?: string
}

interface Docente {
  id: string
  nombre: string
  apellido: string
}

interface HorarioItem {
  id: string
  dia: string
  hora: string
  materiaId: string | null
  docenteId: string | null
  curso: string
}

interface CeldaEditando {
  dia: string
  hora: string
  campo: "materia" | "docente" | null
}

// Datos de ejemplo (reemplaza con tus datos reales)
const MATERIAS: Materia[] = [
  { id: "1", nombre: "Matemáticas", color: "bg-blue-100 text-blue-800" },
  { id: "2", nombre: "Lengua", color: "bg-green-100 text-green-800" },
  { id: "3", nombre: "Historia", color: "bg-purple-100 text-purple-800" },
  { id: "4", nombre: "Ciencias", color: "bg-orange-100 text-orange-800" },
  { id: "5", nombre: "Educación Física", color: "bg-red-100 text-red-800" },
]

const DOCENTES: Docente[] = [
  { id: "1", nombre: "María", apellido: "González" },
  { id: "2", nombre: "Juan", apellido: "Pérez" },
  { id: "3", nombre: "Ana", apellido: "Martínez" },
  { id: "4", nombre: "Carlos", apellido: "López" },
  { id: "5", nombre: "Laura", apellido: "Rodríguez" },
]

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
const HORAS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"]

interface HorarioEditableProps {
  curso: string
  esAdmin?: boolean
  onHorarioChange?: (horario: HorarioItem[]) => void
}

export function HorarioEditable({ curso, esAdmin = false, onHorarioChange }: HorarioEditableProps) {
  const [horario, setHorario] = useState<HorarioItem[]>([])
  const [cargando, setCargando] = useState(true)
  const [celdaEditando, setCeldaEditando] = useState<CeldaEditando>({ dia: "", hora: "", campo: null })
  const [cambiosPendientes, setCambiosPendientes] = useState(false)

  // Simular carga de datos
  useEffect(() => {
    const cargarHorario = async () => {
      setCargando(true)
      // Simular delay de carga
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Generar horario de ejemplo
      const horarioEjemplo: HorarioItem[] = []
      DIAS.forEach((dia) => {
        HORAS.forEach((hora) => {
          // Agregar algunas materias de ejemplo
          const tieneMateria = Math.random() > 0.3
          horarioEjemplo.push({
            id: `${dia}-${hora}`,
            dia,
            hora,
            materiaId: tieneMateria ? MATERIAS[Math.floor(Math.random() * MATERIAS.length)].id : null,
            docenteId: tieneMateria ? DOCENTES[Math.floor(Math.random() * DOCENTES.length)].id : null,
            curso,
          })
        })
      })

      setHorario(horarioEjemplo)
      setCargando(false)
    }

    cargarHorario()
  }, [curso])

  const obtenerMateria = (materiaId: string | null): Materia | null => {
    return materiaId ? MATERIAS.find((m) => m.id === materiaId) || null : null
  }

  const obtenerDocente = (docenteId: string | null): Docente | null => {
    return docenteId ? DOCENTES.find((d) => d.id === docenteId) || null : null
  }

  const obtenerHorarioItem = (dia: string, hora: string): HorarioItem | null => {
    return horario.find((item) => item.dia === dia && item.hora === hora) || null
  }

  const actualizarHorario = (dia: string, hora: string, campo: "materiaId" | "docenteId", valor: string | null) => {
    const nuevoHorario = horario.map((item) => {
      if (item.dia === dia && item.hora === hora) {
        return { ...item, [campo]: valor }
      }
      return item
    })

    setHorario(nuevoHorario)
    setCambiosPendientes(true)
    onHorarioChange?.(nuevoHorario)
  }

  const iniciarEdicion = (dia: string, hora: string, campo: "materia" | "docente") => {
    if (!esAdmin) return
    setCeldaEditando({ dia, hora, campo })
  }

  const cancelarEdicion = () => {
    setCeldaEditando({ dia: "", hora: "", campo: null })
  }

  const guardarCambios = async () => {
    setCargando(true)
    // Simular guardado
    await new Promise((resolve) => setTimeout(resolve, 500))
    setCambiosPendientes(false)
    setCargando(false)
    cancelarEdicion()
  }

  const CeldaHorario = ({ dia, hora }: { dia: string; hora: string }) => {
    const item = obtenerHorarioItem(dia, hora)
    const materia = obtenerMateria(item?.materiaId || null)
    const docente = obtenerDocente(item?.docenteId || null)
    const editandoMateria =
      celdaEditando.dia === dia && celdaEditando.hora === hora && celdaEditando.campo === "materia"
    const editandoDocente =
      celdaEditando.dia === dia && celdaEditando.hora === hora && celdaEditando.campo === "docente"

    if (cargando) {
      return (
        <div className="p-2 h-20 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      )
    }

    return (
      <div className="p-2 h-20 border border-gray-200 hover:bg-gray-50 transition-colors">
        {/* Materia */}
        <div className="mb-1">
          {editandoMateria ? (
            <Select
              value={item?.materiaId || "0"} // Updated default value to be a non-empty string
              onValueChange={(valor) => {
                actualizarHorario(dia, hora, "materiaId", valor || null)
                cancelarEdicion()
              }}
            >
              <SelectTrigger className="h-6 text-xs">
                <SelectValue placeholder="Seleccionar materia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sin materia</SelectItem> // Updated value to be a non-empty string
                {MATERIAS.map((materia) => (
                  <SelectItem key={materia.id} value={materia.id}>
                    {materia.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div
              className={`text-xs font-medium cursor-pointer flex items-center gap-1 ${
                esAdmin ? "hover:bg-blue-100 rounded px-1" : ""
              }`}
              onClick={() => iniciarEdicion(dia, hora, "materia")}
            >
              {materia ? (
                <>
                  <BookOpen className="h-3 w-3" />
                  <Badge variant="secondary" className={materia.color}>
                    {materia.nombre}
                  </Badge>
                </>
              ) : (
                <span className="text-gray-400">{esAdmin ? "Click para agregar" : "Libre"}</span>
              )}
              {esAdmin && <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100" />}
            </div>
          )}
        </div>

        <Separator className="my-1" />

        {/* Docente */}
        <div>
          {editandoDocente ? (
            <Select
              value={item?.docenteId || "0"} // Updated default value to be a non-empty string
              onValueChange={(valor) => {
                actualizarHorario(dia, hora, "docenteId", valor || null)
                cancelarEdicion()
              }}
            >
              <SelectTrigger className="h-6 text-xs">
                <SelectValue placeholder="Seleccionar docente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sin docente</SelectItem> // Updated value to be a non-empty string
                {DOCENTES.map((docente) => (
                  <SelectItem key={docente.id} value={docente.id}>
                    {docente.nombre} {docente.apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div
              className={`text-xs text-gray-600 cursor-pointer flex items-center gap-1 ${
                esAdmin ? "hover:bg-green-100 rounded px-1" : ""
              }`}
              onClick={() => iniciarEdicion(dia, hora, "docente")}
            >
              {docente ? (
                <>
                  <Users className="h-3 w-3" />
                  <span>
                    {docente.nombre} {docente.apellido}
                  </span>
                </>
              ) : (
                <span className="text-gray-400">{esAdmin ? "Click para asignar" : "Sin asignar"}</span>
              )}
              {esAdmin && <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100" />}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Horario - {curso}
        </CardTitle>
        {esAdmin && (
          <div className="flex gap-2">
            {cambiosPendientes && (
              <Button onClick={guardarCambios} size="sm" disabled={cargando}>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </Button>
            )}
            {celdaEditando.campo && (
              <Button onClick={cancelarEdicion} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            {/* Encabezado */}
            <div className="grid grid-cols-6 gap-1 mb-2">
              <div className="p-2 font-semibold text-center bg-gray-100 rounded">Hora</div>
              {DIAS.map((dia) => (
                <div key={dia} className="p-2 font-semibold text-center bg-gray-100 rounded">
                  {dia}
                </div>
              ))}
            </div>

            {/* Filas de horarios */}
            {HORAS.map((hora) => (
              <div key={hora} className="grid grid-cols-6 gap-1 mb-1">
                <div className="p-2 font-medium text-center bg-gray-50 rounded flex items-center justify-center">
                  {hora}
                </div>
                {DIAS.map((dia) => (
                  <div key={`${dia}-${hora}`} className="group">
                    <CeldaHorario dia={dia} hora={hora} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>

        {esAdmin && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Modo Administrador</h4>
            <p className="text-sm text-blue-600">
              • Haz click en cualquier celda para editar materias y docentes • Los cambios se guardan automáticamente •
              Usa los selectores para asignar o cambiar materias/docentes
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
