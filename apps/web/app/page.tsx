"use client"

import { useCurrentUser } from "@/hooks/use-current-user"



export default function Page() {
  
const currentUser = useCurrentUser()
  

  
  return (
    <main className="flex relative flex-col mx-auto">
      <h1>
        {currentUser.user?.name}
        <br />
        {currentUser.user?.email}
        <br />
        {currentUser.user?.role}
        <br />
        {currentUser.user?.image}
        <br />
        {currentUser.user?.phone}
        <br />
      </h1>
    </main>
  )
}
