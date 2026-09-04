import React from 'react';
import { Button } from '@patchdocs/ui';
import { TbLoader2 } from 'react-icons/tb';

export default function FormSubmitButton({
  isSubmitting,
  label = 'Submit',
  className = '',
  disabled,
}: {
  isSubmitting?: boolean;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="submit"
      disabled={isSubmitting || disabled}
      className={`bg-[#2563eb] text-white hover:bg-[#1d4ed8] ${className}`}
    >
      {isSubmitting && <TbLoader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
      <span>{label}</span>
    </Button>
  );
}
