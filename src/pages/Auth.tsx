import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";
import { logError } from "@/lib/errorLogger";
import { authSchema } from "@/lib/validationSchemas";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        navigate("/");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: validation.data.email,
          password: validation.data.password,
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Logged in successfully!",
        });
      } else {
        const { error } = await supabase.auth.signUp({
          email: validation.data.email,
          password: validation.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Account created successfully! You can now login.",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      logError("Auth", error);
      toast({
        title: "Error",
        description: "Unable to complete authentication. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (session) {
    return null;
  }

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="aurora-field" />
        <div className="grain absolute inset-0" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand lockup */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-5 flex h-14 w-14 items-center justify-center overflow-hidden rounded-[calc(var(--radius)-2px)] bg-gradient-to-br from-primary via-primary to-primary-2 shadow-glow">
            <span className="font-display text-3xl font-bold leading-none text-primary-foreground">
              0
            </span>
          </div>
          <h1 className="font-display text-5xl font-bold tracking-tight">Task Zero</h1>
          <p className="mt-3 max-w-xs font-mono text-xs uppercase leading-relaxed tracking-widest text-muted-foreground/70">
            Every task, project and note — one workspace
          </p>
        </div>

        <div className="glass relative rounded-[var(--radius)] p-px">
          {/* Animated gradient hairline around the card */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-[calc(var(--radius)+1px)] bg-gradient-to-br from-primary/60 via-primary-2/40 to-transparent opacity-70"
          />
          <Card className="relative border-0 bg-background/80 shadow-none backdrop-blur-2xl">
            <CardHeader className="space-y-1.5">
              <CardTitle className="font-display text-2xl font-bold tracking-tight">
                {isLogin ? "Welcome back" : "Create an account"}
              </CardTitle>
              <CardDescription>
                {isLogin
                  ? "Enter your credentials to access your workspace"
                  : "Enter your email and password to get started"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full rounded-[var(--radius)] bg-gradient-to-r from-primary to-primary-2 font-semibold shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99]"
                  disabled={loading}
                >
                  {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
                </Button>
              </form>
              <div className="mt-6 text-center text-sm">
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40">
          Built for focused work
        </p>
      </div>
    </div>
  );
}
