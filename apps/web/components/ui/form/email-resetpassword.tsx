import * as React from 'react';

interface EmailResetPasswordProps {
  resetPasswordLink: string;
}

export function EmailResetPassword({ resetPasswordLink }: EmailResetPasswordProps) {
  return (
    <div>
      
      <p>Click the link below to reset your password:</p>
      <a href={resetPasswordLink}>Reset Password</a>
    </div>
  );
}