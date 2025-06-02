"use client"

import { useState } from "react"
import { HorarioEditable } from "@/components/horario-editable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Settings, GraduationCap } from "lucide-react"

const CURSOS = [
  "1° Año A",
  "1° Año B",
  "2° Año A",
  "2° Año B",
  "3° Año A",
  "3° Año B",
  "4° Año A",
  "4° Año B",
  "5° Año A",
  "5° Año B",
]

export default function HorarioPage() {
  const [cursoSeleccionado, setCursoSeleccionado] = useState("1° Año A")
  const [modoAdmin, setModoAdmin] = useState(false)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Panel de Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Panel de Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              <Label htmlFor="curso-select" className="text-sm font-medium">
                Seleccionar Curso
              </Label>
              <Select value={cursoSeleccionado} onValueChange={setCursoSeleccionado}>
                <SelectTrigger id="curso-select" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURSOS.map((curso) => (
                    <SelectItem key={curso} value={curso}>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        {curso}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator orientation="vertical" className="hidden sm:block h-12" />

            <div className="flex items-center space-x-2">
              <Switch id="modo-admin" checked={modoAdmin} onCheckedChange={setModoAdmin} />
              <Label htmlFor="modo-admin" className="text-sm font-medium">
                Modo Administrador
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horario */}
      <HorarioEditable
        curso={cursoSeleccionado}
        esAdmin={modoAdmin}
        onHorarioChange={(horario) => {
          console.log("Horario actualizado:", horario)
          // Aquí puedes guardar en tu base de datos
        }}
      />
    </div>
  )
}
