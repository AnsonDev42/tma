import { useState } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Button } from "@/components/ui/button";
import { Turnstile } from "@marsidev/react-turnstile";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Session } from "@supabase/gotrue-js/src/lib/types";

interface LoginFormProps {
    supabase: any;
    setSession: (session: Session | null) => void;
}

export function LoginForm({ supabase, setSession }: LoginFormProps) {
    const [captchaToken, setCaptchaToken] = useState<string>("");
    const navigate = useNavigate();

    async function handleAnonymousSignIn() {
        try {
            const { data: { session }, error } = await supabase.auth.signInAnonymously({ options: { captchaToken } });
            if (error) throw error;
            toast.success("Signed in anonymously!");
            setSession(session);
            navigate("/home", { replace: true });
        } catch (_error) {
            console.error("Error signing in anonymously.");
            toast.error("Failed to sign in anonymously.");
        }
    }

    return (
        <div className="flex items-center justify-center max-w-full mt-5">
            <div className="flex-col items-center justify-center">
                <Auth
                    supabaseClient={supabase}
                    appearance={{
                        theme: ThemeSupa,
                        variables: {
                            default: {
                                colors: {
                                    brand: "green",
                                    brandAccent: "darkgreen",
                                },
                            },
                        },
                    }}
                    providers={["google", "github"]}
                />
                <h1>
                    <b>***Demo Sign in*** : </b>
                </h1>
                <Button onClick={handleAnonymousSignIn} className="m-3">
                    Sign in anonymously
                </Button>
                <Turnstile
                    siteKey="0x4AAAAAAAaDaYB6f6UNZHsB"
                    onSuccess={(token) => {
                        setCaptchaToken(token);
                    }}
                />
            </div>
        </div>
    );
}