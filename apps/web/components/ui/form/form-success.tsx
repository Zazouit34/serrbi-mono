import { CheckCircleIcon } from "lucide-react"



interface FormSuccessProps {
    message?: string
}

export function FormSuccess({ message }: FormSuccessProps) {
    if (!message) return null
    return (
        <div className="flex gap-x-2 items-center p-3 text-sm text-emerald-500 rounded-md bg-emerald-500/15">
            <CheckCircleIcon className="size-4" />
            {message}
        </div>
    )
}