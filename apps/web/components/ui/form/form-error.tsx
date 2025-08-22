import { AlertTriangleIcon } from "lucide-react"



interface FormErrorProps {
    message?: string
}

export function FormError({ message }: FormErrorProps) {
    if (!message) return null
    return (
        <div className="flex gap-x-2 items-center p-3 text-sm rounded-md bg-destructive/15 text-destructive">
            <AlertTriangleIcon className="size-4" />
            {message}
        </div>
    )
}