"use client"

import { useState } from "react"
import { HorarioEditable } from "./horario-editable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Settings, GraduationCap, Users, BookOpen, Save, Download, Upload } from "lucide-react"

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

export function AdminHorarios() {
  const [cursoActivo, setCursoActivo] = useState("1° Año A")
  const [cambiosPendientes, setCambiosPendientes] = useState(0)

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Administración de Horarios</h1>
          </div>
          <div className="flex items-center gap-2">
            {cambiosPendientes > 0 && <Badge variant="destructive">{cambiosPendientes} cambios pendientes</Badge>}
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Importar Excel
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button size="sm">
              <Save className="h-4 w-4 mr-2" />
              Guardar Todo
            </Button>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1">
        <ResizablePanelGroup direction="horizontal">
          {/* Panel Lateral - Lista de Cursos */}
          <ResizablePanel defaultSize={25} minSize={20}>
            <Card className="h-full rounded-none border-0 border-r">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Cursos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="p-4 space-y-2">
                    {CURSOS.map((curso) => (
                      <Button
                        key={curso}
                        variant={cursoActivo === curso ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => setCursoActivo(curso)}
                      >
                        <GraduationCap className="h-4 w-4 mr-2" />
                        {curso}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Panel Principal - Horario */}
          <ResizablePanel defaultSize={75}>
            <div className="h-full p-6">
              <Tabs defaultValue="horario" className="h-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="horario" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Horario
                  </TabsTrigger>
                  <TabsTrigger value="materias" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Materias
                  </TabsTrigger>
                  <TabsTrigger value="docentes" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Docentes
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="horario" className="mt-6">
                  <HorarioEditable
                    curso={cursoActivo}
                    esAdmin={true}
                    onHorarioChange={(horario) => {
                      setCambiosPendientes((prev) => prev + 1)
                    }}
                  />
                </TabsContent>

                <TabsContent value="materias" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Gestión de Materias</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Aquí puedes gestionar las materias disponibles...</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="docentes" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Gestión de Docentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Aquí puedes gestionar los docentes disponibles...</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
