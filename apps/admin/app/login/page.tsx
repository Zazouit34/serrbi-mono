"use client"
import { useState, useTransition } from "react"
import { signIn, useSession } from "next-auth/react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

export default function AdminLogin() {
  const { data: session } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isPending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="py-16 mx-auto space-y-5 w-full max-w-md">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Admin Login</h1>
        <p className="text-sm text-muted-foreground">
          {session?.user ? `Signed in as ${session.user.email}` : "Enter admin credentials"}
        </p>
      </div>

      <div className="space-y-3">
        <Input placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <Input type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button
          disabled={isPending}
          onClick={() => start(async () => {
            setError(null)
            // Let NextAuth handle redirect
            const res = await signIn("credentials", { email, password, callbackUrl: "/", redirect: true })
            // no manual window.location.href or useEffect redirect
            if ((res as any)?.error) setError("Invalid credentials")
          })}
        >
          Sign in
        </Button>
      </div>
    </div>
  )
}