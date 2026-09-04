import React, { useState } from 'react';
import { Input, Button } from '@patchdocs/ui';
import { TbEye, TbEyeOff } from 'react-icons/tb';

export default function PasswordWithToggleInput(props: any) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative flex items-center">
      <Input type={showPassword ? 'text' : 'password'} {...props} />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-2 text-[#71717a] hover:text-[#f4f4f5] cursor-pointer"
      >
        {showPassword ? <TbEyeOff className="w-4 h-4" /> : <TbEye className="w-4 h-4" />}
      </button>
    </div>
  );
}
