import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, User, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Particles from "react-particles";
import { loadSlim } from "tsparticles-slim";

const AuthPage = () => {
  const { signIn, signInWithUsername, loading } = useAuth();
  
  // Estados para login
  const [loginData, setLoginData] = useState({
    identifier: '', // puede ser username o email
    password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize particles
  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  const particlesLoaded = useCallback(async (container: any) => {
    // Particles loaded callback
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Primero intentar login con username
      const { error } = await signInWithUsername(loginData.identifier, loginData.password);
      
      if (error) {
        // Si falla, intentar con email directo
        const emailResult = await signIn(loginData.identifier, loginData.password);
        if (emailResult.error) {
          setError('Credenciales incorrectas');
          toast.error('Error al iniciar sesión');
        } else {
          toast.success('¡Bienvenido!');
        }
      } else {
        toast.success('¡Bienvenido!');
      }
    } catch (err) {
      setError('Error al iniciar sesión');
      toast.error('Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#013974' }}
    >
      {/* Particles Background */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        loaded={particlesLoaded}
        options={{
          background: {
            color: {
              value: "transparent",
            },
          },
          fpsLimit: 120,
          interactivity: {
            events: {
              onClick: {
                enable: true,
                mode: "push",
              },
              onHover: {
                enable: true,
                mode: "repulse",
              },
              resize: true,
            },
            modes: {
              push: {
                quantity: 4,
              },
              repulse: {
                distance: 200,
                duration: 0.4,
              },
            },
          },
          particles: {
            color: {
              value: "#ffffff",
            },
            links: {
              color: "#ffffff",
              distance: 150,
              enable: true,
              opacity: 0.3,
              width: 1,
            },
            collisions: {
              enable: true,
            },
            move: {
              direction: "none",
              enable: true,
              outModes: {
                default: "bounce",
              },
              random: false,
              speed: 1,
              straight: false,
            },
            number: {
              density: {
                enable: true,
                area: 800,
              },
              value: 80,
            },
            opacity: {
              value: 0.5,
            },
            shape: {
              type: "circle",
            },
            size: {
              value: { min: 1, max: 5 },
            },
          },
          detectRetina: true,
        }}
        className="absolute inset-0 z-0"
      />

      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Floating geometric shapes */}
      <div className="absolute top-20 left-20 w-4 h-4 bg-white/20 rounded-full animate-pulse z-10"></div>
      <div className="absolute top-40 right-32 w-6 h-6 bg-white/15 rounded-full animate-pulse delay-1000 z-10"></div>
      <div className="absolute bottom-32 left-1/4 w-3 h-3 bg-white/25 rounded-full animate-pulse delay-500 z-10"></div>
      <div className="absolute bottom-20 right-20 w-5 h-5 bg-white/20 rounded-full animate-pulse delay-1500 z-10"></div>

      <div className="w-full max-w-md space-y-8 relative z-20">
        {/* Logo and Title Section */}
        <div className="text-center space-y-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
            <div className="relative h-20 w-20 bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto border border-white/20 shadow-2xl group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-500 ease-out cursor-pointer">
              {/* Bubble effects */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden">
                <div className="absolute w-3 h-3 bg-white/40 rounded-full animate-ping top-2 left-2"></div>
                <div className="absolute w-2 h-2 bg-white/50 rounded-full animate-ping delay-150 top-4 right-3"></div>
                <div className="absolute w-1 h-1 bg-white/60 rounded-full animate-ping delay-300 bottom-3 left-4"></div>
                <div className="absolute w-2 h-2 bg-white/40 rounded-full animate-ping delay-500 bottom-2 right-2"></div>
              </div>
              
              {/* Ripple effect */}
              <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-300"></div>
              
              <img 
                src="/lovable-uploads/asociados-ultraval.png" 
                alt="UltraVal Logo" 
                className="h-12 w-12 object-contain relative z-10 group-hover:brightness-110 transition-all duration-300"
              />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">
              ULTRAVAL Secure Desk
            </h1>
            <p className="text-white/80 text-lg drop-shadow-md">
              Accede de forma segura a tu cuenta
            </p>
          </div>
        </div>

        {/* Main Card with Glassmorphism */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <Card className="relative bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
            
            <div className="w-full relative z-10">
              <CardHeader className="text-center pb-6">
                <CardTitle className="flex items-center justify-center gap-3 text-2xl text-white">
                  <User className="h-6 w-6" />
                  Iniciar Sesión
                </CardTitle>
                <CardDescription className="text-white/70 text-base">
                  Ingresa con tu usuario o email y contraseña
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="identifier" className="text-white/90 font-medium">
                      Usuario o Email
                    </Label>
                    <Input
                      id="identifier"
                      type="text"
                      placeholder="Tu usuario o email"
                      value={loginData.identifier}
                      onChange={(e) => setLoginData(prev => ({ ...prev, identifier: e.target.value }))}
                      className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/40 rounded-xl h-12 transition-all duration-300"
                      required
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="login-password" className="text-white/90 font-medium">
                      Contraseña
                    </Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Tu contraseña"
                        maxLength={15}
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/40 rounded-xl h-12 pr-12 transition-all duration-300"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-white/10 text-white/70 hover:text-white rounded-xl"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <Alert className="bg-red-500/20 border-red-400/30 backdrop-blur-sm rounded-xl">
                      <AlertCircle className="h-4 w-4 text-red-300" />
                      <AlertDescription className="text-red-100">{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-white/20 to-white/10 hover:from-white/30 hover:to-white/20 text-white border border-white/20 rounded-xl font-medium transition-all duration-300 backdrop-blur-sm shadow-lg" 
                    disabled={isLoading || loading}
                  >
                    {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </Button>
                </form>
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;