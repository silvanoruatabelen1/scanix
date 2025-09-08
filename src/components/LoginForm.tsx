import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Camera, Eye, EyeOff, AlertTriangle } from "lucide-react";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [error, setError] = useState("");
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (failedAttempts >= 5) {
      setError("Demasiados intentos fallidos. Contacte al administrador.");
      return;
    }

    setIsLoading(true);
    setError("");

    // Simulate API call
    setTimeout(() => {
      // Mock authentication - accept any username with password "scanix123"
      if (password === "scanix123") {
        // Store user data
        const userData = {
          username,
          role: "operario",
          warehouse: "Central",
          loginTime: new Date().toISOString()
        };
        
        localStorage.setItem("scanix_user", JSON.stringify(userData));
        
        toast({
          title: "Inicio de sesión exitoso",
          description: `Bienvenido, ${username}`,
        });
        
        navigate("/");
      } else {
        setFailedAttempts(prev => prev + 1);
        setError("Usuario o contraseña incorrectos");
        
        if (failedAttempts >= 4) {
          setError("Último intento antes del bloqueo");
        }
      }
      
      setIsLoading(false);
    }, 1500);
  };

  const passwordPolicy = [
    "Mínimo 8 caracteres",
    "Al menos una mayúscula",
    "Al menos un número"
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
              <Camera className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">SCANIX</CardTitle>
          <CardDescription>
            Sistema de Reconocimiento de Productos
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingrese su usuario"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su contraseña"
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="remember" className="text-sm">
                Recordarme
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm"
                disabled={isLoading}
              >
                ¿Olvidaste tu contraseña?
              </Button>
            </div>
          </form>

          {/* Failed attempts indicator */}
          {failedAttempts > 0 && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Intentos fallidos: {failedAttempts}/5
              </AlertDescription>
            </Alert>
          )}

          {/* Password policy */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">Política de contraseñas:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {passwordPolicy.map((rule, index) => (
                <li key={index} className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {/* Demo credentials */}
          <div className="mt-4 p-4 bg-accent rounded-lg">
            <h4 className="text-sm font-medium mb-2">Credenciales de demostración:</h4>
            <p className="text-xs text-muted-foreground">
              Usuario: cualquier usuario<br />
              Contraseña: <span className="font-mono">scanix123</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}