"use client"

import { useState } from "react"
import * as XLSX from "xlsx"

// Tipos para el procesamiento de Excel
interface ExcelRow {
  curso: string
  dia: string
  hora: string
  materia: string
  docente: string
}

interface ProcessResult {
  success: boolean
  data?: ExcelRow[]
  errors?: string[]
  totalRows?: number
  validRows?: number
}

export class ExcelProcessor {
  static async processFile(file: File): Promise<ProcessResult> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })

      // Obtener la primera hoja
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      // Convertir a JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      // Procesar datos (asumiendo que la primera fila son headers)
      const headers = jsonData[0] || []
      const dataRows = jsonData.slice(1)

      const processedData: ExcelRow[] = []
      const errors: string[] = []

      dataRows.forEach((row, index) => {
        const rowNumber = index + 2 // +2 porque empezamos desde la fila 2 (después del header)

        // Validar que la fila tenga al menos 5 columnas
        if (row.length < 5) {
          errors.push(`Fila ${rowNumber}: Datos incompletos`)
          return
        }

        const [curso, dia, hora, materia, docente] = row

        // Validar que todos los campos estén presentes
        if (!curso || !dia || !hora || !materia || !docente) {
          errors.push(`Fila ${rowNumber}: Campos vacíos detectados`)
          return
        }

        // Validar formato de hora
        const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
        if (!horaRegex.test(hora.toString())) {
          errors.push(`Fila ${rowNumber}: Formato de hora inválido (${hora})`)
          return
        }

        // Validar día de la semana
        const diasValidos = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
        if (!diasValidos.includes(dia.toString().toLowerCase())) {
          errors.push(`Fila ${rowNumber}: Día inválido (${dia})`)
          return
        }

        processedData.push({
          curso: curso.toString().trim(),
          dia: dia.toString().trim(),
          hora: hora.toString().trim(),
          materia: materia.toString().trim(),
          docente: docente.toString().trim(),
        })
      })

      return {
        success: true,
        data: processedData,
        errors: errors.length > 0 ? errors : undefined,
        totalRows: dataRows.length,
        validRows: processedData.length,
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Error al procesar el archivo: ${error instanceof Error ? error.message : "Error desconocido"}`],
      }
    }
  }

  static generateTemplate(): void {
    // Crear datos de ejemplo para el template
    const templateData = [
      ["Curso", "Dia", "Hora", "Materia", "Docente"],
      ["1° Año A", "Lunes", "08:00", "Matemáticas", "María González"],
      ["1° Año A", "Lunes", "09:00", "Lengua", "Juan Pérez"],
      ["1° Año A", "Martes", "08:00", "Historia", "Ana Martínez"],
      ["1° Año A", "Martes", "09:00", "Ciencias", "Carlos López"],
      ["2° Año A", "Lunes", "08:00", "Matemáticas", "Laura Rodríguez"],
    ]

    // Crear workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(templateData)

    // Agregar la hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, "Horarios")

    // Descargar el archivo
    XLSX.writeFile(wb, "template-horarios.xlsx")
  }
}

export function useExcelProcessor() {
  const [processing, setProcessing] = useState(false)

  const processFile = async (file: File): Promise<ProcessResult> => {
    setProcessing(true)
    try {
      const result = await ExcelProcessor.processFile(file)
      return result
    } finally {
      setProcessing(false)
    }
  }

  const downloadTemplate = () => {
    ExcelProcessor.generateTemplate()
  }

  return {
    processFile,
    downloadTemplate,
    processing,
  }
}
