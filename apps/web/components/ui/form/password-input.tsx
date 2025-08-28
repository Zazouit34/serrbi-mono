'use client'

import * as React from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { Input, type InputProps } from '@workspace/ui/components/input'
import { cn } from '@workspace/ui/lib/utils'

const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
	const [showPassword, setShowPassword] = React.useState(false)
	const disabled = props.disabled

	return (
		<div className="relative">
			<Input
				type={showPassword ? 'text' : 'password'}
				className={cn('pr-10 hide-password-toggle', className)}
				ref={ref}
				{...props}
			/>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="absolute top-0 right-0 px-3 py-2 h-full hover:bg-transparent"
				onClick={() => setShowPassword((prev) => !prev)}
				disabled={disabled}
			>
				{showPassword && !disabled ? (
					<EyeIcon className="w-4 h-4" aria-hidden="true" />
				) : (
					<EyeOffIcon className="w-4 h-4" aria-hidden="true" />
				)}
				<span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
			</Button>

			{/* hides browsers password toggles */}
			<style>{`
					.hide-password-toggle::-ms-reveal,
					.hide-password-toggle::-ms-clear {
						visibility: hidden;
						pointer-events: none;
						display: none;
					}
				`}</style>
		</div>
	)
})
PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }