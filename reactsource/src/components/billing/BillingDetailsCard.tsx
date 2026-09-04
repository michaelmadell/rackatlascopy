import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@patchdocs/ui';

export default function BillingDetailsCard({ customer }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing Details</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-[#a1a1aa]">
        Organization billing information
      </CardContent>
    </Card>
  );
}
