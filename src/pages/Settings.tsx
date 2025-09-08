import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

export default function Settings() {
  const { toast } = useToast();
  const [orgName, setOrgName] = useState("SCANIX Demo");
  const [warehouse, setWarehouse] = useState("central");
  const [preferBackCamera, setPreferBackCamera] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState("system");

  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(60);

  useEffect(() => {
    const saved = localStorage.getItem('scanix_conf_threshold');
    if (saved) {
      const n = parseInt(saved);
      if (!isNaN(n)) setConfidenceThreshold(n);
    }
  }, []);
  const onSaveSettings = () => {
    localStorage.setItem('scanix_conf_threshold', String(confidenceThreshold));
    handleSave();
  };
  const handleSave = () => {
    toast({
      title: "Configuración guardada",
      description: "Tus preferencias se han actualizado.",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
          <p className="text-muted-foreground">Preferencias de la aplicación y del usuario</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Organización</CardTitle>
              <CardDescription>Datos generales del punto de venta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Depósito</Label>
                <Select value={warehouse} onValueChange={setWarehouse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona depósito" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="central">Depósito Central</SelectItem>
                    <SelectItem value="norte">Depósito Norte</SelectItem>
                    <SelectItem value="sur">Depósito Sur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cámara y Reconocimiento</CardTitle>
              <CardDescription>Preferencias de captura de imagen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="block">Preferir cámara trasera</Label>
                  <p className="text-xs text-muted-foreground">Al capturar desde móvil</p>
                </div>
                <Switch checked={preferBackCamera} onCheckedChange={setPreferBackCamera} />
              </div>

              <div className="space-y-2">
                <Label>Resolución sugerida</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">Automática</SelectItem>
                    <SelectItem value="720p">720p</SelectItem>
                    <SelectItem value="1080p">1080p</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Umbral de confianza (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(Math.max(0, Math.min(100, parseInt(e.target.value || "0"))))}
                />
                <p className="text-xs text-muted-foreground">Debajo de este valor, se pedir� confirmaci�n manual.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notificaciones</CardTitle>
              <CardDescription>Avisos en la aplicación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="block">Habilitar notificaciones</Label>
                  <p className="text-xs text-muted-foreground">Mensajes de éxito y alertas</p>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>
              <Button className="mt-2" onClick={onSaveSettings}>Guardar cambios</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
