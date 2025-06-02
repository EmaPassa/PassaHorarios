"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, ArrowLeft, AlertCircle, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Clave de administración (en producción debería estar en variables de entorno)
  const ADMIN_PASSWORD = "admin2024"

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Simular un pequeño delay para la autenticación
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (password === ADMIN_PASSWORD) {
      // Guardar sesión en localStorage
      localStorage.setItem("adminAuthenticated", "true")
      localStorage.setItem("adminLoginTime", Date.now().toString())

      // Redirigir al panel de administración
      router.push("/admin")
    } else {
      setError("Contraseña incorrecta. Intenta nuevamente.")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src="/logo.png" alt="Logo EEST Nº6" className="h-20 w-20" />
            </div>
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <Lock className="h-5 w-5" />
              Acceso Administrativo
            </CardTitle>
            <CardDescription>
              ESCUELA TECNICA Nº6 "ING. JUAN V. PASSALACQUA"
              <br />
              Ingresa la contraseña para acceder al panel de administración
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña de Administrador</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa la contraseña"
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verificando...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Ingresar
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t">
              <Link href="/">
                <Button variant="outline" className="w-full flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Volver a Horarios
                </Button>
              </Link>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">Para obtener acceso, contacta al administrador del sistema</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
