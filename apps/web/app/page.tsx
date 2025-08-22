import { getCurrentUser } from "@/server/services/current-user"
import { Button } from "@workspace/ui/components/button"
import { logout } from "@/lib/actions/auth"


import Image from "next/image"



export default async function Page() {
  
  const dbUser = await getCurrentUser()
  

  
  return (
    <main className="flex relative flex-col mx-auto">
      {dbUser ? (
        <>
          <h1>Hello {dbUser.name}</h1>
          {/*<Image src={dbUser.image || "/images/default-avatar.png"} alt={dbUser.name || "No name"} width={100} height={100} />*/}
          <p>{dbUser.email}</p>
          <p>{dbUser.phone}</p>
          <Button onClick={logout}>Logout</Button>
          
        </>
      ) : (
        <h1>no user</h1>
      )}
    </main>
  )
}
