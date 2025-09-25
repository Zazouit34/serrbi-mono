import type { NextMiddleware } from "next/server"

const middleware: NextMiddleware = () => {
  // Temporarily disabled to avoid Edge runtime issues blocking API calls
  return null
}

export default middleware

export const config = {
  matcher: [],
}