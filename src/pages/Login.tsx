import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import PlotSureLogo from "@/components/PlotSureLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const roles: { value: UserRole; label: string }[] = [
  { value: "land_buyer", label: "Land Buyer" },
  { value: "land_seller", label: "Land Seller" },
  { value: "admin", label: "Admin" },
];

const Login = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Sign In ◇ PS";
  }, []);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({ name: "", email: "", password: "", confirmPassword: "", role: "" as string });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validateLogin = () => {
    const e: Record<string, string> = {};
    if (!loginForm.email) e.lemail = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(loginForm.email)) e.lemail = "Invalid email";
    if (!loginForm.password) e.lpassword = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateRegister = () => {
    const e: Record<string, string> = {};
    if (!regForm.name.trim()) e.rname = "Name is required";
    if (!regForm.email) e.remail = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(regForm.email)) e.remail = "Invalid email";
    if (!regForm.password) e.rpassword = "Password is required";
    else if (regForm.password.length < 6) e.rpassword = "Min 6 characters";
    if (regForm.password !== regForm.confirmPassword) e.rconfirm = "Passwords don't match";
    if (!regForm.role) e.rrole = "Select a role";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validateLogin()) return;
    setSubmitting(true);
    const { error } = await login(loginForm.email, loginForm.password);
    setSubmitting(false);
    if (error) {
      toast({ title: "Login failed", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Welcome back!", description: "Login successful." });
    navigate("/dashboard");
  };

  const handleRegister = async () => {
    if (!validateRegister()) return;
    setSubmitting(true);
    console.log("[Login] handleRegister called with:", { name: regForm.name, email: regForm.email, role: regForm.role });
    const { error, authenticated } = await register(regForm.name, regForm.email, regForm.password, regForm.role as UserRole);
    console.log("[Login] register result:", { error, authenticated });
    setSubmitting(false);
    if (error) {
      toast({ title: "Registration failed", description: error, variant: "destructive" });
      return;
    }
    if (authenticated) {
      toast({ title: "Account created!", description: "Welcome to PlotSure." });
      navigate("/dashboard");
      return;
    }

    toast({
      title: "Account created!",
      description: "Check your email to confirm your account before logging in.",
    });
  };

  const inputClass = "font-body";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center">
          <div className="cursor-pointer" onClick={() => navigate("/")}>
            <PlotSureLogo />
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-display">Welcome to PlotSure</CardTitle>
            <p className="text-sm text-muted-foreground font-body">Verify land with confidence</p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input className={inputClass} type="email" value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} />
                  {errors.lemail && <p className="text-xs text-destructive mt-1">{errors.lemail}</p>}
                </div>
                <div>
                  <Label>Password</Label>
                  <Input className={inputClass} type="password" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} />
                  {errors.lpassword && <p className="text-xs text-destructive mt-1">{errors.lpassword}</p>}
                </div>
                <Button className="w-full" onClick={handleLogin} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Login
                </Button>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input className={inputClass} value={regForm.name} onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))} />
                  {errors.rname && <p className="text-xs text-destructive mt-1">{errors.rname}</p>}
                </div>
                <div>
                  <Label>Email</Label>
                  <Input className={inputClass} type="email" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} />
                  {errors.remail && <p className="text-xs text-destructive mt-1">{errors.remail}</p>}
                </div>
                <div>
                  <Label>Password</Label>
                  <Input className={inputClass} type="password" value={regForm.password} onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))} />
                  {errors.rpassword && <p className="text-xs text-destructive mt-1">{errors.rpassword}</p>}
                </div>
                <div>
                  <Label>Confirm Password</Label>
                  <Input className={inputClass} type="password" value={regForm.confirmPassword} onChange={e => setRegForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                  {errors.rconfirm && <p className="text-xs text-destructive mt-1">{errors.rconfirm}</p>}
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={regForm.role} onValueChange={v => setRegForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.rrole && <p className="text-xs text-destructive mt-1">{errors.rrole}</p>}
                </div>
                <Button className="w-full" onClick={handleRegister} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Register
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
