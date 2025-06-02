"use client"

import { useState } from "react"
import { AdminHorarios } from "@/components/admin-horarios"
import { ExcelImport } from "@/components/excel-import"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, FileSpreadsheet, Calendar } from "lucide-react"

export default function AdminPage() {
  const [importedData, setImportedData] = useState<any[]>([])

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Panel de Administración
        </h1>
        <p className="text-muted-foreground mt-2">Gestiona horarios, materias y docentes de forma centralizada</p>
      </div>

      <Tabs defaultValue="horarios" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="horarios" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Gestión de Horarios
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Importar Excel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="horarios">
          <AdminHorarios />
        </TabsContent>

        <TabsContent value="import">
          <ExcelImport
            onDataImported={(data) => {
              setImportedData(data)
              console.log("Datos importados:", data)
            }}
          />

          {importedData.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Datos Importados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Se importaron {importedData.length} registros correctamente. Puedes revisar y editar los horarios en
                  la pestaña "Gestión de Horarios".
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
