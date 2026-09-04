import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@patchdocs/ui';

export default function SystemIntegratorCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Integrator Partnership</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-[#a1a1aa]">
        Partner tier status
      </CardContent>
    </Card>
  );
}
