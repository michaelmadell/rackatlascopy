import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@patchdocs/ui';

export default function PaymentMethodCard({ customer }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-[#a1a1aa]">
        No payment method on file.
      </CardContent>
    </Card>
  );
}
